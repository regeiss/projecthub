# Sprint Planning Capacity - Design Spec

**Date:** 2026-04-23
**Status:** Approved

---

## Overview

Add a cycle-level sprint planning board that lets project teams plan work by member before applying changes to live issues.

This feature must support:

1. Planning with both `estimate_days` and story points
2. Separate planning assignments that do not immediately change issue assignee
3. Member capacity derived from existing monthly capacity, prorated to the cycle dates
4. Per-sprint capacity overrides
5. An explicit apply flow that writes approved planning changes into real issue data

The planning board lives inside the cycle workflow. It uses the existing cycle, project member, issue, and resource-capacity foundations rather than mixing planning state into normal issue fields.

---

## Product goals

- Give teams a real sprint-planning workspace instead of planning directly on live issue assignments
- Show member-by-member capacity against planned days while also tracking story point totals
- Preserve draft planning state until a user explicitly applies the plan
- Keep the first version narrow enough to implement safely in the current codebase

---

## Key decisions

### Planning metrics

The board tracks both:

- `planned_days`
- `planned_story_points`

For v1, capacity is enforced against days only. Story points are displayed and totaled, but there is no automatic conversion between points and days.

This avoids inventing a points-per-day rule too early while still supporting both planning models.

### Planning assignments stay separate

Planning assignments are not the same as issue assignee. The board stores its own planned member allocation and only updates real issue assignees during the explicit apply step.

### Capacity defaults

Sprint capacity defaults from the existing monthly `MemberCapacity` records. The system prorates available days from the cycle date range and allows a sprint-specific override per member.

### Apply is explicit

The board supports an explicit "Apply plan" action. Until that happens, planning data remains draft-only.

---

## Data model

This can live in `apps/cycles` or a small adjacent planning module, but the ownership stays cycle-centric.

### `SprintPlan`

One planning session per cycle.

```
SprintPlan
  id                UUID PK
  cycle             OneToOneField -> cycles.Cycle
  status            CharField('draft', 'applied')
  applied_at        DateTimeField(null=True, blank=True)
  applied_by        FK -> workspaces.WorkspaceMember (null=True, blank=True, PROTECT)
  created_by        FK -> workspaces.WorkspaceMember (PROTECT)
  created_at        DateTimeField(auto_now_add=True)
  updated_at        DateTimeField(auto_now=True)
```

Notes:
- v1 supports a single active plan per cycle
- applied plans remain viewable for audit/reference

### `SprintPlanMemberCapacity`

Per-member capacity snapshot and override for the sprint.

```
SprintPlanMemberCapacity
  id                UUID PK
  plan              FK -> SprintPlan (CASCADE, related_name='member_capacities')
  member            FK -> workspaces.WorkspaceMember (CASCADE)
  default_days      DecimalField(5, 1)
  override_days     DecimalField(5, 1, null=True, blank=True)
  note              TextField(blank=True, null=True)
  created_at        DateTimeField(auto_now_add=True)
  updated_at        DateTimeField(auto_now=True)
  unique_together: (plan, member)
```

Derived value:
- `available_days = override_days if set else default_days`

### `SprintPlanAllocation`

One planned issue placement on the board.

```
SprintPlanAllocation
  id                   UUID PK
  plan                 FK -> SprintPlan (CASCADE, related_name='allocations')
  issue                FK -> issues.Issue (CASCADE)
  planned_member       FK -> workspaces.WorkspaceMember (null=True, blank=True, PROTECT)
  planned_days         DecimalField(6, 2, null=True, blank=True)
  planned_story_points IntegerField(null=True, blank=True)
  rank                 IntegerField(default=0)
  note                 TextField(blank=True, null=True)
  created_at           DateTimeField(auto_now_add=True)
  updated_at           DateTimeField(auto_now=True)
  unique_together: (plan, issue)
```

Notes:
- `planned_member = null` supports an unassigned/planned-later lane
- `rank` preserves ordering within a member column or backlog lane

---

## Capacity derivation

The system already stores monthly member capacity. Sprint planning uses that as the source.

For each member in the project:

1. Find `MemberCapacity` for the cycle's year/month
2. Compute working days in the month (Mon-Fri only in v1)
3. Compute working days in the cycle date range
4. Derive:

```
default_sprint_days = monthly_available_days * (cycle_working_days / month_working_days)
```

Constraints:
- v1 assumes the cycle stays within one calendar month
- if no monthly capacity exists, the default sprint capacity is null/empty and the board highlights that state
- users can override sprint capacity without changing the monthly base record

If multi-month cycles become important later, the derivation can be extended across months, but that is out of scope for v1.

---

## Backend / API

### Endpoints

All endpoints should follow the existing nested project/cycle patterns.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET, POST | `/projects/{project_id}/cycles/{cycle_id}/plan/` | Get or create the sprint plan for the cycle |
| GET, PATCH | `/projects/{project_id}/cycles/{cycle_id}/plan/member-capacities/` | List and bulk update sprint member capacities |
| GET, POST | `/projects/{project_id}/cycles/{cycle_id}/plan/allocations/` | List and create allocations |
| PATCH, DELETE | `/projects/{project_id}/cycles/{cycle_id}/plan/allocations/{id}/` | Update/delete a single allocation |
| POST | `/projects/{project_id}/cycles/{cycle_id}/plan/apply/` | Apply the current plan transactionally |

### Apply flow

Apply must be transactional.

For each allocation in the plan:

1. Ensure the issue belongs to the cycle
   - create `CycleIssue` if missing
2. If `planned_member` is set, update the issue assignee
3. If `planned_days` is present, update the issue `estimate_days`
4. If `planned_story_points` is present, update the issue story point field
5. Mark the plan as applied with `applied_at` and `applied_by`

Behavior rules:
- apply only writes the fields represented by the plan
- repeated apply calls should remain safe and deterministic
- permissions should match project planning authority, likely project admin

### Candidate issues for the board

The board needs a queryable set of issues available for planning. In v1 this can come from the existing issue list endpoint with filters such as:

- project
- cycle membership
- assignee
- labels
- epic/module
- priority

No separate issue-copy model is introduced.

---

## Frontend

### Location

The planning board belongs in the cycle detail workflow as a dedicated planning view inside the cycle page.

Suggested shape:

- cycle detail header
- tabs or segmented sections:
  - summary
  - planning
  - issues

This keeps planning anchored to the cycle rather than scattering it into the general resources page.

### Board layout

Top summary strip:

- cycle dates
- total planned days vs total available days
- total planned story points
- number of overloaded members
- unapplied changes indicator

Main board:

- backlog column for issues available to plan
- one column per project member
- optional unassigned/planned-later lane

Card content:

- issue title
- current assignee
- `estimate_days`
- story points
- planning badges when changed from live values

Column header content:

- member avatar/name
- available sprint days
- planned sprint days
- planned story points
- utilization/over-capacity indicator

### Interactions

- drag issue from backlog to member column
- reorder within a member column
- move issue back to backlog or unassigned
- edit planned days inline
- edit planned story points inline
- edit sprint capacity override for a member
- preview apply result before commit

Planning changes persist to the sprint-plan records, not just local UI state.

### Components

Likely frontend components:

- `CyclePlanningBoard`
- `PlanningSummary`
- `PlanningMemberColumn`
- `PlanningIssueCard`
- `SprintCapacityEditor`
- `ApplyPlanModal`

Hooks/services follow the repo's existing React Query + service mapper conventions.

---

## Visual states and feedback

### Capacity feedback

- green: comfortably within capacity
- amber: near capacity
- red: over capacity

Over-capacity is calculated from planned days vs available days. Story points are shown as totals only.

### Draft/apply feedback

- draft badge on the plan while unapplied
- confirmation modal before apply
- apply summary includes:
  - issues added to cycle
  - issue assignees to change
  - issue estimates to update

### Missing data states

- no monthly capacity configured for member
- member has zero available sprint days
- no issues available to plan
- no plan exists yet for cycle

---

## Permissions

Suggested v1 permission model:

- any project member may view the board
- only project admin (or workspace admin) may mutate plan data or apply the plan

This follows the existing project-level permission conventions and avoids introducing a new planning role in v1.

---

## Testing

### Backend

- sprint plan creation for a cycle
- prorated default capacity calculation
- sprint capacity override update
- allocation CRUD
- apply-plan transaction updates cycle membership and issue fields correctly
- repeated apply remains deterministic
- permission checks

### Frontend

- planning board renders existing allocations
- member totals update after allocation change
- capacity override updates summary state
- apply preview shows expected changes
- explicit apply triggers backend mutation
- planning assignment remains separate from live assignee until apply

---

## Out of scope (v1)

- multiple alternate plans per cycle
- scenario comparison
- automatic points-to-days conversion
- holiday calendar support
- cross-cycle planning
- collaborative real-time planning presence
- multi-month sprint capacity splitting

---

## Open implementation notes

- Confirm the issue story points field name in the current backend/frontend types before implementation
- If cycles can cross month boundaries today, either constrain v1 or extend the prorating logic
- Reuse existing issue and resource services where possible, but keep sprint-plan persistence separate from workload data

