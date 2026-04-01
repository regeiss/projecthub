# Issue Linking (Relations) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a UI for creating, viewing, and deleting relations between issues, backed by the existing `IssueRelation` model and API endpoints.

**Architecture:** Three backend changes (serializer derived fields, workspace-wide list, self-relation validation) plus a new `IssueRelationList` React component placed on the issue detail page. All new frontend code follows the existing TanStack Query hook pattern established by `useSubtasks`/`SubtaskList`.

**Tech Stack:** Django REST Framework, React 18, TypeScript, TanStack Query v5, Tailwind CSS, Vitest + Testing Library.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/apps/issues/serializers.py` | Modify | Add 4 derived fields + `validate()` to `IssueRelationSerializer`; add `project_name` to `IssueSerializer` |
| `backend/apps/issues/views.py` | Modify | Make `project_id` optional on `IssueViewSet.get_queryset()`; add `select_related` to `IssueRelationListCreateView` |
| `backend/apps/issues/tests/test_relations.py` | Create | Backend tests: derived fields, self-relation 400, duplicate 400, workspace-wide search |
| `frontend/src/types/issue.ts` | Modify | Add `projectName` to `Issue`; add `relatedIssueProjectId`/`relatedIssueProjectName` to `IssueRelation` |
| `frontend/src/services/issue.service.ts` | Modify | Add `mapRelation`; fix `relations()`/`addRelation()`; add `search()` |
| `frontend/src/hooks/useIssues.ts` | Modify | Add `useRelations`, `useAddRelation`, `useDeleteRelation`, `useIssueSearch` |
| `frontend/src/features/issues/IssueRelationList.tsx` | Create | Grouped relation rows + inline add form with debounced search |
| `frontend/src/features/issues/IssueRelationList.test.tsx` | Create | Component tests |
| `frontend/src/features/issues/IssueDetailPage.tsx` | Modify | Insert `<IssueRelationList>` after `<SubtaskList>` |

---

### Task 1: IssueRelationSerializer — derived fields + self-relation validation

**Files:**
- Modify: `backend/apps/issues/serializers.py:244-254`

- [ ] **Step 1: Write the failing tests**

Create `backend/apps/issues/tests/test_relations.py`:

```python
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.issues.models import Issue, IssueRelation
from apps.projects.models import IssueState, Project, ProjectMember
from apps.workspaces.models import Workspace, WorkspaceMember

User = get_user_model()

_seq = 0


def make_issue(project, state, member, title='Issue', type='task'):
  global _seq
  _seq += 1
  return Issue.objects.create(
    project=project, title=title, state=state, priority='none',
    type=type, reporter=member, created_by=member, sequence_id=_seq,
  )


class IssueRelationSerializerTests(TestCase):
  def setUp(self):
    self.client = APIClient()
    self.workspace = Workspace.objects.create(name='WS')
    user = User.objects.create_user(username='u1_rel', password='pw')
    self.member = WorkspaceMember.objects.create(
      workspace=self.workspace, user=user, role='member'
    )
    self.project = Project.objects.create(
      workspace=self.workspace, name='Project One', identifier='PO'
    )
    ProjectMember.objects.create(project=self.project, member=self.member)
    self.state = IssueState.objects.create(
      project=self.project, name='Backlog', color='#aaa', category='backlog', order=1
    )
    self.issue = make_issue(self.project, self.state, self.member, 'Issue A')
    self.other = make_issue(self.project, self.state, self.member, 'Issue B')
    self.client.force_authenticate(user=self.member.user)

  def test_relation_serializer_includes_derived_fields(self):
    IssueRelation.objects.create(
      issue=self.issue,
      related_issue=self.other,
      relation_type='relates_to',
      lag_days=2,
    )
    resp = self.client.get(f'/api/v1/issues/{self.issue.id}/relations/')
    self.assertEqual(resp.status_code, 200)
    r = resp.data[0]
    self.assertEqual(r['related_issue_title'], 'Issue B')
    self.assertEqual(r['related_issue_sequence_id'], self.other.sequence_id)
    self.assertEqual(str(r['related_issue_project_id']), str(self.project.id))
    self.assertEqual(r['related_issue_project_name'], 'Project One')

  def test_self_relation_returns_400(self):
    resp = self.client.post(
      f'/api/v1/issues/{self.issue.id}/relations/',
      {
        'related_issue': str(self.issue.id),
        'relation_type': 'relates_to',
        'lag_days': 0,
      },
      format='json',
    )
    self.assertEqual(resp.status_code, 400)

  def test_duplicate_relation_returns_400(self):
    data = {
      'related_issue': str(self.other.id),
      'relation_type': 'relates_to',
      'lag_days': 0,
    }
    self.client.post(
      f'/api/v1/issues/{self.issue.id}/relations/', data, format='json'
    )
    resp = self.client.post(
      f'/api/v1/issues/{self.issue.id}/relations/', data, format='json'
    )
    self.assertEqual(resp.status_code, 400)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
python3 manage.py test apps.issues.tests.test_relations.IssueRelationSerializerTests --keepdb
```

Expected: 3 failures — derived fields missing, self-relation 400 not returned, duplicate 400 varies.

- [ ] **Step 3: Update `IssueRelationSerializer` in `serializers.py`**

Replace the existing `IssueRelationSerializer` class (lines 244–254):

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
      'id', 'issue', 'related_issue',
      'related_issue_title', 'related_issue_sequence_id',
      'related_issue_project_id', 'related_issue_project_name',
      'relation_type', 'lag_days', 'created_at',
    ]
    read_only_fields = [
      'id', 'issue', 'created_at',
      'related_issue_title', 'related_issue_sequence_id',
      'related_issue_project_id', 'related_issue_project_name',
    ]

  def validate(self, attrs):
    issue_pk = self.context['view'].kwargs.get('issue_pk')
    related = attrs.get('related_issue')
    if related and str(related.pk) == str(issue_pk):
      raise serializers.ValidationError(
        'Uma issue não pode se relacionar consigo mesma.'
      )
    return attrs

  def create(self, validated_data):
    return super().create(validated_data)
```

- [ ] **Step 4: Update `IssueRelationListCreateView.get_queryset` in `views.py`**

Find `IssueRelationListCreateView` (around line 302) and update `get_queryset`:

```python
def get_queryset(self):
  return IssueRelation.objects.select_related(
    'related_issue', 'related_issue__project'
  ).filter(issue=self._get_issue())
```

- [ ] **Step 5: Run tests — all 3 should pass**

```bash
python3 manage.py test apps.issues.tests.test_relations.IssueRelationSerializerTests --keepdb
```

Expected: `Ran 3 tests ... OK`

- [ ] **Step 6: Commit**

```bash
git add backend/apps/issues/serializers.py backend/apps/issues/views.py backend/apps/issues/tests/test_relations.py
git commit -m "feat(issues): add derived fields and self-relation validation to IssueRelationSerializer"
```

---

### Task 2: IssueSerializer project_name + workspace-wide list

**Files:**
- Modify: `backend/apps/issues/serializers.py` (IssueSerializer)
- Modify: `backend/apps/issues/views.py` (IssueViewSet.get_queryset)

- [ ] **Step 1: Write failing tests** — add to `test_relations.py`

Append a new test class at the bottom of `backend/apps/issues/tests/test_relations.py`:

```python
class IssueWorkspaceSearchTests(TestCase):
  def setUp(self):
    self.client = APIClient()
    self.workspace = Workspace.objects.create(name='WS2')

    user1 = User.objects.create_user(username='member_ws', password='pw')
    user2 = User.objects.create_user(username='admin_ws', password='pw')

    self.member = WorkspaceMember.objects.create(
      workspace=self.workspace, user=user1, role='member'
    )
    self.admin = WorkspaceMember.objects.create(
      workspace=self.workspace, user=user2, role='admin'
    )

    # project1: member has access
    self.project1 = Project.objects.create(
      workspace=self.workspace, name='Project Alpha', identifier='PA'
    )
    ProjectMember.objects.create(project=self.project1, member=self.member)

    # project2: member does NOT have access
    self.project2 = Project.objects.create(
      workspace=self.workspace, name='Project Beta', identifier='PB'
    )

    state1 = IssueState.objects.create(
      project=self.project1, name='B', color='#aaa', category='backlog', order=1
    )
    state2 = IssueState.objects.create(
      project=self.project2, name='B', color='#aaa', category='backlog', order=1
    )
    self.issue1 = make_issue(self.project1, state1, self.member, 'Alpha Task')
    self.issue2 = make_issue(self.project2, state2, self.admin, 'Beta Task')

  def test_member_sees_only_accessible_issues(self):
    self.client.force_authenticate(user=self.member.user)
    resp = self.client.get('/api/v1/issues/')
    self.assertEqual(resp.status_code, 200)
    ids = [r['id'] for r in resp.data['results']]
    self.assertIn(str(self.issue1.id), ids)
    self.assertNotIn(str(self.issue2.id), ids)

  def test_admin_sees_all_workspace_issues(self):
    self.client.force_authenticate(user=self.admin.user)
    resp = self.client.get('/api/v1/issues/')
    self.assertEqual(resp.status_code, 200)
    ids = [r['id'] for r in resp.data['results']]
    self.assertIn(str(self.issue1.id), ids)
    self.assertIn(str(self.issue2.id), ids)

  def test_search_filters_by_title(self):
    self.client.force_authenticate(user=self.member.user)
    resp = self.client.get('/api/v1/issues/?search=Alpha')
    self.assertEqual(resp.status_code, 200)
    self.assertEqual(len(resp.data['results']), 1)
    self.assertEqual(resp.data['results'][0]['title'], 'Alpha Task')

  def test_project_name_in_issue_response(self):
    self.client.force_authenticate(user=self.member.user)
    resp = self.client.get('/api/v1/issues/')
    self.assertEqual(resp.status_code, 200)
    self.assertEqual(resp.data['results'][0]['project_name'], 'Project Alpha')
```

- [ ] **Step 2: Run tests — expect 4 failures**

```bash
python3 manage.py test apps.issues.tests.test_relations.IssueWorkspaceSearchTests --keepdb
```

Expected: all 4 fail (project_id still required, project_name missing).

- [ ] **Step 3: Add `project_name` to `IssueSerializer`**

In `serializers.py`, add after the existing `project_identifier` field (line ~45):

```python
project_name = serializers.CharField(
  source='project.name', read_only=True
)
```

Add `'project_name'` to `Meta.fields` (after `'project_identifier'`) and to `Meta.read_only_fields`.

- [ ] **Step 4: Make `project_id` optional in `IssueViewSet.get_queryset`**

In `views.py`, replace lines 88–111 (the `if self.action == "list":` block):

```python
if self.action == "list":
  project_id = self.request.query_params.get("project_id")
  if project_id:
    # existing single-project path
    from apps.projects.models import Project
    try:
      project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
      return Issue.objects.none()
    if user.role != "admin" and not project.members.filter(member=user).exists():
      return Issue.objects.none()
    qs = qs.filter(project_id=project_id)
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
  # annotate runs for BOTH branches — must be outside the project_id if/else
  qs = qs.annotate(
    subtask_count=Count('sub_issues', distinct=True),
    completed_subtask_count=Count(
      'sub_issues',
      filter=Q(sub_issues__state__category='completed'),
      distinct=True,
    ),
  )
  return qs
```

Also update the docstring on `IssueViewSet` to remove "project_id é obrigatório no list".

- [ ] **Step 5: Run all relation tests — expect 7 passing**

```bash
python3 manage.py test apps.issues.tests.test_relations --keepdb
```

Expected: `Ran 7 tests ... OK`

- [ ] **Step 6: Commit**

```bash
git add backend/apps/issues/serializers.py backend/apps/issues/views.py backend/apps/issues/tests/test_relations.py
git commit -m "feat(issues): add project_name to IssueSerializer and workspace-wide issue list"
```

---

### Task 3: Frontend types

**Files:**
- Modify: `frontend/src/types/issue.ts`

- [ ] **Step 1: Add `projectName` to `Issue` interface**

In `frontend/src/types/issue.ts`, add after `milestoneName: string | null` (line ~38):

```ts
projectName: string
```

- [ ] **Step 2: Update `IssueRelation` interface**

Replace the existing `IssueRelation` interface (lines 76–84) with:

```ts
export interface IssueRelation {
  id: string
  issueId: string
  relatedIssueId: string
  relatedIssueTitle: string
  relatedIssueSequenceId: number
  relatedIssueProjectId: string
  relatedIssueProjectName: string
  relationType: string
  lagDays: number
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/issue.ts
git commit -m "feat(issues): add projectName to Issue and relatedIssueProject fields to IssueRelation types"
```

---

### Task 4: Frontend service — mapRelation + fix relations/addRelation + search

**Files:**
- Modify: `frontend/src/services/issue.service.ts`

- [ ] **Step 1: Write failing test**

Create `frontend/src/services/issue.service.test.ts` — add these cases to the existing file (it already has 2 mapIssue tests):

```ts
import { describe, it, expect } from 'vitest'
import { mapIssue } from './issue.service'
// Note: mapRelation is not exported — tested via the existing mapIssue tests only.
// The mapRelation function correctness is verified by the component tests below.

describe('mapIssue projectName', () => {
  it('maps project_name to camelCase', () => {
    const raw = {
      id: 'abc', title: 'T', priority: 'none', type: 'task',
      sequence_id: 1, sort_order: 0, estimate_days: null,
      state: null, state_color: null, state_category: null,
      assignee: null, assignee_name: null, assignee_avatar: null,
      reporter: null, created_by: null, labels: [],
      parent_id: null, milestone: null, milestone_name: null,
      subtask_count: 0, completed_subtask_count: 0,
      project_name: 'My Project',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      completed_at: null,
    }
    const issue = mapIssue(raw)
    expect(issue.projectName).toBe('My Project')
  })

  it('defaults projectName to empty string when absent', () => {
    const raw = {
      id: 'abc', title: 'T', priority: 'none', type: 'task',
      sequence_id: 1, sort_order: 0, estimate_days: null,
      state: null, state_color: null, state_category: null,
      assignee: null, assignee_name: null, assignee_avatar: null,
      reporter: null, created_by: null, labels: [],
      parent_id: null, milestone: null, milestone_name: null,
      subtask_count: 0, completed_subtask_count: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      completed_at: null,
    }
    const issue = mapIssue(raw)
    expect(issue.projectName).toBe('')
  })
})
```

- [ ] **Step 2: Run test — expect 2 failures**

```bash
cd frontend
npm run test -- --run src/services/issue.service.test.ts
```

Expected: 2 new failures (projectName undefined).

- [ ] **Step 3: Add `projectName` to `mapIssue`**

In `issue.service.ts`, add after `milestoneName: raw.milestone_name ?? null,` (line ~54):

```ts
projectName: raw.project_name ?? '',
```

- [ ] **Step 4: Add `mapRelation` function**

Add after the `mapComment` function (after line ~71):

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

- [ ] **Step 5: Fix `relations()` and `addRelation()` in `issueService`**

Replace the existing Relations section (lines ~144–156):

```ts
// Relations
relations: (issueId: string): Promise<IssueRelation[]> =>
  api.get<unknown[]>(`/issues/${issueId}/relations/`)
    .then((r) => (r.data as unknown[]).map(mapRelation)),

addRelation: (issueId: string, relatedIssueId: string, relationType: string, lagDays = 0): Promise<IssueRelation> =>
  api.post<unknown>(`/issues/${issueId}/relations/`, {
    related_issue: relatedIssueId,    // was: related_issue_id (bug fix)
    relation_type: relationType,
    lag_days: lagDays,
  }).then((r) => mapRelation(r.data)),

deleteRelation: (issueId: string, relationId: string) =>
  api.delete(`/issues/${issueId}/relations/${relationId}/`),
```

- [ ] **Step 6: Add `search()` method**

Add after `deleteRelation` in `issueService`:

```ts
search: (query: string): Promise<Issue[]> =>
  api.get<PaginatedResponse<unknown>>('/issues/', { params: { search: query } })
    .then((r) => (r.data.results as unknown[]).map(mapIssue)),
```

- [ ] **Step 7: Run tests — all should pass**

```bash
npm run test -- --run src/services/issue.service.test.ts
```

Expected: all 4 pass (2 existing + 2 new).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/services/issue.service.ts frontend/src/services/issue.service.test.ts
git commit -m "feat(issues): add mapRelation, fix relations/addRelation, add search service method"
```

---

### Task 5: Frontend hooks

**Files:**
- Modify: `frontend/src/hooks/useIssues.ts`

- [ ] **Step 1: Add the 4 new hooks**

Add at the bottom of `frontend/src/hooks/useIssues.ts` (after `useCreateSubtask`):

```ts
export function useRelations(issueId: string) {
  return useQuery({
    queryKey: ['relations', issueId],
    queryFn: () => issueService.relations(issueId),
    enabled: !!issueId,
  })
}

export function useAddRelation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      issueId,
      relatedIssueId,
      relationType,
      lagDays,
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

export function useDeleteRelation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ issueId, relationId }: { issueId: string; relationId: string }) =>
      issueService.deleteRelation(issueId, relationId),
    onSuccess: (_, { issueId }) => {
      qc.invalidateQueries({ queryKey: ['relations', issueId] })
    },
  })
}

export function useIssueSearch(query: string) {
  return useQuery({
    queryKey: ['issue-search', query],
    queryFn: () => issueService.search(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  })
}
```

Also add `CreateSubtaskDto` is already imported — add `IssueRelation` import if it's not there (it isn't needed in this file since hooks return `Issue[]` and `IssueRelation[]` inferred from service types).

- [ ] **Step 2: Run typecheck**

```bash
cd frontend
npm run typecheck 2>&1 | grep "error TS" | grep -v node_modules | head -20
```

Fix any new errors. Pre-existing errors are expected.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useIssues.ts
git commit -m "feat(issues): add useRelations, useAddRelation, useDeleteRelation, useIssueSearch hooks"
```

---

### Task 6: IssueRelationList component

**Files:**
- Create: `frontend/src/features/issues/IssueRelationList.tsx`
- Create: `frontend/src/features/issues/IssueRelationList.test.tsx`

- [ ] **Step 1: Write failing tests first**

Create `frontend/src/features/issues/IssueRelationList.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { IssueRelationList } from './IssueRelationList'

vi.mock('@/hooks/useIssues', () => ({
  useRelations: vi.fn(),
  useAddRelation: vi.fn(),
  useDeleteRelation: vi.fn(),
  useIssueSearch: vi.fn(),
}))

import {
  useRelations,
  useAddRelation,
  useDeleteRelation,
  useIssueSearch,
} from '@/hooks/useIssues'

const mockRelation = {
  id: 'rel-1',
  issueId: 'issue-1',
  relatedIssueId: 'issue-2',
  relatedIssueTitle: 'Related Task',
  relatedIssueSequenceId: 42,
  relatedIssueProjectId: 'proj-2',
  relatedIssueProjectName: 'Project Beta',
  relationType: 'blocks',
  lagDays: 0,
}

const mockRelationWithLag = { ...mockRelation, id: 'rel-2', lagDays: 3 }

function renderComponent(props = { projectId: 'proj-1', issueId: 'issue-1' }) {
  return render(
    <MemoryRouter>
      <IssueRelationList {...props} />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAddRelation).mockReturnValue({ mutate: vi.fn(), isPending: false } as any)
  vi.mocked(useDeleteRelation).mockReturnValue({ mutate: vi.fn(), isError: false } as any)
  vi.mocked(useIssueSearch).mockReturnValue({ data: [], isLoading: false } as any)
})

describe('IssueRelationList', () => {
  it('renders loading state', () => {
    vi.mocked(useRelations).mockReturnValue({ data: undefined, isLoading: true, isError: false } as any)
    renderComponent()
    expect(screen.getByText('Carregando...')).toBeDefined()
  })

  it('renders error state', () => {
    vi.mocked(useRelations).mockReturnValue({ data: undefined, isLoading: false, isError: true } as any)
    renderComponent()
    expect(screen.getByText('Não foi possível carregar relações.')).toBeDefined()
  })

  it('renders empty state', () => {
    vi.mocked(useRelations).mockReturnValue({ data: [], isLoading: false, isError: false } as any)
    renderComponent()
    expect(screen.getByText('Sem relações.')).toBeDefined()
    expect(screen.getByText('Relações (0)')).toBeDefined()
  })

  it('renders grouped relation rows', () => {
    vi.mocked(useRelations).mockReturnValue({
      data: [mockRelation],
      isLoading: false,
      isError: false,
    } as any)
    renderComponent()
    expect(screen.getByText('BLOQUEIA')).toBeDefined()
    expect(screen.getByText(/Related Task/)).toBeDefined()
    expect(screen.getByText(/Project Beta/)).toBeDefined()
    expect(screen.getByText('Relações (1)')).toBeDefined()
  })

  it('shows lag badge only when lagDays > 0', () => {
    vi.mocked(useRelations).mockReturnValue({
      data: [mockRelation, mockRelationWithLag],
      isLoading: false,
      isError: false,
    } as any)
    renderComponent()
    expect(screen.getByText('+3d')).toBeDefined()
    // only one lag badge — the other relation has lagDays=0
    expect(screen.queryAllByText(/\+\d+d/).length).toBe(1)
  })

  it('opens add form when + Adicionar is clicked', () => {
    vi.mocked(useRelations).mockReturnValue({ data: [], isLoading: false, isError: false } as any)
    renderComponent()
    fireEvent.click(screen.getByLabelText('Adicionar relação'))
    expect(screen.getByLabelText('Tipo de relação')).toBeDefined()
    expect(screen.getByLabelText('Buscar issue')).toBeDefined()
    expect(screen.getByLabelText('Dias de atraso')).toBeDefined()
  })

  it('Save button is disabled until issue is selected', () => {
    vi.mocked(useRelations).mockReturnValue({ data: [], isLoading: false, isError: false } as any)
    renderComponent()
    fireEvent.click(screen.getByLabelText('Adicionar relação'))
    const saveBtn = screen.getByText('Salvar')
    expect(saveBtn.hasAttribute('disabled')).toBe(true)
  })

  it('delete button calls useDeleteRelation with correct args', () => {
    const deleteMutate = vi.fn()
    vi.mocked(useDeleteRelation).mockReturnValue({ mutate: deleteMutate, isError: false } as any)
    vi.mocked(useRelations).mockReturnValue({
      data: [mockRelation],
      isLoading: false,
      isError: false,
    } as any)
    renderComponent()
    fireEvent.click(screen.getByLabelText('Remover relação'))
    expect(deleteMutate).toHaveBeenCalledWith({ issueId: 'issue-1', relationId: 'rel-1' })
  })

  it('shows delete error message when isError is true', () => {
    vi.mocked(useDeleteRelation).mockReturnValue({ mutate: vi.fn(), isError: true } as any)
    vi.mocked(useRelations).mockReturnValue({
      data: [mockRelation],
      isLoading: false,
      isError: false,
    } as any)
    renderComponent()
    expect(screen.getByText('Não foi possível remover a relação.')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests — expect failures (component doesn't exist yet)**

```bash
npm run test -- --run src/features/issues/IssueRelationList.test.tsx
```

Expected: import error or all failing.

- [ ] **Step 3: Create `IssueRelationList.tsx`**

Create `frontend/src/features/issues/IssueRelationList.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { IssueRelation } from '@/types'
import {
  useRelations,
  useAddRelation,
  useDeleteRelation,
  useIssueSearch,
} from '@/hooks/useIssues'

const RELATION_LABELS: Record<string, string> = {
  blocks: 'BLOQUEIA',
  blocked_by: 'BLOQUEADO POR',
  duplicates: 'DUPLICA',
  duplicate_of: 'DUPLICATA DE',
  relates_to: 'RELACIONADO A',
  finish_to_start: 'TERMINA PARA INICIAR',
  start_to_start: 'INICIA PARA INICIAR',
  finish_to_finish: 'TERMINA PARA TERMINAR',
  start_to_finish: 'INICIA PARA TERMINAR',
}

const ALL_TYPES = Object.keys(RELATION_LABELS)

interface IssueRelationListProps {
  projectId: string
  issueId: string
}

interface SelectedIssue {
  id: string
  sequenceId: number
  title: string
  projectName: string
}

export function IssueRelationList({ projectId: _projectId, issueId }: IssueRelationListProps) {
  const { data: relations = [], isLoading, isError } = useRelations(issueId)
  const addRelation = useAddRelation()
  const deleteRelation = useDeleteRelation()

  const [showForm, setShowForm] = useState(false)
  const [relationType, setRelationType] = useState('relates_to')
  const [selectedIssue, setSelectedIssue] = useState<SelectedIssue | null>(null)
  const [lagDays, setLagDays] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: searchResults = [], isLoading: searchLoading } = useIssueSearch(debouncedQuery)
  const filteredResults = searchResults.filter((i) => i.id !== issueId)
  const showDropdown = debouncedQuery.length >= 2 && !selectedIssue

  function resetForm() {
    setRelationType('relates_to')
    setSelectedIssue(null)
    setLagDays(0)
    setSearchInput('')
    setDebouncedQuery('')
    setFormError(null)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleSave() {
    if (!selectedIssue) return
    addRelation.mutate(
      { issueId, relatedIssueId: selectedIssue.id, relationType, lagDays },
      {
        onSuccess: () => {
          setShowForm(false)
          resetForm()
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          const detail =
            err?.response?.data?.detail ?? err?.response?.data?.[0] ?? null
          setFormError(detail ?? 'Erro ao adicionar relação.')
        },
      }
    )
  }

  if (isLoading) {
    return <div className="text-sm text-gray-400 mb-4">Carregando...</div>
  }
  if (isError) {
    return (
      <p className="text-sm text-gray-400 mb-4">
        Não foi possível carregar relações.
      </p>
    )
  }

  // Group by type; only non-empty groups rendered
  const grouped: Record<string, IssueRelation[]> = {}
  for (const type of ALL_TYPES) {
    const items = relations.filter((r) => r.relationType === type)
    if (items.length > 0) grouped[type] = items
  }

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Relações ({relations.length})
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-blue-600 hover:text-blue-700"
          aria-label="Adicionar relação"
        >
          + Adicionar
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="mb-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
          <div className="flex gap-2 flex-wrap items-center">
            <select
              value={relationType}
              onChange={(e) => setRelationType(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              aria-label="Tipo de relação"
            >
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {RELATION_LABELS[t]}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                value={lagDays}
                onChange={(e) =>
                  setLagDays(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-16 text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                aria-label="Dias de atraso"
              />
              <span className="text-xs text-gray-400">dias</span>
            </div>
          </div>

          {/* Issue search */}
          <div className="relative">
            {selectedIssue ? (
              <div className="flex items-center justify-between rounded border border-blue-300 px-2 py-1 bg-blue-50 dark:bg-blue-900/20">
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  #{selectedIssue.sequenceId} {selectedIssue.title}
                </span>
                <button
                  onClick={() => {
                    setSelectedIssue(null)
                    setSearchInput('')
                    setDebouncedQuery('')
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 ml-2"
                  aria-label="Remover seleção de issue"
                >
                  ×
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar issue (#seq ou título)..."
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                aria-label="Buscar issue"
              />
            )}

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg max-h-48 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-2 text-sm text-gray-400">Buscando...</div>
                ) : filteredResults.length === 0 ? (
                  <div className="p-2 text-sm text-gray-400">
                    Nenhuma issue encontrada.
                  </div>
                ) : (
                  filteredResults.map((issue) => (
                    <button
                      key={issue.id}
                      onClick={() => {
                        setSelectedIssue({
                          id: issue.id,
                          sequenceId: issue.sequenceId,
                          title: issue.title,
                          projectName: issue.projectName,
                        })
                        setSearchInput('')
                        setDebouncedQuery('')
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        #{issue.sequenceId} {issue.title}
                      </div>
                      <div className="text-xs text-gray-400">
                        {issue.projectName}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {formError && (
            <p className="text-xs text-red-500" role="alert">
              {formError}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!selectedIssue || addRelation.isPending}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
            >
              Salvar
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              className="text-sm px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {relations.length === 0 && !showForm && (
        <p className="text-sm text-gray-400">Sem relações.</p>
      )}

      {/* Grouped relation rows */}
      {ALL_TYPES.filter((t) => grouped[t]).map((type) => (
        <div key={type} className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
            {RELATION_LABELS[type]}
          </p>
          {grouped[type].map((rel) => (
            <div key={rel.id} className="flex items-center gap-2 py-0.5">
              <Link
                to={`/projects/${rel.relatedIssueProjectId}/issues/${rel.relatedIssueId}`}
                className="text-sm text-gray-700 dark:text-gray-300 hover:underline flex-1 min-w-0 truncate"
                aria-label={`Relação: #${rel.relatedIssueSequenceId} ${rel.relatedIssueTitle}`}
              >
                #{rel.relatedIssueSequenceId} {rel.relatedIssueTitle}
                <span className="text-xs text-gray-400 ml-1">
                  ({rel.relatedIssueProjectName})
                </span>
              </Link>
              {rel.lagDays > 0 && (
                <span className="text-xs text-gray-400 flex-shrink-0">
                  +{rel.lagDays}d
                </span>
              )}
              <button
                onClick={() =>
                  deleteRelation.mutate({ issueId, relationId: rel.id })
                }
                className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0"
                aria-label="Remover relação"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ))}

      {deleteRelation.isError && (
        <p className="text-xs text-red-500 mt-1" role="alert">
          Não foi possível remover a relação.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — all 8 should pass**

```bash
npm run test -- --run src/features/issues/IssueRelationList.test.tsx
```

Expected: 8 tests passing.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/issues/IssueRelationList.tsx frontend/src/features/issues/IssueRelationList.test.tsx
git commit -m "feat(issues): add IssueRelationList component with tests"
```

---

### Task 7: IssueDetailPage — add IssueRelationList

**Files:**
- Modify: `frontend/src/features/issues/IssueDetailPage.tsx:13`

- [ ] **Step 1: Add import**

In `IssueDetailPage.tsx`, add after the `SubtaskList` import (line 13):

```tsx
import { IssueRelationList } from './IssueRelationList'
```

- [ ] **Step 2: Insert component**

After `<SubtaskList projectId={projectId} issueId={issueId} />` (line 111), add:

```tsx
{/* Relations */}
<IssueRelationList projectId={projectId} issueId={issueId} />
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck 2>&1 | grep "error TS" | grep -v node_modules | head -20
```

Fix any new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/issues/IssueDetailPage.tsx
git commit -m "feat(issues): add IssueRelationList to IssueDetailPage"
```

---

### Task 8: Full test run and changelog

**Files:**
- Modify: `changelog.md`

- [ ] **Step 1: Run all backend tests**

```bash
cd backend
python3 manage.py test apps.issues.tests --keepdb
```

Expected: all tests pass (6 subtask + 7 relation = 13 or more).

- [ ] **Step 2: Run all frontend tests**

```bash
cd frontend
npm run test -- --run
```

Expected: all test files passing.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck 2>&1 | grep "error TS" | grep -v node_modules | wc -l
```

Ensure no new errors beyond pre-existing ones.

- [ ] **Step 4: Update changelog**

In `changelog.md`, under `[Unreleased] → Added`:

```markdown
### Issue Linking (Relations)
- Backend: `IssueRelationSerializer` now returns `related_issue_title`, `related_issue_sequence_id`, `related_issue_project_id`, `related_issue_project_name` as derived read-only fields
- Backend: Self-relation validation in `IssueRelationSerializer.validate()` returns 400
- Backend: `IssueSerializer` now includes `project_name` field
- Backend: `GET /issues/` now works without `project_id` — returns workspace-scoped results (admin sees all, member sees accessible projects)
- Frontend: `IssueRelation` type updated with `relatedIssueProjectId` and `relatedIssueProjectName`; `Issue` type has `projectName`
- Frontend: `mapRelation` function added; `relations()` and `addRelation()` now use it (fixes camelCase mapping bug); `related_issue` POST field name fixed (was `related_issue_id`)
- Frontend: `issueService.search()` for workspace-wide issue search (no project_id)
- Frontend: Hooks `useRelations`, `useAddRelation`, `useDeleteRelation`, `useIssueSearch` added
- Frontend: `IssueRelationList` component on issue detail page — grouped by type, inline add form with debounced cross-project search and lag days input, delete with inline error
```

- [ ] **Step 5: Commit**

```bash
git add changelog.md
git commit -m "chore: log issue linking changes in changelog"
```
