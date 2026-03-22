# Issue Linking (Relations) — Design Spec

**Date:** 2026-03-22
**Status:** Approved

---

## Overview

Add a UI for creating and managing relations between issues. The backend model and API endpoints already exist. This feature requires three backend changes (serializer fields, workspace-wide list, self-relation validation) and a new frontend UI component.

Relations are directional links between two issues with a type and optional lag in days. They are displayed on the issue detail page, grouped by type, with the ability to add and delete them inline.

---

## Architecture

### Backend Changes

#### 1. `IssueRelationSerializer` — add read fields + self-relation validation

**File:** `backend/apps/issues/serializers.py`

Add read-only derived fields so the frontend can render related issue details without extra requests, and add `validate()` to prevent self-relations:

```python
class IssueRelationSerializer(serializers.ModelSerializer):
    related_issue_title = serializers.CharField(
        source='related_issue.title', read_only=True
    )
    related_issue_sequence_id = serializers.IntegerField(
        source='related_issue.sequence_id', read_only=True
    )
    related_issue_project_id = serializers.UUIDField(
        source='related_issue.project_id', read_only=True
    )
    related_issue_project_name = serializers.CharField(
        source='related_issue.project.name', read_only=True
    )

    class Meta:
        model = IssueRelation
        fields = [
            "id", "issue", "related_issue",
            "related_issue_title", "related_issue_sequence_id",
            "related_issue_project_id", "related_issue_project_name",
            "relation_type", "lag_days", "created_at",
        ]
        read_only_fields = [
            "id", "issue", "created_at",
            "related_issue_title", "related_issue_sequence_id",
            "related_issue_project_id", "related_issue_project_name",
        ]

    def validate(self, attrs):
        issue = self.context['view'].kwargs.get('issue_pk')
        related = attrs.get('related_issue')
        if related and str(related.pk) == str(issue):
            raise serializers.ValidationError("Uma issue não pode se relacionar consigo mesma.")
        return attrs

    def create(self, validated_data):
        return super().create(validated_data)
```

Update the queryset in `IssueRelationListCreateView.get_queryset()` to add `select_related` (including `related_issue__project` for the project name):

```python
def get_queryset(self):
    return IssueRelation.objects.select_related(
        'related_issue', 'related_issue__project'
    ).filter(issue=self._get_issue())
```

#### 2. `IssueViewSet.get_queryset()` — make `project_id` optional

**File:** `backend/apps/issues/views.py`

When `project_id` is absent, scope to all projects in the workspace that the user can access (used by the relation issue picker for workspace-wide search):

```python
if self.action == "list":
    project_id = self.request.query_params.get("project_id")
    if project_id:
        # existing single-project path (unchanged)
        ...
    else:
        # workspace-wide: all accessible projects
        from apps.projects.models import ProjectMember
        if user.role == "admin":
            qs = qs.filter(project__workspace=user.workspace)
        else:
            accessible_ids = ProjectMember.objects.filter(
                member=user
            ).values_list("project_id", flat=True)
            qs = qs.filter(project_id__in=accessible_ids)
        # annotate runs for BOTH admin and member — must be outside the role if/else
        qs = qs.annotate(
            subtask_count=Count('sub_issues', distinct=True),
            completed_subtask_count=Count(
                'sub_issues',
                filter=Q(sub_issues__state__category='completed'),
                distinct=True,
            ),
        )
```

The existing `SearchFilter` on `search_fields = ["title"]` handles `?search=` automatically. `StandardPagination` still applies.

**Add `project_name` to `IssueSerializer`** — it currently returns `project` (UUID) and `project_identifier` but not the human-readable name. The search dropdown renders the project name on each result row, so add:

```python
project_name = serializers.CharField(source='project.name', read_only=True)
```

Add `"project_name"` to `IssueSerializer.Meta.fields` and `Meta.read_only_fields`. Update `mapIssue` in `issue.service.ts` to map it:

```ts
projectName: raw.project_name ?? '',
```

Add `projectName: string` to the `Issue` TypeScript interface. The search dropdown renders: `#seq title` on line 1 and `issue.projectName` on line 2.

**Important:** Both branches (project-scoped and workspace-wide) must share the same base `qs` that already has `select_related("project", "state", "assignee", "reporter", "created_by").prefetch_related("labels")` applied at the top of `get_queryset()`. Do not rebuild the queryset from scratch in the workspace-wide branch — only append `.filter(...)` and `.annotate(...)` to the existing `qs`.

#### 3. Fix POST field name bug in `issue.service.ts`

The existing `addRelation` service method sends `related_issue_id` but the serializer field is `related_issue`. Fix the payload key:

```ts
// BEFORE (bug):
{ related_issue_id: relatedIssueId, ... }

// AFTER (correct):
{ related_issue: relatedIssueId, ... }
```

### Data Model

No migrations required. `IssueRelation` already exists with all **9** relation types:

```python
class RelationType(models.TextChoices):
    BLOCKS           = "blocks",           "Bloqueia"
    BLOCKED_BY       = "blocked_by",       "Bloqueado por"
    DUPLICATES       = "duplicates",       "Duplica"
    DUPLICATE_OF     = "duplicate_of",     "Duplicata de"
    RELATES_TO       = "relates_to",       "Relacionado a"
    FINISH_TO_START  = "finish_to_start",  "Termina para iniciar"
    START_TO_START   = "start_to_start",   "Inicia para iniciar"
    FINISH_TO_FINISH = "finish_to_finish", "Termina para terminar"
    START_TO_FINISH  = "start_to_finish",  "Inicia para terminar"
```

Fields: `issue` (FK), `related_issue` (FK), `relation_type`, `lag_days` (int, default 0).
Unique constraint: `(issue, related_issue, relation_type)`.

### Existing API Endpoints (unchanged)

```
GET    /api/v1/issues/{issue_pk}/relations/          — list relations
POST   /api/v1/issues/{issue_pk}/relations/          — create relation
DELETE /api/v1/issues/{issue_pk}/relations/{pk}/     — delete relation
GET    /api/v1/issues/?search=<text>                 — workspace-wide (after backend change)
```

---

## Frontend

### Types (`types/issue.ts`)

Update `IssueRelation` interface:

```ts
export interface IssueRelation {
  id: string
  issueId: string
  relatedIssueId: string
  relatedIssueTitle: string
  relatedIssueSequenceId: number
  relatedIssueProjectId: string        // NEW
  relatedIssueProjectName: string      // NEW
  relationType: string
  lagDays: number
}
```

Define `mapRelation` in `issue.service.ts` (currently relations are returned as raw `IssueRelation[]` without mapping — this is a bug fix):

```ts
function mapRelation(raw: any): IssueRelation {
  return {
    id: raw.id,
    issueId: raw.issue,
    relatedIssueId: raw.related_issue,
    relatedIssueTitle: raw.related_issue_title ?? '',
    relatedIssueSequenceId: raw.related_issue_sequence_id ?? 0,
    relatedIssueProjectId: raw.related_issue_project_id ?? '',
    relatedIssueProjectName: raw.related_issue_project_name ?? '',
    relationType: raw.relation_type,
    lagDays: raw.lag_days ?? 0,
  }
}
```

Update the existing `relations()` service method to use `mapRelation`:
```ts
relations: (issueId: string) =>
  api.get<unknown[]>(`/issues/${issueId}/relations/`)
    .then((r) => (r.data as unknown[]).map(mapRelation)),
```

The canonical `addRelation` definition is the one in the "Fix `addRelation`" block above — do not use the old `.then((r) => r.data)` form.

### Service (`services/issue.service.ts`)

**Fix `addRelation` — POST field name and response mapping:**
```ts
addRelation: (issueId: string, relatedIssueId: string, relationType: string, lagDays = 0): Promise<IssueRelation> =>
  api.post<unknown>(`/issues/${issueId}/relations/`, {
    related_issue: relatedIssueId,   // was: related_issue_id (bug fix)
    relation_type: relationType,
    lag_days: lagDays,
  }).then((r) => mapRelation(r.data)),  // was: r.data (bug fix — must call mapRelation)
```

**Add search method** (no `project_id` → workspace-wide), returns `Issue[]`:
```ts
search: (query: string): Promise<Issue[]> =>
  api.get<PaginatedResponse<unknown>>('/issues/', { params: { search: query } })
    .then((r) => (r.data.results as unknown[]).map(mapIssue)),
```

### Hooks (`hooks/useIssues.ts`)

**`useRelations(issueId: string)`**
```ts
export function useRelations(issueId: string) {
  return useQuery({
    queryKey: ['relations', issueId],
    queryFn: () => issueService.relations(issueId),
    enabled: !!issueId,
  })
}
```

**`useAddRelation()`**
```ts
export function useAddRelation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      issueId, relatedIssueId, relationType, lagDays,
    }: {
      issueId: string
      relatedIssueId: string
      relationType: string
      lagDays: number
    }) => issueService.addRelation(issueId, relatedIssueId, relationType, lagDays),
    onSuccess: (_, { issueId }) => {
      qc.invalidateQueries({ queryKey: ['relations', issueId] })
    },
  })
}
```

**`useDeleteRelation()`**
```ts
export function useDeleteRelation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ issueId, relationId }: { issueId: string; relationId: string }) =>
      issueService.deleteRelation(issueId, relationId),
    onSuccess: (_, { issueId }) => {
      qc.invalidateQueries({ queryKey: ['relations', issueId] })
    },
    onError: () => {
      // Show inline error in the component; the relation row remains visible
      // (component reads `deleteRelation.isError` to render the error message)
    },
  })
}
```

On delete error, the `IssueRelationList` component reads `deleteRelation.isError` and renders a muted inline error message below the relation list: "Não foi possível remover a relação."

**`useIssueSearch(query: string)`**
```ts
export function useIssueSearch(query: string) {
  return useQuery({
    queryKey: ['issue-search', query],
    queryFn: () => issueService.search(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  })
}
```

Debounce (300ms) is handled via local `useState` + `useEffect` in the component — the hook itself is pure.

### Component: `IssueRelationList`

**File:** `frontend/src/features/issues/IssueRelationList.tsx`

**Props:** `{ projectId: string; issueId: string }`

**Render states:**
- Loading: `<div className="text-sm text-gray-400">Carregando...</div>`
- Error: `<p className="text-sm text-gray-400">Não foi possível carregar relações.</p>`
- Loaded: header + grouped rows + optional inline form

**Header:**
```
Relações (N)                              [+ Adicionar]
```

**Relation rows — grouped by type, empty groups hidden:**

```
BLOQUEIA
  #12 Tarefa X (Projeto Alpha)   +2d   [×]

RELACIONADO A
  #47 Outra tarefa (Projeto Beta)       [×]
```

Each row:
- `#sequenceId title (Project name)` as a `<Link>` to `/projects/{relatedIssueProjectId}/issues/{relatedIssueId}`
- Lag badge: `+Nd` shown only when `lagDays > 0`, muted `text-xs text-gray-400`
- Delete `×` button: icon button, `aria-label="Remover relação"`

**Group labels (all 9 types):**

| `relation_type`    | Group header label      |
|--------------------|-------------------------|
| `blocks`           | BLOQUEIA                |
| `blocked_by`       | BLOQUEADO POR           |
| `duplicates`       | DUPLICA                 |
| `duplicate_of`     | DUPLICATA DE            |
| `relates_to`       | RELACIONADO A           |
| `finish_to_start`  | TERMINA PARA INICIAR    |
| `start_to_start`   | INICIA PARA INICIAR     |
| `finish_to_finish` | TERMINA PARA TERMINAR   |
| `start_to_finish`  | INICIA PARA TERMINAR    |

**Inline add form (shown when `showForm` is true):**

Fields:
1. **Relation type** — `<select>` with all 9 types, default `relates_to`. `aria-label="Tipo de relação"`
2. **Issue search** — text input, debounced 300ms, enabled when ≥ 2 chars. `aria-label="Buscar issue"`. Shows a dropdown below with results: `#seq title` on line 1, project name in muted text on line 2. Shows "Nenhuma issue encontrada" when empty. Shows spinner while `useIssueSearch` is loading. The current issue (`issueId`) is excluded from results.
3. **Lag days** — `<input type="number" min="0">`, default 0. `aria-label="Dias de atraso"`. Followed by muted `dias` label.
4. **Save** button — disabled until an issue is selected from the dropdown. Calls `useAddRelation`.
5. **Cancel** button — sets `showForm = false`, resets form state.

On Save success: close form, reset state. On 400 error: show inline error message below the form.

### IssueDetailPage placement

**File:** `frontend/src/features/issues/IssueDetailPage.tsx`

Insert after `<SubtaskList>` and before the comments `<div>`, inside the left-column `<div>`:

```tsx
import { IssueRelationList } from './IssueRelationList'

// ...inside left column:
<SubtaskList projectId={projectId} issueId={issueId} />

{/* Relations */}
<IssueRelationList projectId={projectId} issueId={issueId} />

{/* Comments */}
<div>
```

---

## Data Flow

```
User opens issue detail
  → useRelations(issueId) → GET /issues/{id}/relations/
  → Renders grouped relation rows

User clicks "+ Adicionar"
  → showForm = true, inline form appears

User types in search (≥ 2 chars, debounced 300ms)
  → useIssueSearch → GET /issues/?search=query (workspace-wide, no project_id)
  → Dropdown shows matching issues (current issue excluded)

User selects issue + relation type + optional lag days → Salvar
  → useAddRelation → POST /issues/{id}/relations/
     body: { related_issue: uuid, relation_type: string, lag_days: number }
  → On success: invalidate ['relations', issueId], close form
  → On 400: show inline error

User clicks × on a row
  → useDeleteRelation → DELETE /issues/{id}/relations/{relationId}/
  → On success: invalidate ['relations', issueId]
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| Duplicate relation (`unique_together` violation) | Backend 400 → inline error below form |
| Self-relation | Backend 400 (serializer `validate()`) + client excludes current issue from results |
| Search < 2 chars | Query disabled, no request fired |
| Search returns no results | "Nenhuma issue encontrada" in dropdown |
| Load error | Muted error message in the section |
| Delete fails | Relation remains visible; no silent failure |

---

## Testing

### Backend
- `test_list_issues_without_project_id` — returns workspace-scoped results
- `test_list_issues_workspace_admin` — admin sees all workspace issues
- `test_list_issues_workspace_member` — member sees only their project issues
- `test_search_issues_workspace_wide` — `?search=texto` filters by title across workspace
- `test_relation_serializer_includes_derived_fields` — GET returns `related_issue_title`, `related_issue_sequence_id`, `related_issue_project_id`, `related_issue_project_name` (verifies `select_related('related_issue__project')` is applied)
- `test_self_relation_returns_400` — POST with `related_issue == issue` returns 400
- `test_duplicate_relation_returns_400` — POST same pair+type twice returns 400

### Frontend
- `useIssueSearch` disabled when query < 2 chars
- `IssueRelationList`: loading / error / empty / populated states
- `IssueRelationList`: relations grouped by type; empty groups hidden
- `IssueRelationList`: lag badge shown only when `lagDays > 0`
- `IssueRelationList`: current issue excluded from search results
- `IssueRelationList`: add form opens on "+ Adicionar", closes on Cancel
- `IssueRelationList`: Save disabled until issue selected
- `IssueRelationList`: delete × calls `useDeleteRelation` with correct args
- `mapRelation` maps all fields correctly including `relatedIssueProjectId` and `relatedIssueProjectName`
- `relations()` service method uses `mapRelation` (not raw data)

---

## Out of Scope

- Bidirectional relation creation (creating `blocks` does not auto-create `blocked_by` on the other issue)
- Relation reordering
- Filtering issues by their relations
- Real-time updates when another user adds a relation
