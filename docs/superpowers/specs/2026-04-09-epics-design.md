# Epics Implementation Design

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-class epic support to ProjectHub — epics as a parent-level issue type that groups related issues, with a dedicated Epics page, backlog grouping, and colored epic badges throughout the UI.

**Architecture:** Epics are issues with `type='epic'`, reusing the existing `issues` table. A `color` column is added for badge styling. Child issues reference their epic via the existing `epic_id` FK. Dedicated read endpoints aggregate progress counts; write endpoints make `epic_id` and `color` writable.

**Tech Stack:** Django 5.1 + DRF (backend), React 18 + TypeScript + TanStack Query + Tailwind (frontend)

---

## Section 1: Data Model & Backend

### 1.1 Database

One schema change is required. Add `color VARCHAR(7) DEFAULT NULL` to the `issues` table in `scripts/db/init.sql`. This column is only populated when `type = 'epic'` and stores a hex color string (e.g. `#6366f1`).

```sql
ALTER TABLE issues ADD COLUMN color VARCHAR(7) DEFAULT NULL;
```

No other schema changes — `epic_id UUID REFERENCES issues(id)` and `type VARCHAR(20) CHECK (type IN ('task','bug','story','epic','subtask'))` already exist.

### 1.2 Model

`apps/issues/models.py` — `Issue` model already has `epic_id` and `type` fields. No model changes required beyond verifying the fields are present.

### 1.3 Serializer changes (`apps/issues/serializers.py`)

**`IssueSerializer`:**
- Add `color` to serializer fields (writable)
- Remove `epic` from `read_only_fields` — make it writable
- Add `validate` method with two rules:
  1. If `type == 'epic'`, `epic_id` must be `None` (epics cannot belong to other epics)
  2. If `parent_id` is set (subtask), `epic_id` must be `None`

**`EpicSerializer`** (new, for list endpoint):
```python
fields = ['id', 'sequence_id', 'title', 'color', 'state', 'assignee',
          'start_date', 'due_date', 'child_count', 'completed_count',
          'created_at']
```
`child_count` and `completed_count` are annotated in the queryset — not model fields.

### 1.4 New endpoints

Add to `apps/issues/urls.py`:

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/v1/projects/{projectId}/epics/` | List all epics in project, ordered by `created_at`. Annotated with `child_count` (total linked issues) and `completed_count` (linked issues whose state `is_completed=True`). |
| `GET` | `/api/v1/issues/{epicId}/issues/` | List all child issues for a given epic. Returns standard `IssueSerializer`. |

Existing `POST /api/v1/issues/` and `PATCH /api/v1/issues/{id}/` gain `epic_id` and `color` as writable fields (no new endpoints needed for write operations).

### 1.5 Permissions

Same as existing issue permissions — `IsProjectMember` for read, `IsProjectMember` for write. No special epic-level permissions.

---

## Section 2: Frontend

### 2.1 TypeScript types (`frontend/src/types/issue.ts`)

- Add `color: string | null` to `Issue` interface
- Add `childCount: number` and `completedCount: number` to `Issue` interface (populated for epics from the list endpoint)
- Add `epicId?: string | null` and `color?: string | null` to `UpdateIssueDto`
- Add `EpicSummary` interface (subset used for badge rendering):
  ```typescript
  export interface EpicSummary {
    id: string
    title: string
    color: string | null
    sequenceId: number
  }
  ```

### 2.2 Service & hooks

**`frontend/src/services/issue.service.ts`:**
- Add `getEpics(projectId: string): Promise<Issue[]>` — `GET /projects/{projectId}/epics/`
- Add `getEpicIssues(epicId: string): Promise<Issue[]>` — `GET /issues/{epicId}/issues/`

**`frontend/src/hooks/useIssues.ts`:**
- Add `useEpics(projectId: string)` — TanStack Query wrapper for `getEpics`
- Add `useEpicIssues(epicId: string)` — TanStack Query wrapper for `getEpicIssues`
- `useCreateIssue` and `useUpdateIssue` already pass through arbitrary fields; no changes needed there beyond the type update

### 2.3 New components

**`frontend/src/features/issues/EpicBadge.tsx`**
A small inline pill used wherever an issue is rendered:
```tsx
<span style={{ backgroundColor: color + '22', color }}>
  ● {title}
</span>
```
Props: `epic: EpicSummary | null`. Renders nothing if `epic` is null.

**`frontend/src/features/epics/EpicsPage.tsx`**
Main epics list view. Shows a card per epic with:
- Left color strip (4px wide, `epic.color`)
- Title + sequence ID
- Assignee avatar
- State badge
- Progress bar: `completed_count / child_count` issues, e.g. "3 de 8 concluídas"
- Due date (if set)
- "Nova épico" button — opens `IssueForm` pre-set to `type='epic'` with color picker shown

**`frontend/src/features/epics/EpicDetail.tsx`**
Rendered inline below the epic card (expand/collapse) or as a panel. Shows child issues grouped by state — same row layout as `BacklogPage`. Includes an inline "Adicionar issue" row that creates an issue pre-linked to this epic.

**`frontend/src/features/epics/EpicColorPicker.tsx`**
A row of 10 color swatches (same palette used in Roadmap/OKR) for picking epic color. Used inside `IssueForm` when `type === 'epic'`.

### 2.4 Modified components

**`frontend/src/components/layout/ProjectNav.tsx`**
Add "Épicos" tab (icon: `Layers`) between Backlog and Gantt.

**`frontend/src/App.tsx`**
Add route `/projects/:projectId/epics` → `<EpicsPage />`.

**`frontend/src/features/backlog/BacklogPage.tsx`**
- Add toggle button in toolbar: `por estado` / `por épico`
- In epic grouping mode: fetch epics with `useEpics(projectId)`, group issues by `epicId`. Issues with `epicId = null` go into a "Sem épico" section with a grey header.
- Each epic group header shows: color dot, epic title, `X de Y` progress text.
- Toggle state is component-local (`useState`), not persisted.

**`frontend/src/features/board/BoardPage.tsx`**
Add `EpicBadge` to each kanban card. Requires the issue list to include `epicId` + the epic's `title` and `color`. The issue serializer should return a nested `epic` object with `{id, title, color, sequenceId}` — add this to `IssueSerializer` as a nested read-only field.

**`frontend/src/features/issues/IssueForm.tsx`**
- Add epic selector: a searchable dropdown filtered to epics in the same project (hidden when `type === 'epic'`)
- Add color picker (`EpicColorPicker`) shown only when `type === 'epic'`

**`frontend/src/features/issues/IssueDetailPage.tsx`**
- Add epic field to sidebar metadata section, showing `EpicBadge` (clickable — navigates to Epics page)
- Allow changing the epic via the same selector as `IssueForm`

### 2.5 File structure summary

```
frontend/src/features/epics/
  EpicsPage.tsx          (new)
  EpicDetail.tsx         (new)
  EpicColorPicker.tsx    (new)

frontend/src/features/issues/
  EpicBadge.tsx          (new)
  IssueForm.tsx          (modified — epic selector + color picker)
  IssueDetailPage.tsx    (modified — epic sidebar field)

frontend/src/features/backlog/
  BacklogPage.tsx         (modified — epic grouping toggle)

frontend/src/features/board/
  BoardPage.tsx           (modified — EpicBadge on cards)

frontend/src/components/layout/
  ProjectNav.tsx          (modified — Épicos tab)

frontend/src/
  App.tsx                 (modified — /epics route)
  types/issue.ts          (modified — color, childCount, EpicSummary)
  services/issue.service.ts (modified — getEpics, getEpicIssues)
  hooks/useIssues.ts      (modified — useEpics, useEpicIssues)
```

---

## Section 3: Constraints & edge cases

- **Epic deleted:** Child issues keep their `epic_id` FK (SET NULL on delete — add `on_delete=models.SET_NULL` to the `epic` FK on the Issue model if not already set)
- **Issue type change:** If an issue is changed from `epic` to another type, `color` is cleared. If it has children, those children retain their `epic_id` pointing to a non-epic — the backend should validate and reject type changes on issues that have children linked via `epic_id`
- **CPM integration:** Epics can participate in CPM relations (they are issues), but `estimate_days` on an epic is independent of its children — epics are a grouping mechanism, not a rolled-up schedule node
- **Notifications:** No new notification types for epics in this phase
- **Board columns:** Epics do not appear on the Kanban board (filtered out by type in `BoardPage`)

---

## Out of scope (this phase)

- Epic timeline / Gantt view of epics
- Epic-level burndown chart
- Nested epics (epics within epics)
- Bulk assign issues to epic
- Epic templates
