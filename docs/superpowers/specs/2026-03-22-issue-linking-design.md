# Issue Linking (Relations) — Design Spec

**Date:** 2026-03-22
**Status:** Approved

---

## Overview

Add a UI for creating and managing relations between issues. The backend model, API endpoints, and frontend service layer already exist. This feature is primarily a UI addition with one small backend change to support workspace-wide issue search.

Relations are directional links between two issues. Each relation has a type (e.g. "blocks", "relates to") and an optional lag in days (for CPM scheduling). Relations are displayed on the issue detail page, grouped by type, with the ability to add and delete them inline.

---

## Architecture

### Backend Change

**File:** `backend/apps/issues/views.py` — `IssueViewSet.get_queryset()`

Currently `project_id` is required on the list action; omitting it raises a `ValidationError`. Change: when `project_id` is absent, scope to all projects in the workspace that the user can access (via `X-Workspace-ID` header, already resolved to `user.workspace`).

```python
if self.action == "list":
    project_id = self.request.query_params.get("project_id")
    if project_id:
        # existing single-project path (unchanged)
        ...
    else:
        # workspace-wide search (used by relation issue picker)
        accessible = ProjectMember.objects.filter(
            member=user
        ).values_list("project_id", flat=True)
        if user.role == "admin":
            qs = qs.filter(project__workspace=user.workspace)
        else:
            qs = qs.filter(project_id__in=accessible)
        # annotation still applied for consistency
        qs = qs.annotate(
            subtask_count=Count('sub_issues', distinct=True),
            completed_subtask_count=Count(
                'sub_issues',
                filter=Q(sub_issues__state__category='completed'),
                distinct=True,
            ),
        )
```

The existing `SearchFilter` on `search_fields = ["title"]` handles the `?search=` param automatically. The existing `IssueSerializer` already returns `project` (UUID), `title`, and `sequence_id` — no serializer changes needed.

**Note:** The workspace-wide path still applies `StandardPagination`. The frontend issue picker uses only the first page of results (sufficient for search-as-you-type).

### Data Model

No migrations required. `IssueRelation` already exists with:

```python
class RelationType(models.TextChoices):
    BLOCKS         = "blocks",         "Bloqueia"
    BLOCKED_BY     = "blocked_by",     "Bloqueado por"
    DUPLICATES     = "duplicates",     "Duplica"
    DUPLICATE_OF   = "duplicate_of",   "Duplicata de"
    RELATES_TO     = "relates_to",     "Relacionado a"
    FINISH_TO_START = "finish_to_start", "Termina para iniciar"
    START_TO_START  = "start_to_start",  "Inicia para iniciar"
```

Fields: `issue` (FK), `related_issue` (FK), `relation_type`, `lag_days` (int, default 0).
Unique constraint: `(issue, related_issue, relation_type)`.

### Existing API Endpoints (unchanged)

```
GET    /api/v1/issues/{issue_pk}/relations/          — list relations
POST   /api/v1/issues/{issue_pk}/relations/          — create relation
DELETE /api/v1/issues/{issue_pk}/relations/{pk}/     — delete relation
GET    /api/v1/issues/?search=<text>                 — workspace-wide search (after backend change)
```

---

## Frontend

### Service (`services/issue.service.ts`)

Add one method:

```ts
search: (query: string) =>
  api.get<PaginatedResponse<unknown>>(`/issues/`, { params: { search: query } })
    .then((r) => (r.data.results as unknown[]).map(mapIssue)),
```

Note: no `project_id` param → workspace-wide.

### Hooks (`hooks/useIssues.ts`)

**`useRelations(issueId: string)`**
```ts
useQuery({
  queryKey: ['relations', issueId],
  queryFn: () => issueService.relations(issueId),
  enabled: !!issueId,
})
```

**`useAddRelation()`**
```ts
useMutation({
  mutationFn: ({ issueId, relatedIssueId, relationType, lagDays }:
    { issueId: string; relatedIssueId: string; relationType: string; lagDays: number }) =>
      issueService.addRelation(issueId, relatedIssueId, relationType, lagDays),
  onSuccess: (_, { issueId }) => {
    qc.invalidateQueries({ queryKey: ['relations', issueId] })
  },
})
```

**`useDeleteRelation()`**
```ts
useMutation({
  mutationFn: ({ issueId, relationId }: { issueId: string; relationId: string }) =>
    issueService.deleteRelation(issueId, relationId),
  onSuccess: (_, { issueId }) => {
    qc.invalidateQueries({ queryKey: ['relations', issueId] })
  },
})
```

**`useIssueSearch(query: string)`**
```ts
useQuery({
  queryKey: ['issue-search', query],
  queryFn: () => issueService.search(query),
  enabled: query.length >= 2,
  staleTime: 30_000,
})
```

The debounce (300ms) is handled in the component via a local `useState` + `useEffect`, not in the hook itself — keeping the hook pure.

### Component: `IssueRelationList` (new file)

**File:** `frontend/src/features/issues/IssueRelationList.tsx`

**Props:** `{ projectId: string; issueId: string }`

**Render states:**
- Loading: muted "Carregando..." text
- Error: muted "Não foi possível carregar relações."
- Loaded: header + grouped relation rows + optional inline add form

**Header:**
```
Relações (N)                    [+ Adicionar]
```

**Relation rows — grouped by type, empty groups hidden:**
```
BLOQUEIA
  ● #12 Tarefa X (Projeto Alpha)   +2d   [×]

RELACIONADO A
  ● #47 Outra tarefa (Projeto Beta)       [×]
```

Each row:
- State color dot (`●`) using `relation.relatedIssueId` resolved via the existing relation data — **Note:** `IssueRelation` from the serializer includes `related_issue_title` and `related_issue_sequence_id` but not state color. The dot is omitted; use a neutral dash or sequence ID only.
- `#sequenceId title` as a `<Link>` to `/projects/{relatedProjectId}/issues/{relatedIssueId}` — **Note:** the relation serializer may not return `relatedProjectId`. If absent, link to `/issues/{relatedIssueId}` using a workspace-level route, or omit the link and render as plain text. Verify in `IssueRelationSerializer` during implementation.
- Lag badge: `+Nd` shown only when `lagDays > 0`, muted gray text
- Delete `×` button (icon button, aria-label "Remover relação")

**Inline add form (shown when `showForm` is true):**
```
[Relation type ▼]  [Buscar issue...        ]  [0] dias  [Salvar] [Cancelar]
                    ┌─────────────────────┐
                    │ #47 Tarefa X        │
                    │    Projeto Alpha    │
                    │ #23 Outra tarefa    │
                    │    Projeto Beta     │
                    └─────────────────────┘
```

- Relation type: `<select>` with all 7 types, default `relates_to`
- Issue search: text input, debounced 300ms, min 2 chars; shows dropdown below with results `#seq title` + project name on second line; "Nenhuma issue encontrada" when empty; spinner while loading
- Lag days: `<input type="number" min="0">`, default 0, label "dias" next to it
- Validation: must select an issue before Save is enabled
- On Save: calls `useAddRelation`, closes form on success, shows inline error on 400

**Group labels (Portuguese):**

| `relation_type` | Group header |
|---|---|
| `blocks` | BLOQUEIA |
| `blocked_by` | BLOQUEADO POR |
| `duplicates` | DUPLICA |
| `duplicate_of` | DUPLICATA DE |
| `relates_to` | RELACIONADO A |
| `finish_to_start` | TERMINA PARA INICIAR |
| `start_to_start` | INICIA PARA INICIAR |

### IssueDetailPage placement

Insert `<IssueRelationList projectId={projectId} issueId={issueId} />` after `<SubtaskList>` and before the comments `<div>`, inside the left-column `<div>`.

---

## Data Flow

```
User opens issue detail
  → useRelations(issueId) → GET /issues/{id}/relations/
  → Renders grouped relation rows

User clicks "+ Adicionar"
  → showForm = true, inline form appears

User types in search (≥ 2 chars, debounced 300ms)
  → useIssueSearch fires GET /issues/?search=query (workspace-wide)
  → Dropdown shows results

User selects issue + relation type + optional lag days → Salvar
  → useAddRelation → POST /issues/{id}/relations/
  → On success: invalidate ['relations', issueId], close form

User clicks × on a row
  → useDeleteRelation → DELETE /issues/{id}/relations/{relationId}/
  → On success: invalidate ['relations', issueId]
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| Duplicate relation (`unique_together` violation) | Backend 400 → inline error below form |
| Self-relation | Backend 400 → inline error |
| Search < 2 chars | Query disabled, no request fired |
| Search returns no results | "Nenhuma issue encontrada" in dropdown |
| Load error | Muted error message in the section |
| Delete fails | Inline error; relation remains visible |
| `relatedProjectId` missing from serializer | Render title as plain text, no link (fix serializer if needed) |

---

## Open Question: IssueRelationSerializer fields

During implementation, verify that `IssueRelationSerializer` returns `related_issue_project_id` (or equivalent). If not, either:
1. Add the field to the serializer (preferred — enables navigation links)
2. Render related issue title as plain text without a link

---

## Testing

### Backend
- `test_list_issues_without_project_id` — workspace-wide, returns only accessible projects
- `test_list_issues_workspace_scoped` — admin sees all workspace issues; member sees only their projects
- `test_list_issues_with_search` — `?search=texto` filters by title workspace-wide

### Frontend
- `useIssueSearch` disabled when query < 2 chars
- `IssueRelationList`: loading / error / empty / populated states
- `IssueRelationList`: relations grouped by type, empty groups hidden
- `IssueRelationList`: lag badge shown only when `lagDays > 0`
- `IssueRelationList`: add form opens on "+ Adicionar", closes on Cancel
- `IssueRelationList`: Save disabled until issue selected
- `IssueRelationList`: delete × calls `useDeleteRelation` with correct args

---

## Out of Scope

- Bidirectional relation creation (creating `blocks` does not auto-create `blocked_by` on the other issue — enforced at display level only)
- Relation reordering
- Filtering issues by their relations
- Real-time updates when another user adds a relation
