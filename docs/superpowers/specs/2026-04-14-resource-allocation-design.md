# Resource Allocation — Design Spec

**Date:** 2026-04-14
**Status:** Approved

---

## Overview

A full resource management module for the ProjectHub workspace. Covers:

1. **Capacity planning** — available working days per member per month, sliced per cycle
2. **Workload view** — workspace-wide and per-project assignment visibility
3. **Effort tracking** — planned (issue `estimate_days`) + actual hours logging (time entries)
4. **Cost rollup** — daily rate per member per project; labor costs auto-sync to `PortfolioCostEntry` via async Celery task

---

## Data Model

New Django app: `apps/resources/`. All models use `managed = True`.

### `ResourceProfile`

Links a `WorkspaceMember` to a `Project` with a negotiated daily rate.

```
ResourceProfile
  id               UUID PK
  project          FK → projects.Project (CASCADE)
  member           FK → workspaces.WorkspaceMember (CASCADE)
  daily_rate_brl   DecimalField(10, 2)   # R$ per working day
  created_at       DateTimeField(auto_now_add)
  updated_at       DateTimeField(auto_now)
  unique_together: (project, member)
  db_table: resource_profiles
```

- Only `ProjectMember` records can have a profile (enforced in serializer).
- If no `ResourceProfile` exists for a member on a project, cost calculations are skipped for that member.

---

### `MemberCapacity`

Defines how many working days a member has available in a given calendar month.

```
MemberCapacity
  id               UUID PK
  member           FK → workspaces.WorkspaceMember (CASCADE)
  year             IntegerField
  month            IntegerField (1–12)
  available_days   DecimalField(5, 1)   # e.g. 20.0, 15.5
  note             TextField (blank, null)   # vacations, leave, etc.
  unique_together: (member, year, month)
  db_table: member_capacities
```

**Cycle capacity derivation** (no extra table):
```
cycle_available = available_days × (cycle_working_days / month_working_days)
```
`cycle_working_days` and `month_working_days` are computed from calendar dates (Mon–Fri, no holiday engine in v1).

---

### `TimeEntry`

Actual hours logged by a member against an issue. Immutable once created — corrections are made by logging a new entry (positive or negative hours), consistent with standard accounting practice.

```
TimeEntry
  id               UUID PK
  issue            FK → issues.Issue (CASCADE)
  member           FK → workspaces.WorkspaceMember (PROTECT)
  date             DateField
  hours            DecimalField(5, 2)   # can be negative (correction)
  description      TextField (blank, null)
  created_at       DateTimeField(auto_now_add)
  db_table: time_entries
```

---

## Backend / API

### URL structure

All endpoints under `/api/v1/resources/`.

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET, POST | `/resources/profiles/` | IsProjectAdmin | List/create ResourceProfiles |
| GET, PATCH, DELETE | `/resources/profiles/{id}/` | IsProjectAdmin | Detail |
| GET, POST | `/resources/capacity/` | IsProjectAdmin | List/create MemberCapacity |
| GET, PATCH, DELETE | `/resources/capacity/{id}/` | IsProjectAdmin | Detail |
| GET, POST | `/resources/time-entries/` | IsWorkspaceMember | List/create TimeEntries |
| DELETE | `/resources/time-entries/{id}/` | Owner or IsProjectAdmin | Delete |
| GET | `/resources/workload/` | IsWorkspaceMember | Workspace-wide workload |
| GET | `/resources/projects/{project_id}/workload/` | IsWorkspaceMember | Per-project workload |

### Workload computation

Computed on-demand (no stored aggregate). The `workload/` view accepts:
- `period=YYYY-MM` — monthly view
- `cycle_id=<uuid>` — cycle view (capacity sliced from monthly)

Per member the response includes:
```json
{
  "member": { "id": "...", "name": "...", "avatarUrl": "..." },
  "available_days": 20.0,
  "planned_days": 14.5,
  "actual_days": 10.0,
  "utilization_pct": 72.5,
  "daily_rate_brl": "350.00",
  "planned_cost": 5075.00,
  "actual_cost": 3500.00
}
```

- `planned_days` = sum of `estimate_days` for issues assigned to member where:
  - **Monthly view:** `due_date` falls within the month, OR issue has no `due_date` and is not completed (floating load)
  - **Cycle view:** issue appears in `CycleIssue` for that cycle and is assigned to the member
- `actual_days` = sum of `TimeEntry.hours / 8` for member where `date` falls within the period
- `utilization_pct` = `actual_days / available_days × 100` (0 if no `MemberCapacity` defined)

### Cost sync to Portfolio

**Signal:** `TimeEntry` post_save / post_delete → calls `sync_labor_costs.apply_async(args=[project_id, year, month], countdown=30)`.

**Task `sync_labor_costs`** (queue: `default`):
1. Fetch all `TimeEntry` rows for `(project, year, month)`
2. Group by member; for each member fetch their `ResourceProfile.daily_rate_brl`
3. `total_cost = sum(entry.hours / 8 × daily_rate for each member)`
4. Find the `PortfolioProject` for this project (if any)
5. Upsert `PortfolioCostEntry`:
   - `category = labor`
   - `amount = total_cost`
   - `date = last day of month`
   - `description = "Auto: mão de obra YYYY-MM"`
6. If no `PortfolioProject` exists, task exits silently

The 30s countdown debounces bursts of entries (e.g., bulk import). If the task fires again before the first completes, the upsert is idempotent.

### Permissions

- `IsWorkspaceMember` — read workload, create own time entries
- `IsProjectAdmin` — create/edit `ResourceProfile`, `MemberCapacity`, time entries for others
- Workspace admin bypasses all project-level checks (existing convention)

---

## Frontend

### Routes

| Path | Component | Nav location |
|------|-----------|--------------|
| `/workspace/resources` | `ResourcesPage` | Workspace sidebar |
| `/projects/:projectId/resources` | `ProjectResourcesPage` | Project tab nav |

### `ResourcesPage` (workspace-wide)

- Period picker: month selector tab + cycle selector tab
- Member grid: one row per workspace member
  - Avatar, name
  - Capacity bar: `planned_days / available_days` (fill colour: green < 80%, amber 80–100%, red > 100%)
  - Utilization % badge
  - Actual days logged
- Clicking a row expands to show that member's assigned issues across all projects for the period

### `ProjectResourcesPage`

Two tabs:

**Workload tab**
- Member grid scoped to `ProjectMember` list
- "+ Define rate" per member → inline form for `ResourceProfile` daily rate
- Capacity cell editable inline → `MemberCapacity` form for selected month

**Time entries tab**
- Table: date, member, issue (linked to issue detail), hours, description, delete button
- "+ Log time" button → modal: issue search, date picker, hours input, optional description
- Filters: member select, date range

### Services & hooks

New files following existing patterns:

- `frontend/src/services/resource.service.ts`
  - `listProfiles(projectId)`, `createProfile(data)`, `updateProfile(id, data)`, `deleteProfile(id)`
  - `listCapacity(filters)`, `upsertCapacity(data)`, `deleteCapacity(id)`
  - `listTimeEntries(filters)`, `createTimeEntry(data)`, `deleteTimeEntry(id)`
  - `getWorkload(params)`, `getProjectWorkload(projectId, params)`

- `frontend/src/hooks/useResources.ts`
  - TanStack Query hooks wrapping the above; invalidates `['workload']` on time entry mutations

---

## Out of scope (v1)

- Holiday calendar integration (working days are Mon–Fri only)
- Multi-assignee issues (issues remain single-assignee)
- Timesheet approval workflow
- Exporting time entries to CSV/PDF
- Notifications for overallocation

---

## Integration points

| System | Integration |
|--------|-------------|
| CPM | `estimate_days` on `Issue` is the source for `planned_days`; no new fields needed |
| Cycles | Cycle dates used to derive `cycle_available` from `MemberCapacity` |
| Portfolio | `sync_labor_costs` Celery task upserts `PortfolioCostEntry(category=labor)` |
| ProjectMember | `ResourceProfile` requires a matching `ProjectMember` to exist |
