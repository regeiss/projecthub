# Epics Implementation Design

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-class epic support to ProjectHub — epics as a parent-level issue type that groups related issues, with a dedicated Epics page, backlog grouping, and colored epic badges throughout the UI.

**Architecture:** Epics are issues with `type='epic'`, reusing the existing `issues` table. A `color` field is added via Django migration. Child issues reference their epic via the existing `epic_id` FK. Dedicated read endpoints aggregate progress counts; write endpoints make `epic_id` and `color` writable.

**Tech Stack:** Django 5.1 + DRF (backend), React 18 + TypeScript + TanStack Query + Tailwind (frontend)

---

## Section 1: Data Model & Backend

### 1.1 Database & model migration

The `Issue` model is `managed=True`, so the `color` field is added via a standard Django migration:

```python
# apps/issues/migrations/XXXX_add_color_to_issue.py
migrations.AddField(
    model_name='issue',
    name='color',
    field=models.CharField(max_length=7, null=True, blank=True),
)
```

Also add the column to `scripts/db/init.sql` so fresh installs pick it up (the Django migration handles existing deployments):

```sql
color VARCHAR(7) DEFAULT NULL,
```

No other schema changes — `epic_id UUID REFERENCES issues(id)` and `type VARCHAR(20) CHECK (type IN ('task','bug','story','epic','subtask'))` already exist.

### 1.2 Serializers (`apps/issues/serializers.py`)

**New `EpicSummarySerializer`** — slim serializer used as the nested `epic` field on `IssueSerializer` (for badge rendering on board/backlog). Contains exactly:
```python
fields = ['id', 'sequence_id', 'title', 'color']
```

**`EpicSerializer`** — full serializer used by the epics list endpoint:
```python
fields = ['id', 'sequence_id', 'title', 'color', 'state', 'assignee',
          'start_date', 'due_date', 'child_count', 'completed_count', 'created_at']
```
`child_count` and `completed_count` are `SerializerMethodField` values derived from queryset annotations (`Count` + conditional `Count`).

**`IssueSerializer` changes:**
- Add `color = serializers.CharField(max_length=7, allow_null=True, required=False)` as a writable field
- Add `epic = EpicSummarySerializer(read_only=True)` as a nested read-only representation (mirrors the existing pattern: `labels` is the read-only nested field, `label_ids` is the writable counterpart)
- Add `epic_id = PrimaryKeyRelatedField(write_only=True, allow_null=True, required=False, queryset=Issue.objects.filter(type='epic'), source='epic')` as the writable counterpart — the `queryset` filter on `type='epic'` provides a first line of defense against assigning a non-epic as an epic
- Remove `epic` / `epic_id` from any existing `read_only_fields` entries
- Add `validate` method enforcing:
  1. If `type == 'epic'`: `epic_id` must be `None`
  2. If `parent_id` is set: `epic_id` must be `None`
  3. If `epic_id` is provided: the referenced epic must belong to the same project as the issue (cross-project assignment rejected with 400)
  4. If `type` is being changed **to** `'epic'` and the instance already has `epic_id` set: reject with 400 (do not auto-strip)
  5. If `type` is being changed **from** `'epic'` and the instance has issues linked via `epic_id`: reject with 400 (cannot demote an epic that has children; user must reassign children first)
- Add `color` validation: if provided and non-null, must match `^#[0-9A-Fa-f]{6}$`; return 400 otherwise

### 1.3 New endpoints

**Owned by the `issues` app** (`apps/issues/views.py` + `apps/issues/urls.py`):

| Method | URL | Permission | Description |
|--------|-----|------------|-------------|
| `GET` | `/api/v1/projects/{projectId}/epics/` | `IsProjectViewer` | List all issues with `type='epic'` in the project, ordered by `created_at`. Annotated with `child_count` (total linked issues) and `completed_count` (linked issues whose state `is_completed=True`). Uses `EpicSerializer`. |
| `GET` | `/api/v1/issues/{epicId}/epic-issues/` | `IsProjectViewer` | List all child issues for a given epic (issues where `epic_id=epicId`). Unpaginated — returns all children in a single response (maximum 500 children enforced by queryset `.[:500]`). Uses standard `IssueSerializer`. Validates that `{epicId}` refers to an issue with `type='epic'`; returns 400 otherwise. |

The project-epics endpoint is implemented as a standalone `APIView` (not a ViewSet action) in `apps/issues/views.py`, registered in `apps/issues/urls.py` and included in the main router under `/api/v1/projects/{projectId}/epics/`. The `{projectId}` comes from the URL kwarg; the view filters `Issue.objects.filter(project_id=projectId, type='epic')`.

Existing `POST /api/v1/issues/` and `PATCH /api/v1/issues/{id}/` gain `epic_id` and `color` as writable fields via the serializer changes above. No new write endpoints are needed.

### 1.4 Board filtering

Epics must not appear in the Kanban board. Because the existing `IssueFilter` does not support exclusion filters, this is handled **purely on the frontend** in `BoardPage`: after the full issue list is fetched, filter the result array in JavaScript before rendering (`issues.filter(i => i.type !== 'epic')`). The standard `GET /issues/` endpoint is not changed. No new backend filter parameter is needed.

---

## Section 2: Frontend

### 2.1 TypeScript types (`frontend/src/types/issue.ts`)

Add to `Issue` interface:
```typescript
color: string | null          // set on epics only
childCount: number            // populated by EpicSerializer, 0 for non-epics
completedCount: number        // populated by EpicSerializer, 0 for non-epics
epic: EpicSummary | null      // nested epic object (for badge rendering)
```

Add to `UpdateIssueDto`:
```typescript
epicId?: string | null
color?: string | null
```

New `EpicSummary` interface (mirrors `EpicSummarySerializer`):
```typescript
export interface EpicSummary {
  id: string
  sequenceId: number
  title: string
  color: string | null
}
```

### 2.2 Services & hooks

**`frontend/src/services/issue.service.ts`:**
```typescript
getEpics(projectId: string): Promise<Issue[]>
  // GET /api/v1/projects/{projectId}/epics/

getEpicIssues(epicId: string): Promise<Issue[]>
  // GET /api/v1/issues/{epicId}/epic-issues/
```

**`mapIssue()` update** (also in `issue.service.ts`): the `epic` field changes from a UUID scalar to a nested object. Update the mapping:
```typescript
// before:
epicId: raw.epic ?? null,

// after:
epicId: raw.epic?.id ?? null,
epic: raw.epic
  ? { id: raw.epic.id, sequenceId: raw.epic.sequence_id, title: raw.epic.title, color: raw.epic.color }
  : null,
```

**`frontend/src/hooks/useIssues.ts`:**
```typescript
useEpics(projectId: string)      // TanStack Query wrapper for getEpics
useEpicIssues(epicId: string)    // TanStack Query wrapper for getEpicIssues
```

The epic selector in `IssueForm` fetches the epic list using `useEpics(projectId)`, which returns the full `Issue[]` from the epics list endpoint.

`useEpicIssues(epicId)` is called **on-demand only** — it is invoked inside `EpicDetail` which is only mounted when the user expands an epic card. Child issues are not pre-fetched for all epics on page load, avoiding N+1 HTTP requests.

### 2.3 New components

**`frontend/src/features/issues/EpicBadge.tsx`**
Small colored pill for displaying the epic an issue belongs to.
```tsx
// Props: epic: EpicSummary | null
// Renders nothing when epic is null
<span style={{ backgroundColor: color + '22', color }}>
  ● {title}
</span>
```

**`frontend/src/features/epics/EpicsPage.tsx`**
Main epics list view (`/projects/:projectId/epics`). Shows one card per epic:
- Left color strip (4 px, `epic.color`)
- Title + sequence ID (`#E-{sequenceId}`)
- Assignee avatar
- State badge
- Progress bar: `completedCount / childCount` — label "X de Y concluídas"
- Due date if set
- Click card → expands inline to show `EpicDetail`
- "Nova épico" button → opens `IssueForm` pre-set to `type='epic'`

**`frontend/src/features/epics/EpicDetail.tsx`**
Rendered **inline** (expand/collapse) inside `EpicsPage` — no separate route. Shows child issues (from `useEpicIssues`) grouped by state using the same row layout as `BacklogPage`. Includes an inline "Adicionar issue" row that creates an issue with `epicId` pre-filled.

**`frontend/src/features/epics/EpicColorPicker.tsx`**
A row of 10 color swatches (same palette as Roadmap/OKR: `['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#f97316','#14b8a6','#ec4899','#84cc16']`). Used inside `IssueForm` when `type === 'epic'`.

### 2.4 Modified components

**`frontend/src/components/layout/ProjectNav.tsx`**
Add "Épicos" tab (icon: `Layers`) between Backlog and Gantt.

**`frontend/src/App.tsx`**
Add route `/projects/:projectId/epics` → `<EpicsPage />`.

**`frontend/src/features/backlog/BacklogPage.tsx`**
- Add toggle button in toolbar: `Por estado` / `Por épico`
- In **epic grouping mode**:
  - Fetch epics with `useEpics(projectId)` and issues with `useIssues(projectId)`
  - Epics appear as **section headers only** (colored dot + epic title + "X de Y" count) — not as issue rows
  - Child issues (issues where `epicId` matches) are rendered as rows under each epic header
  - Issues with `epicId === null` are rendered under a grey "Sem épico" section at the bottom
  - Epics with zero child issues still render their header (with "0 de 0" count)
  - Epics themselves (`type === 'epic'`) are excluded from all issue rows in both grouping modes
- Toggle state is component-local (`useState`), not persisted

**`frontend/src/features/board/BoardPage.tsx`**
- Add `type: { notIn: ['epic'] }` (or equivalent) to the issues filter when fetching board data, so epics never appear as cards
- Add `<EpicBadge epic={issue.epic} />` to each kanban card (renders nothing when `issue.epic` is null)

**`frontend/src/features/issues/IssueForm.tsx`**
- Add epic selector: searchable dropdown populated by `useEpics(projectId)`. Shown only when `type !== 'epic'`. Allows clearing (sets `epicId` to null).
- Add `<EpicColorPicker>` shown only when `type === 'epic'`; sets `color` in form state

**`frontend/src/features/issues/IssueDetailPage.tsx`**
- Add epic field to sidebar metadata: shows `<EpicBadge>` when `issue.epic` is set; allows changing epic via same selector dropdown
- Clicking the badge has no navigation (stays on the issue detail page); the Épicos tab in the nav is the way to browse epics

### 2.5 File structure summary

```
frontend/src/features/epics/
  EpicsPage.tsx          (new)
  EpicDetail.tsx         (new — rendered inline inside EpicsPage, no route)
  EpicColorPicker.tsx    (new)

frontend/src/features/issues/
  EpicBadge.tsx          (new)
  IssueForm.tsx          (modified — epic selector + color picker)
  IssueDetailPage.tsx    (modified — epic badge + selector in sidebar)

frontend/src/features/backlog/
  BacklogPage.tsx         (modified — epic grouping toggle)

frontend/src/features/board/
  BoardPage.tsx           (modified — exclude epics, add EpicBadge to cards)

frontend/src/components/layout/
  ProjectNav.tsx          (modified — Épicos tab)

frontend/src/
  App.tsx                 (modified — /epics route)
  types/issue.ts          (modified — color, childCount, completedCount, EpicSummary)
  services/issue.service.ts (modified — getEpics, getEpicIssues, mapIssue epic field)
  hooks/useIssues.ts      (modified — useEpics, useEpicIssues)
```

---

## Section 3: Constraints & edge cases

- **Epic deleted:** `epic_id` FK uses `on_delete=models.SET_NULL` — verify this is set on the Issue model; if not, add it in the migration
- **Type change → epic:** If the issue already has `epic_id` set, reject with 400 (user must clear `epic_id` first)
- **Type change from epic:** If the epic has issues linked via `epic_id`, reject with 400 (user must reassign children first)
- **Color validation:** Backend enforces `^#[0-9A-Fa-f]{6}$` regex on the `color` field; frontend constrains to 10 swatches so invalid values should never be submitted
- **Cross-project epics:** Serializer validates that the referenced epic belongs to the same project as the issue; returns 400 if not
- **CPM integration:** Epics can participate in CPM relations (they are issues), but `estimate_days` on an epic is independent of its children
- **Notifications:** No new notification types in this phase
- **Board:** Epics excluded via frontend filter (`type!='epic'`) on the issues query

---

## Out of scope (this phase)

- Epic timeline / Gantt view of epics
- Epic-level burndown chart
- Nested epics (epics within epics)
- Bulk assign issues to epic
- Epic templates
- Epic search endpoint (epic selector uses full list from `useEpics`)
