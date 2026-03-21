# Subtask Capability for Issues — Design Spec

**Date:** 2026-03-21
**Status:** Approved

---

## Overview

Add subtask support to issues. Subtasks are first-class issues of type `subtask` linked to a parent issue via the existing `parent` FK. They have a full lifecycle (state, priority, assignee, etc.) and navigate to their own detail page. The parent issue detail page shows a compact subtask list with a "+ Add" button. Issue cards in the board/backlog show a muted completion counter (`2/5`) when subtasks exist.

Note: subtask `sequence_id` values are project-wide (the same `next_sequence_id()` DB function is used for all issues), so a subtask may show as `#47` under parent `#12`. This is expected behavior.

---

## Architecture

### Data Model

No migration required. The `Issue` model already has:
- `parent = ForeignKey("self", ..., related_name="sub_issues")` — the parent link (SET_NULL on delete, so deleting a parent orphans subtasks)
- `type` with `SUBTASK = "subtask"` choice

**Constraints enforced at API level (not DB):**
- A subtask cannot itself be a parent (max 1 level of nesting)
- `parent_id` cannot equal the issue's own `id`

---

## Backend

### Serializer changes (`serializers.py`)

1. Add `subtask_count` and `completed_subtask_count` as `SerializerMethodField` to `IssueSerializer`.
   - Read from DB-annotated values if present (`obj.subtask_count`, `obj.completed_subtask_count`) to avoid N+1 on list queries.
   - Fall back to live queries on `retrieve` (two extra queries per detail fetch — acceptable):
     ```python
     def get_subtask_count(self, obj):
         if hasattr(obj, 'subtask_count'):
             return obj.subtask_count
         return obj.sub_issues.count()

     def get_completed_subtask_count(self, obj):
         if hasattr(obj, 'completed_subtask_count'):
             return obj.completed_subtask_count
         return obj.sub_issues.filter(state__category='completed').count()
     ```
   - The fallback `filter(state__category='completed')` performs a JOIN against `issues_states` — no extra per-row query since it is a single aggregate DB call, not a Python loop. The `state__category` path is valid: `IssueState.category` is confirmed by `state_category = serializers.CharField(source="state.category", read_only=True)` at `serializers.py:21`.

2. Add `SubtaskSerializer` — a slim **read-only** serializer exposing: `id`, `sequence_id`, `title`, `state`, `state_color` (source: `state.color`), `state_category` (source: `state.category`), `assignee` (UUID), `assignee_name` (source: `assignee.name`), `assignee_avatar` (source: `assignee.avatar_url`), `priority`, `type`, `completed_at`.
   - This serializer is used only for `GET` responses. The `POST` path uses the full `IssueSerializer` for deserialization.

### View (`views.py`)

New class `IssueSubtaskListCreateView`:

```
GET  /issues/{issue_pk}/subtasks/   — list subtasks (SubtaskSerializer)
POST /issues/{issue_pk}/subtasks/   — create a subtask (IssueSerializer for write)
```

Following the exact same two-layer pattern used by all other nested views (e.g., `IssueCommentListCreateView`):

```python
class IssueSubtaskListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def _get_issue(self):
        # Instance method wrapping the module-level helper
        return _get_issue(self.kwargs["issue_pk"], self.request.user)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return IssueSerializer
        return SubtaskSerializer

    def get_queryset(self):
        return self._get_issue().sub_issues.select_related(
            "state", "assignee"
        ).order_by("sort_order")

    def perform_create(self, serializer):
        parent = self._get_issue()
        # Prevent nesting deeper than 1 level.
        # Note: no self-referential guard is needed here — parent is resolved
        # server-side from the URL's issue_pk and never taken from the request body.
        if parent.parent_id is not None:
            raise ValidationError("Subtarefas não podem ter filhos.")
        # type and parent are forced server-side; reporter and created_by are
        # set automatically by IssueSerializer.create() from request.user
        serializer.save(
            project=parent.project,
            parent=parent,
            type=Issue.Type.SUBTASK,
        )
```

**Note:** `reporter` and `created_by` do NOT need to be set in the view. `IssueSerializer.create()` (at `serializers.py:121-127`) already sets both from `self.context["request"].user`.

### Queryset annotation (`views.py` — `IssueViewSet.get_queryset`)

On the `list` action only, annotate the queryset:

```python
from django.db.models import Count, Q

# Inside get_queryset(), inside the `if self.action == "list":` block,
# before returning the filtered queryset:
qs = qs.annotate(
    subtask_count=Count('sub_issues', distinct=True),
    completed_subtask_count=Count(
        'sub_issues',
        filter=Q(sub_issues__state__category='completed'),
        distinct=True,
    ),
)
```

### URL (`urls.py`)

```python
path("<uuid:issue_pk>/subtasks/", IssueSubtaskListCreateView.as_view(), name="issue-subtask-list"),
```

---

## Frontend

### Types (`types/issue.ts`)

Add to `Issue` interface:
```ts
subtaskCount: number
completedSubtaskCount: number
```

Add `CreateSubtaskDto`:
```ts
export interface CreateSubtaskDto {
  title: string
  stateId?: string
  priority?: Priority
  assigneeId?: string | null
  description?: object | null
  labelIds?: string[]
}
```

### Service (`services/issue.service.ts`)

Add to `issueService`:
```ts
subtasks: (issueId: string) =>
  api.get<unknown[]>(`/issues/${issueId}/subtasks/`).then((r) => (r.data as unknown[]).map(mapIssue)),

createSubtask: (issueId: string, data: Record<string, unknown>) =>
  api.post<unknown>(`/issues/${issueId}/subtasks/`, data).then((r) => mapIssue(r.data)),
```

Add to `mapIssue()`:
```ts
subtaskCount: raw.subtask_count ?? 0,
completedSubtaskCount: raw.completed_subtask_count ?? 0,
```

### Hooks (`hooks/useIssues.ts`)

**New hook `useSubtasks`:**
```ts
export function useSubtasks(issueId: string) {
  return useQuery({
    queryKey: ['subtasks', issueId],
    queryFn: () => issueService.subtasks(issueId),
    enabled: !!issueId,
  })
}
```

**New hook `useCreateSubtask`:**
```ts
export function useCreateSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ issueId, data }: { issueId: string; data: CreateSubtaskDto }) => {
      const payload: Record<string, unknown> = {
        title: data.title,
        priority: data.priority ?? 'none',
      }
      if (data.stateId) payload.state = data.stateId
      if (data.assigneeId) payload.assignee = data.assigneeId
      if (data.description) payload.description = data.description
      if (Array.isArray(data.labelIds) && data.labelIds.length > 0) {
        payload.label_ids = data.labelIds
      }
      // type and parent are forced server-side — do NOT send them from the client
      return issueService.createSubtask(issueId, payload)
    },
    onSuccess: (_, { issueId }) => {
      qc.invalidateQueries({ queryKey: ['subtasks', issueId] })
      qc.invalidateQueries({ queryKey: ['issue', issueId] })
      // Note: board card counts come from the annotated list query and will
      // refresh on the next list invalidation, not in real-time after this mutation.
    },
  })
}
```

**Note:** `useCreateSubtask` builds its own payload independently and does NOT reuse `useCreateIssue`. `useCreateIssue` excludes `type` and `parent` from its payload and cannot be reused for subtask creation.

### IssueForm changes (`features/issues/IssueForm.tsx`)

Add optional props to `IssueFormProps`:
```ts
parentIssueId?: string   // if set, creates a subtask under this parent
typeOverride?: IssueType // if set, hides type selector and forces this type
```

At the **top level of the component** (not inside handlers — React Rules of Hooks forbid conditional hook calls), instantiate both mutations:
```ts
const create = useCreateIssue()
const createSubtask = useCreateSubtask()
```

In `handleSubmit`, branch on `parentIssueId`:
```ts
if (parentIssueId) {
  createSubtask.mutate({ issueId: parentIssueId, data: formData }, { onSuccess: ... })
} else {
  create.mutate({ projectId, data: formData }, { onSuccess: ... })
}
```

When `typeOverride` is provided, hide the type selector field in the form JSX (do not render it at all).

### SubtaskList component (new file: `features/issues/SubtaskList.tsx`)

```
Props: { projectId: string; issueId: string }

States:
- Loading: render a small spinner (consistent with PageSpinner used elsewhere)
- Error: render a muted "Não foi possível carregar subtarefas" message
- Empty (N === 0): render "Sem subtarefas" in muted text
- Populated: render subtask rows

Each subtask row:
  [state color dot]  #{sequenceId}  [title — link to /projects/{projectId}/issues/{id}]
  [assignee avatar (if set)]  [priority badge]

Header:
  "Subtarefas (N)"  [+ Adicionar button — right-aligned]

Clicking "+ Adicionar": opens IssueForm with parentIssueId=issueId, typeOverride='subtask'
```

Uses `useSubtasks(issueId)` and `useCreateSubtask()`.

No pagination for the first iteration (add a TODO comment noting to revisit if > 50 subtasks becomes common).

### IssueDetailPage changes (`features/issues/IssueDetailPage.tsx`)

Place `<SubtaskList projectId={projectId} issueId={issueId} />` inside the **left-column `<div>`** (the `<div>` opened at line 72), between the description block (which ends around line 107) and the comments `<div>` (which starts around line 109). Do not place it outside the grid or in the sidebar.

### IssueCard changes (`features/board/BoardPage.tsx`)

**Important:** `IssueCard` is implemented inline in `features/board/BoardPage.tsx` (around line 46), NOT in `components/board/IssueCard.tsx` (which is a stub with only `export {}`). All card changes must be made in `BoardPage.tsx`.

In the card footer/bottom area, add — only when `issue.subtaskCount > 0`:
```tsx
<span className="text-xs text-gray-400">
  {issue.completedSubtaskCount}/{issue.subtaskCount}
</span>
```

---

## Data Flow

```
User opens issue detail
  → useIssue fetches GET /issues/{id}/  (includes subtaskCount, completedSubtaskCount)
  → SubtaskList mounts → useSubtasks(issueId) fetches GET /issues/{id}/subtasks/
  → User clicks "+ Adicionar" → IssueForm opens (parentIssueId locked, typeOverride='subtask')
  → On submit → useCreateSubtask POSTs to /issues/{id}/subtasks/
                → invalidates ['subtasks', id] + ['issue', id]
  → Subtask row click → navigate to /projects/{projectId}/issues/{subtaskId}

Board/backlog cards
  → Counts from annotated list response (no extra fetch)
  → Count badges on board will NOT update in real-time after subtask creation
    from the detail page — they refresh on next list invalidation
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| Parent is already a subtask (depth > 1) | Backend returns 400: "Subtarefas não podem ter filhos." |
| Missing `title` or `state` | DRF default 400 validation error |
| Deleting a parent | Subtasks' `parent` FK becomes `NULL` (existing `SET_NULL` on `Issue.parent`) — subtasks are orphaned, not deleted |
| Network/query error on SubtaskList | Render muted error message in the SubtaskList section |

---

## Testing

### Backend

- `test_list_subtasks` — GET returns only direct children of the parent
- `test_create_subtask` — POST creates issue with correct parent/type; reporter and created_by are set from request user
- `test_create_subtask_forces_type` — even if client sends a different type, it is overridden server-side
- `test_no_nested_subtasks` — creating a subtask of a subtask (parent already has `parent_id`) returns 400
- `test_count_annotation_correct_values` — list response includes correct `subtask_count` / `completed_subtask_count` on parent issues
- `test_count_annotation_present_for_all_issues` — all issues in the list response include `subtask_count` (including issues with 0 subtasks), confirming the annotation is applied broadly and not only for issues with children

### Frontend

- `mapIssue` correctly maps `subtask_count` / `completed_subtask_count` to camelCase, defaulting to 0
- `SubtaskList` renders subtask rows correctly when populated
- `SubtaskList` renders empty state when `useSubtasks` returns an empty array
- `SubtaskList` renders a spinner when `isLoading` is true
- `SubtaskList` renders an error message when the query errors
- `SubtaskList` opens `IssueForm` with correct `parentIssueId` and `typeOverride` props on "+ Adicionar" click
- `IssueCard` (in `BoardPage.tsx`) shows `completedSubtaskCount/subtaskCount` badge only when `subtaskCount > 0`
- `IssueCard` does not show badge when `subtaskCount === 0`

---

## Out of Scope

- Recursive subtasks (more than 1 level deep) — not supported
- Subtask reordering via drag-and-drop — not in this iteration
- Subtask progress roll-up to parent state — not in this iteration
- Real-time board card count refresh after subtask creation from detail page — not in this iteration
