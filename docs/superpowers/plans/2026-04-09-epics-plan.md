# Epics Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-class epic support — epics as issues with `type='epic'`, a dedicated Epics page, backlog epic-grouping mode, and colored epic badges throughout the UI.

**Architecture:** Epics reuse the existing `issues` table (`type='epic'`, existing `epic_id` FK). A `color` field is added via Django migration. `IssueSerializer` gains a writable `epic_id` field and a nested read-only `EpicSummarySerializer`. Two new read endpoints expose epic lists and epic children. The frontend adds an Epics page, a backlog grouping toggle, epic badges on board/backlog, and an epic selector in issue forms.

**Tech Stack:** Django 5.1 + DRF, React 18 + TypeScript + TanStack Query + Tailwind CSS, lucide-react

**Spec:** `docs/superpowers/specs/2026-04-09-epics-design.md`

---

## Chunk 1: Backend

### Task 1: Django migration — add `color` field to Issue

**Files:**
- Modify: `backend/apps/issues/models.py`
- Create: `backend/apps/issues/migrations/000X_add_issue_color.py` (auto-generated)
- Modify: `scripts/db/init.sql`

- [ ] **Step 1: Check the current migration state**

```bash
docker compose exec api python manage.py showmigrations issues
```

Note the latest migration number. The new one will be the next (e.g. `0002`).

The `epic` FK already uses `on_delete=models.SET_NULL` (confirmed in `models.py` line ~60). No change needed for that.

- [ ] **Step 2: Add `color` field to the Issue model**

Open `backend/apps/issues/models.py`. Find the `type` field (around line 30). Add `color` immediately after it:

```python
color = models.CharField(max_length=7, null=True, blank=True)
```

- [ ] **Step 3: Generate the migration**

```bash
docker compose exec api python manage.py makemigrations issues --name add_issue_color
```

Inspect the generated file in `backend/apps/issues/migrations/`. It must contain only `AddField` for `color` (and optionally an `AlterField` for `epic` on_delete if Step 1 showed it was wrong).

- [ ] **Step 4: Apply the migration**

```bash
docker compose exec api python manage.py migrate issues
```

Expected output: `Applying issues.000X_add_issue_color... OK`

- [ ] **Step 5: Update `scripts/db/init.sql` for fresh installs**

Find the `CREATE TABLE issues` block. Add after the `type` column:

```sql
    color VARCHAR(7) DEFAULT NULL,
```

- [ ] **Step 6: Verify**

```bash
docker compose exec api python manage.py shell -c "
from apps.issues.models import Issue
print(Issue._meta.get_field('color'))
"
```

Expected: `<django.db.models.fields.CharField: color>`

- [ ] **Step 7: Commit**

```bash
git add backend/apps/issues/models.py backend/apps/issues/migrations/ scripts/db/init.sql
git commit -m "feat(issues): add color field to Issue model"
```

---

### Task 2: `EpicSummarySerializer` and `EpicSerializer`

**Files:**
- Modify: `backend/apps/issues/serializers.py`

- [ ] **Step 1: Write the failing test**

Create `backend/apps/issues/tests/test_epics.py`:

```python
from django.test import TestCase
from rest_framework.test import APIClient
from apps.issues.models import Issue
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project, IssueState


def _make_workspace():
    ws = Workspace.objects.create(name='WS', slug='ws')
    member = WorkspaceMember.objects.create(
        workspace=ws, email='u@test.com', role='admin', display_name='U'
    )
    return ws, member


def _make_project(ws, member):
    proj = Project.objects.create(
        workspace=ws, name='Proj', identifier='PR', created_by=member
    )
    state = IssueState.objects.create(
        project=proj, name='Backlog', category='backlog', position=1
    )
    return proj, state


class EpicListTests(TestCase):
    def setUp(self):
        self.ws, self.member = _make_workspace()
        self.project, self.state = _make_project(self.ws, self.member)
        self.client = APIClient()
        self.client.force_authenticate(user=self.member)

    def _epic(self, title='Epic', **kw):
        return Issue.objects.create(
            project=self.project, title=title, state=self.state,
            type='epic', created_by=self.member, reporter=self.member, **kw
        )

    def _task(self, title='Task', epic=None, **kw):
        return Issue.objects.create(
            project=self.project, title=title, state=self.state,
            type='task', epic=epic, created_by=self.member, reporter=self.member, **kw
        )

    def test_list_returns_only_epics(self):
        epic = self._epic()
        self._task()  # should not appear
        r = self.client.get(f'/api/v1/projects/{self.project.id}/epics/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]['id'], str(epic.id))

    def test_child_count_and_completed_count(self):
        epic = self._epic()
        self._task(epic=epic)
        done_state = IssueState.objects.create(
            project=self.project, name='Done', category='completed',
            position=2, is_completed=True
        )
        Issue.objects.create(
            project=self.project, title='Done task', state=done_state,
            type='task', epic=epic, created_by=self.member, reporter=self.member
        )
        r = self.client.get(f'/api/v1/projects/{self.project.id}/epics/')
        self.assertEqual(r.data[0]['child_count'], 2)
        self.assertEqual(r.data[0]['completed_count'], 1)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose exec api python manage.py test apps.issues.tests.test_epics.EpicListTests.test_list_returns_only_epics
```

Expected: FAIL — no URL match yet.

- [ ] **Step 3: Add `EpicSummarySerializer` and `EpicSerializer` to `serializers.py`**

Open `backend/apps/issues/serializers.py`. After the `SubtaskSerializer` class and before `IssueSerializer`, insert:

```python
class EpicSummarySerializer(serializers.ModelSerializer):
    """Slim nested representation used for badge rendering (IssueSerializer.epic field)."""

    class Meta:
        model = Issue
        fields = ['id', 'sequence_id', 'title', 'color']


class EpicSerializer(serializers.ModelSerializer):
    """Full serializer used by the epics list endpoint."""

    child_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()
    state_name = serializers.CharField(source='state.name', read_only=True)
    state_color = serializers.CharField(source='state.color', read_only=True)
    assignee_name = serializers.SerializerMethodField()
    assignee_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            'id', 'sequence_id', 'title', 'color',
            'state', 'state_name', 'state_color',
            'assignee', 'assignee_name', 'assignee_avatar',
            'start_date', 'due_date', 'created_at',
            'child_count', 'completed_count',
        ]

    def get_child_count(self, obj):
        # Use queryset annotation from EpicListView if available (avoids N+1)
        if hasattr(obj, 'child_count'):
            return obj.child_count
        return Issue.objects.filter(epic=obj).count()

    def get_completed_count(self, obj):
        if hasattr(obj, 'completed_count'):
            return obj.completed_count
        return Issue.objects.filter(epic=obj, state__is_completed=True).count()

    def get_assignee_name(self, obj):
        return obj.assignee.display_name if obj.assignee else None

    def get_assignee_avatar(self, obj):
        return obj.assignee.avatar_url if obj.assignee else None
```

- [ ] **Step 4: Commit serializers (endpoints come next)**

```bash
git add backend/apps/issues/serializers.py
git commit -m "feat(issues): add EpicSummarySerializer and EpicSerializer"
```

---

### Task 3: Make `epic_id` writable in `IssueSerializer` + `color` field + validation

**Files:**
- Modify: `backend/apps/issues/serializers.py`

- [ ] **Step 1: Write failing validation tests**

Add to `backend/apps/issues/tests/test_epics.py`:

```python
class IssueEpicValidationTests(TestCase):
    def setUp(self):
        self.ws, self.member = _make_workspace()
        self.project, self.state = _make_project(self.ws, self.member)
        self.client = APIClient()
        self.client.force_authenticate(user=self.member)
        self.epic = Issue.objects.create(
            project=self.project, title='Epic', state=self.state,
            type='epic', created_by=self.member, reporter=self.member
        )

    def _post(self, payload):
        return self.client.post('/api/v1/issues/', payload, format='json')

    def test_create_issue_linked_to_epic(self):
        r = self._post({
            'project': str(self.project.id),
            'title': 'Child',
            'state': str(self.state.id),
            'type': 'task',
            'epic_id': str(self.epic.id),
        })
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['epic']['id'], str(self.epic.id))
        self.assertEqual(r.data['epic']['title'], 'Epic')

    def test_epic_cannot_have_epic_id(self):
        epic2 = Issue.objects.create(
            project=self.project, title='Epic2', state=self.state,
            type='epic', created_by=self.member, reporter=self.member
        )
        r = self._post({
            'project': str(self.project.id),
            'title': 'Bad',
            'state': str(self.state.id),
            'type': 'epic',
            'epic_id': str(self.epic.id),
        })
        self.assertEqual(r.status_code, 400)

    def test_subtask_cannot_have_epic_id(self):
        parent = Issue.objects.create(
            project=self.project, title='Parent', state=self.state,
            type='task', created_by=self.member, reporter=self.member
        )
        r = self._post({
            'project': str(self.project.id),
            'title': 'Sub',
            'state': str(self.state.id),
            'type': 'task',
            'parent': str(parent.id),
            'epic_id': str(self.epic.id),
        })
        self.assertEqual(r.status_code, 400)

    def test_cross_project_epic_rejected(self):
        ws2, m2 = _make_workspace()
        # make m2 a member of the same workspace so the client can reach it
        m2.workspace = self.ws
        m2.save()
        other_proj, other_state = _make_project(self.ws, self.member)
        other_epic = Issue.objects.create(
            project=other_proj, title='OtherEpic', state=other_state,
            type='epic', created_by=self.member, reporter=self.member
        )
        r = self._post({
            'project': str(self.project.id),
            'title': 'Issue',
            'state': str(self.state.id),
            'type': 'task',
            'epic_id': str(other_epic.id),
        })
        self.assertEqual(r.status_code, 400)

    def test_invalid_color_hex_rejected(self):
        r = self._post({
            'project': str(self.project.id),
            'title': 'Epic',
            'state': str(self.state.id),
            'type': 'epic',
            'color': 'notacolor',
        })
        self.assertEqual(r.status_code, 400)

    def test_valid_color_accepted(self):
        r = self._post({
            'project': str(self.project.id),
            'title': 'Colored Epic',
            'state': str(self.state.id),
            'type': 'epic',
            'color': '#6366f1',
        })
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['color'], '#6366f1')
```

- [ ] **Step 2: Run to confirm all fail**

```bash
docker compose exec api python manage.py test apps.issues.tests.test_epics.IssueEpicValidationTests
```

Expected: FAIL on all.

- [ ] **Step 3: Update `IssueSerializer` in `serializers.py`**

Add `import re` at the top of the file if not already present.

Inside `IssueSerializer` class body (before `class Meta`), add these field declarations:

```python
# Epic — read-only nested badge; writable FK counterpart (mirrors labels/label_ids pattern)
epic = EpicSummarySerializer(read_only=True)
epic_id = serializers.PrimaryKeyRelatedField(
    write_only=True,
    allow_null=True,
    required=False,
    queryset=Issue.objects.filter(type='epic'),
    source='epic',
)
# Color — only meaningful for type='epic'
color = serializers.CharField(max_length=7, allow_null=True, required=False)
```

In `class Meta`:
- Add `'epic'`, `'epic_id'`, `'color'` to the `fields` list. **`'epic_id'` must be in `fields` explicitly or DRF will ignore the explicit field declaration.**
- Remove `'epic'` from `read_only_fields` if present there (the explicit `EpicSummarySerializer(read_only=True)` declaration takes precedence, but leaving it in `read_only_fields` causes a conflict).

Add a `validate()` method to `IssueSerializer`:

```python
def validate(self, data):
    issue_type = data.get('type') or (self.instance.type if self.instance else None)
    epic = data.get('epic')        # resolved FK object (source='epic')
    parent = data.get('parent') or (self.instance.parent if self.instance else None)
    color = data.get('color')

    # Resolve project_id: 'project' in data is a Project instance on create;
    # on PATCH it may be absent so fall back to self.instance.project_id
    project_obj = data.get('project')
    project_id = (
        project_obj.id if project_obj is not None
        else (self.instance.project_id if self.instance else None)
    )

    # Rule 1: epics cannot belong to another epic
    if issue_type == 'epic' and epic is not None:
        raise serializers.ValidationError(
            {'epic_id': 'An epic cannot be linked to another epic.'}
        )

    # Rule 2: subtasks (have parent_id) cannot have an epic
    if parent is not None and epic is not None:
        raise serializers.ValidationError(
            {'epic_id': 'A subtask cannot be linked to an epic.'}
        )

    # Rule 3: cross-project epic assignment
    if epic is not None and project_id and str(epic.project_id) != str(project_id):
        raise serializers.ValidationError(
            {'epic_id': 'The epic must belong to the same project as the issue.'}
        )

    # Rule 4: changing type TO 'epic' while instance already has epic_id
    if (self.instance and self.instance.type != 'epic' and issue_type == 'epic'
            and self.instance.epic_id is not None and 'epic' not in data):
        raise serializers.ValidationError(
            {'type': 'Clear the epic assignment before changing this issue to epic type.'}
        )

    # Rule 5: changing type FROM 'epic' while children exist
    if (self.instance and self.instance.type == 'epic' and issue_type != 'epic'
            and Issue.objects.filter(epic=self.instance).exists()):
        raise serializers.ValidationError(
            {'type': 'Reassign all child issues before changing this epic\'s type.'}
        )

    # Rule 6: color must be valid 6-digit hex
    if color is not None and not re.match(r'^#[0-9A-Fa-f]{6}$', color):
        raise serializers.ValidationError(
            {'color': 'Color must be a valid hex color, e.g. #3B82F6.'}
        )

    return data
```

- [ ] **Step 4: Run the validation tests**

```bash
make sync-backend
docker compose exec api python manage.py test apps.issues.tests.test_epics.IssueEpicValidationTests
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/issues/serializers.py
git commit -m "feat(issues): add writable epic_id, color field, and validation to IssueSerializer"
```

---

### Task 4: Epic API endpoints

**Files:**
- Modify: `backend/apps/issues/views.py`
- Modify: `backend/apps/issues/urls.py`
- Modify: `backend/apps/projects/urls.py`

- [ ] **Step 1: Add `EpicListView` and `EpicIssuesView` to `views.py`**

Open `backend/apps/issues/views.py`. Add `EpicSerializer` to the serializer imports at the top:

```python
from .serializers import (
    IssueSerializer, IssueStateUpdateSerializer, IssueCommentSerializer,
    IssueActivitySerializer, IssueAttachmentSerializer, IssueRelationSerializer,
    EpicSerializer,
)
```

Also add `IsProjectViewer` to the permissions import at the top of `views.py` if not already imported:
```python
from core.permissions import IsWorkspaceMember, IsProjectViewer  # add IsProjectViewer
```

At the end of the file, add:

```python
from django.db.models import Count, Q

class EpicListView(generics.ListAPIView):
    """GET /api/v1/projects/{project_id}/epics/ — list all epics in a project."""
    serializer_class = EpicSerializer
    permission_classes = [IsProjectViewer]

    def get_queryset(self):
        # Annotate child_count and completed_count so EpicSerializer.get_child_count()
        # can read from the annotation (avoids N+1 queries).
        return Issue.objects.filter(
            project_id=self.kwargs['project_id'],
            type='epic',
        ).annotate(
            child_count=Count('epic_issues'),
            completed_count=Count(
                'epic_issues',
                filter=Q(epic_issues__state__is_completed=True),
            ),
        ).order_by('created_at')


class EpicIssuesView(generics.ListAPIView):
    """GET /api/v1/issues/{issue_pk}/epic-issues/ — list child issues of an epic."""
    serializer_class = IssueSerializer
    permission_classes = [IsProjectViewer]

    def get_queryset(self):
        epic = get_object_or_404(Issue, id=self.kwargs['issue_pk'], type='epic')
        return Issue.objects.filter(epic=epic).order_by('created_at')[:500]
```

Note: `epic_issues` is the `related_name` of the `epic` FK on `Issue` (confirmed at `models.py` line ~62). If the model uses a different `related_name`, update the annotation filter accordingly.

Verify `get_object_or_404` is imported at the top of `views.py`; if not, add:
```python
from django.shortcuts import get_object_or_404
```

- [ ] **Step 2: Register `EpicIssuesView` in `apps/issues/urls.py`**

Open `backend/apps/issues/urls.py`. Add to imports and to `urlpatterns`.

**Important:** Add the new `path()` entry **before** `path("", include(router.urls))` — DRF's router catch-all is at the end and must come last:

```python
from .views import (
    # existing...
    EpicIssuesView,
)

# In urlpatterns — BEFORE path("", include(router.urls)):
path('<uuid:issue_pk>/epic-issues/', EpicIssuesView.as_view(), name='epic-issues'),
```

- [ ] **Step 3: Register `EpicListView` in `apps/projects/urls.py`**

Open `backend/apps/projects/urls.py`. Add the import at the top of the file:

```python
from apps.issues.views import EpicListView
```

**Circular import check:** `apps.issues` imports from `apps.projects` (for project models). Adding `apps.projects.urls` importing from `apps.issues.views` creates a cross-app dependency. Django's URL conf loading is deferred, so this is generally safe as long as the import is at module level (not inside a function). If Django raises `ImportError: cannot import name` at startup, move the import inside a `urlpatterns` lazy-load pattern or register the view via `apps.issues.urls` instead. Verify the server starts cleanly after adding this import.

```python
# Add to urlpatterns in apps/projects/urls.py:
path('<uuid:project_id>/epics/', EpicListView.as_view(), name='project-epics'),
```

- [ ] **Step 4: Run all epic tests**

```bash
make sync-backend
docker compose exec api python manage.py test apps.issues.tests.test_epics
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/issues/views.py backend/apps/issues/urls.py backend/apps/projects/urls.py
git commit -m "feat(issues): add EpicListView and EpicIssuesView endpoints"
```

---

### Task 5: Additional backend tests

**Files:**
- Modify: `backend/apps/issues/tests/test_epics.py`

- [ ] **Step 1: Add tests for the epic-issues endpoint**

Add to `test_epics.py`:

```python
class EpicIssuesEndpointTests(TestCase):
    def setUp(self):
        self.ws, self.member = _make_workspace()
        self.project, self.state = _make_project(self.ws, self.member)
        self.client = APIClient()
        self.client.force_authenticate(user=self.member)
        self.epic = Issue.objects.create(
            project=self.project, title='Epic', state=self.state,
            type='epic', color='#6366f1', created_by=self.member, reporter=self.member
        )

    def test_returns_child_issues_only(self):
        child = Issue.objects.create(
            project=self.project, title='Child', state=self.state,
            type='task', epic=self.epic, created_by=self.member, reporter=self.member
        )
        Issue.objects.create(
            project=self.project, title='Unrelated', state=self.state,
            type='task', created_by=self.member, reporter=self.member
        )
        r = self.client.get(f'/api/v1/issues/{self.epic.id}/epic-issues/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]['id'], str(child.id))

    def test_returns_404_for_non_epic(self):
        task = Issue.objects.create(
            project=self.project, title='Task', state=self.state,
            type='task', created_by=self.member, reporter=self.member
        )
        r = self.client.get(f'/api/v1/issues/{task.id}/epic-issues/')
        self.assertEqual(r.status_code, 404)

    def test_issue_response_includes_nested_epic_object(self):
        r = self.client.post('/api/v1/issues/', {
            'project': str(self.project.id),
            'title': 'Child',
            'state': str(self.state.id),
            'type': 'task',
            'epic_id': str(self.epic.id),
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['epic']['id'], str(self.epic.id))
        self.assertEqual(r.data['epic']['title'], 'Epic')
        self.assertEqual(r.data['epic']['color'], '#6366f1')
```

- [ ] **Step 2: Run all epic tests**

```bash
docker compose exec api python manage.py test apps.issues.tests.test_epics
```

Expected: All pass.

- [ ] **Step 3: Run the full issue test suite to check for regressions**

```bash
docker compose exec api python manage.py test apps.issues
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add backend/apps/issues/tests/test_epics.py
git commit -m "test(issues): add epic endpoint and validation tests"
```

---

## Chunk 2: Frontend Foundation

### Task 6: TypeScript types

**Files:**
- Modify: `frontend/src/types/issue.ts`

- [ ] **Step 1: Add `EpicSummary` interface**

Open `frontend/src/types/issue.ts`. Add before the `Issue` interface:

```typescript
export interface EpicSummary {
  id: string
  sequenceId: number
  title: string
  color: string | null
}
```

- [ ] **Step 2: Update `Issue` interface**

Add these fields to the `Issue` interface:

```typescript
color: string | null
childCount: number
completedCount: number
epic: EpicSummary | null
```

- [ ] **Step 3: Update `CreateIssueDto`**

Add:

```typescript
epicId?: string | null
color?: string | null
```

- [ ] **Step 4: Update `UpdateIssueDto`**

Add:

```typescript
epicId?: string | null
color?: string | null
```

- [ ] **Step 5: Run typecheck — expect errors in service file (will fix next task)**

```bash
# In WSL:
cd ~/projecthub/frontend && source ~/.nvm/nvm.sh && nvm use --lts && npm run typecheck 2>&1 | head -30
```

Expected: Type errors only in `issue.service.ts` where `mapIssue` returns incomplete `Issue` objects. Note them; they will be fixed in Task 7.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/issue.ts
git commit -m "feat(issues): add EpicSummary type and epic fields to Issue interfaces"
```

---

### Task 7: Service functions and hooks

**Files:**
- Modify: `frontend/src/services/issue.service.ts`
- Modify: `frontend/src/hooks/useIssues.ts`

- [ ] **Step 1: Update `mapIssue()` in `issue.service.ts`**

Open `frontend/src/services/issue.service.ts`. Find the `mapIssue` function. Locate the line that maps the epic field:

```typescript
epicId: (raw.epic as string | null) ?? null,
```

Replace it with:

```typescript
epicId: (raw.epic as Record<string, unknown> | null)?.id as string ?? null,
epic: (() => {
  const e = raw.epic as Record<string, unknown> | null
  if (!e) return null
  return {
    id: e.id as string,
    sequenceId: e.sequence_id as number,
    title: e.title as string,
    color: e.color as string | null,
  }
})(),
color: (raw.color as string | null) ?? null,
childCount: (raw.child_count as number) ?? 0,
completedCount: (raw.completed_count as number) ?? 0,
```

- [ ] **Step 2: Add `getEpics` and `getEpicIssues` functions**

At the end of the service object (before the export), add:

```typescript
async getEpics(projectId: string): Promise<Issue[]> {
  const { data } = await api.get<Record<string, unknown>[]>(
    `/projects/${projectId}/epics/`
  )
  return data.map(mapIssue)
},

async getEpicIssues(epicId: string): Promise<Issue[]> {
  const { data } = await api.get<Record<string, unknown>[]>(
    `/issues/${epicId}/epic-issues/`
  )
  return data.map(mapIssue)
},
```

- [ ] **Step 3: Add `useEpics` and `useEpicIssues` hooks to `useIssues.ts`**

Open `frontend/src/hooks/useIssues.ts`. Add at the end of the file:

```typescript
export function useEpics(projectId: string | undefined) {
  return useQuery({
    queryKey: ['epics', projectId],
    queryFn: () => issueService.getEpics(projectId!),
    enabled: !!projectId,
  })
}

export function useEpicIssues(epicId: string | undefined) {
  return useQuery({
    queryKey: ['epic-issues', epicId],
    queryFn: () => issueService.getEpicIssues(epicId!),
    enabled: !!epicId,
  })
}
```

Also, in `useCreateIssue` and `useUpdateIssue`, add `['epics']` cache invalidation in `onSuccess`:

```typescript
// In useCreateIssue onSuccess:
queryClient.invalidateQueries({ queryKey: ['epics'] })

// In useUpdateIssue onSuccess:
queryClient.invalidateQueries({ queryKey: ['epics'] })
```

- [ ] **Step 4: Run typecheck — expect no errors now**

```bash
cd ~/projecthub/frontend && npm run typecheck 2>&1 | head -20
```

Expected: No type errors.

- [ ] **Step 5: Sync and commit**

```bash
make sync-frontend
git add frontend/src/services/issue.service.ts frontend/src/hooks/useIssues.ts
git commit -m "feat(issues): update mapIssue for nested epic, add getEpics/getEpicIssues and hooks"
```

---

### Task 8: `EpicBadge` and `EpicColorPicker` components

**Files:**
- Create: `frontend/src/features/issues/EpicBadge.tsx`
- Create: `frontend/src/features/epics/EpicColorPicker.tsx`

- [ ] **Step 1: Create `EpicBadge.tsx`**

Create `frontend/src/features/issues/EpicBadge.tsx`:

```tsx
import type { EpicSummary } from '@/types'

interface Props {
  epic: EpicSummary | null
  className?: string
}

export function EpicBadge({ epic, className }: Props) {
  if (!epic) return null
  const color = epic.color ?? '#6366f1'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${className ?? ''}`}
      style={{ backgroundColor: color + '22', color }}
    >
      ● {epic.title}
    </span>
  )
}
```

- [ ] **Step 2: Create the `epics/` directory and `EpicColorPicker.tsx`**

Create `frontend/src/features/epics/EpicColorPicker.tsx`:

```tsx
export const EPIC_PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#f97316', '#14b8a6', '#ec4899', '#84cc16',
]

interface Props {
  value: string | null
  onChange: (color: string) => void
}

export function EpicColorPicker({ value, onChange }: Props) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
        Cor
      </label>
      <div className="flex flex-wrap gap-1.5">
        {EPIC_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="h-5 w-5 rounded-full transition-transform hover:scale-110 focus:outline-none"
            style={{
              backgroundColor: color,
              outline: value === color ? `2px solid ${color}` : 'none',
              outlineOffset: '2px',
            }}
            title={color}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Sync and commit**

```bash
make sync-frontend
git add frontend/src/features/issues/EpicBadge.tsx frontend/src/features/epics/EpicColorPicker.tsx
git commit -m "feat(epics): add EpicBadge and EpicColorPicker components"
```

---

## Chunk 3: Frontend UI

### Task 9: `EpicDetail` and `EpicsPage`

**Files:**
- Create: `frontend/src/features/epics/EpicDetail.tsx`
- Create: `frontend/src/features/epics/EpicsPage.tsx`

- [ ] **Step 1: Create `EpicDetail.tsx`**

Create `frontend/src/features/epics/EpicDetail.tsx`:

```tsx
import { useState } from 'react'
import { useEpicIssues, useCreateIssue } from '@/hooks/useIssues'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { PageSpinner } from '@/components/ui/Spinner'
import { Plus } from 'lucide-react'
import type { Issue } from '@/types'

interface Props {
  epicId: string
  projectId: string
}

function groupByState(issues: Issue[]) {
  const map = new Map<string, { stateName: string; stateColor: string; issues: Issue[] }>()
  for (const issue of issues) {
    if (!map.has(issue.stateId)) {
      map.set(issue.stateId, { stateName: issue.stateName, stateColor: issue.stateColor, issues: [] })
    }
    map.get(issue.stateId)!.issues.push(issue)
  }
  return [...map.values()]
}

export function EpicDetail({ epicId, projectId }: Props) {
  const { data: issues = [], isLoading } = useEpicIssues(epicId)
  const create = useCreateIssue()
  const { workspace } = useWorkspaceStore()
  const [addingTitle, setAddingTitle] = useState('')

  if (isLoading) return <PageSpinner />

  const groups = groupByState(issues)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addingTitle.trim() || !workspace) return
    create.mutate(
      { workspaceId: workspace.id, data: { project: projectId, title: addingTitle.trim(), type: 'task', epicId } },
      { onSuccess: () => setAddingTitle('') },
    )
  }

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 pb-1">
      {issues.length === 0 && (
        <p className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">Nenhuma issue nesta épico.</p>
      )}
      {groups.map((g) => (
        <div key={g.stateName}>
          <div className="flex items-center gap-1.5 px-4 py-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.stateColor }} />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{g.stateName}</span>
          </div>
          {g.issues.map((issue) => (
            <div
              key={issue.id}
              className="flex items-center gap-2 px-6 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <span className="font-mono text-xs text-gray-400 dark:text-gray-500">#{issue.sequenceId}</span>
              <span className="truncate">{issue.title}</span>
            </div>
          ))}
        </div>
      ))}
      <form onSubmit={handleAdd} className="flex items-center gap-2 px-4 py-1.5">
        <Plus className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Adicionar issue..."
          value={addingTitle}
          onChange={(e) => setAddingTitle(e.target.value)}
          className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
        />
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Create `EpicsPage.tsx`**

Create `frontend/src/features/epics/EpicsPage.tsx`:

```tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useEpics } from '@/hooks/useIssues'
import { PageSpinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { IssueForm } from '@/features/issues/IssueForm'
import { EpicDetail } from './EpicDetail'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'
import type { Issue } from '@/types'

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {completed} de {total}
      </span>
    </div>
  )
}

function EpicCard({ epic, projectId }: { epic: Issue; projectId: string }) {
  const [expanded, setExpanded] = useState(false)
  const color = epic.color ?? '#6366f1'

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="h-5 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        {expanded
          ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
          : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
        }
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            <span className="mr-1.5 font-mono text-xs text-gray-400 dark:text-gray-500">
              #{epic.sequenceId}
            </span>
            {epic.title}
          </p>
        </div>
        <ProgressBar completed={epic.completedCount} total={epic.childCount} />
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: epic.stateColor + '22', color: epic.stateColor }}
        >
          {epic.stateName}
        </span>
      </div>
      {expanded && <EpicDetail epicId={epic.id} projectId={projectId} />}
    </div>
  )
}

export function EpicsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: epics = [], isLoading } = useEpics(projectId)
  const [creating, setCreating] = useState(false)

  if (isLoading) return <PageSpinner />

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Épicos</h1>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nova épico
        </Button>
      </div>

      {epics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center text-sm text-gray-400 dark:text-gray-500">
          Nenhuma épico criada.{' '}
          <button onClick={() => setCreating(true)} className="text-indigo-600 hover:underline">
            Criar a primeira.
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {epics.map((epic) => (
            <EpicCard key={epic.id} epic={epic} projectId={projectId!} />
          ))}
        </div>
      )}

      {creating && projectId && (
        <IssueForm
          projectId={projectId}
          open={creating}
          onClose={() => setCreating(false)}
          typeOverride="epic"
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Sync, typecheck, commit**

```bash
make sync-frontend
cd ~/projecthub/frontend && npm run typecheck 2>&1 | head -20
git add frontend/src/features/epics/EpicDetail.tsx frontend/src/features/epics/EpicsPage.tsx
git commit -m "feat(epics): add EpicsPage and EpicDetail components"
```

---

### Task 10: `IssueForm` — epic selector and color picker

**Files:**
- Modify: `frontend/src/features/issues/IssueForm.tsx`

The `IssueForm` already has a `typeOverride` prop. We need to add: (a) an epic selector dropdown shown when `type !== 'epic'`; (b) the `EpicColorPicker` shown when `type === 'epic'`; (c) pass `epicId` and `color` in the create/update payload.

- [ ] **Step 1: Add imports to `IssueForm.tsx`**

```tsx
import { useEpics } from '@/hooks/useIssues'
import { EpicColorPicker } from '@/features/epics/EpicColorPicker'
```

- [ ] **Step 2: Add `epicId` and `color` state**

Inside the form component, add:

```tsx
const [epicId, setEpicId] = useState<string | null>(issue?.epicId ?? null)
const [color, setColor] = useState<string | null>(issue?.color ?? '#6366f1')
```

- [ ] **Step 3: Fetch epics for the selector**

```tsx
const { data: epics = [] } = useEpics(projectId)
```

- [ ] **Step 4: Add epic selector in the form JSX**

Find where the form fields are rendered (state select, priority, etc.). Add after the type/size selectors, before the labels section:

```tsx
{/* Epic selector — hidden when creating an epic itself */}
{typeOverride !== 'epic' && (
  <div>
    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Épico</label>
    <select
      value={epicId ?? ''}
      onChange={(e) => setEpicId(e.target.value || null)}
      className="h-9 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    >
      <option value="">— Nenhum épico —</option>
      {epics.map((e) => (
        <option key={e.id} value={e.id}>#{e.sequenceId} {e.title}</option>
      ))}
    </select>
  </div>
)}

{/* Color picker — shown only when creating an epic */}
{typeOverride === 'epic' && (
  <EpicColorPicker value={color} onChange={setColor} />
)}
```

- [ ] **Step 5: Include `epicId` and `color` in the mutation payload**

Find the `handleSubmit` / create call. In the data object passed to `create.mutate` or `update.mutate`, add:

```typescript
// For create:
...(epicId ? { epicId } : {}),
...(typeOverride === 'epic' && color ? { color } : {}),

// For update (if form is editing an existing issue):
...(epicId !== (issue?.epicId ?? null) ? { epicId } : {}),
...(color !== (issue?.color ?? null) ? { color } : {}),
```

- [ ] **Step 6: Sync, typecheck, commit**

```bash
make sync-frontend
cd ~/projecthub/frontend && npm run typecheck 2>&1 | head -20
git add frontend/src/features/issues/IssueForm.tsx
git commit -m "feat(issues): add epic selector and color picker to IssueForm"
```

---

### Task 11: `BacklogPage` — epic grouping mode

**Files:**
- Modify: `frontend/src/features/backlog/BacklogPage.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { useEpics } from '@/hooks/useIssues'
import { EpicBadge } from '@/features/issues/EpicBadge'
```

- [ ] **Step 2: Add toggle state and epic data**

Inside `BacklogPage`, add:

```tsx
const [groupByEpic, setGroupByEpic] = useState(false)
const { data: epics = [] } = useEpics(groupByEpic ? projectId : undefined)
```

- [ ] **Step 3: Add toggle button to the toolbar**

Find where the existing toolbar/filter controls are. Add:

```tsx
<button
  onClick={() => setGroupByEpic((v) => !v)}
  className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
    groupByEpic
      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
  }`}
>
  Por épico
</button>
```

- [ ] **Step 4: Add `EpicBadge` to `IssueRow`**

Find the `IssueRow` component (or the equivalent inline row rendering). Add `<EpicBadge epic={issue.epic} />` next to the issue title or below it:

```tsx
<EpicBadge epic={issue.epic} className="mt-0.5" />
```

- [ ] **Step 5: Add epic grouping mode rendering**

Below the existing state-grouped view, add a conditional block. Filter out epics from the issue list (so epic issues don't appear as rows):

```tsx
const nonEpicIssues = (issues ?? []).filter((i) => i.type !== 'epic')
```

Then in the JSX:

```tsx
{groupByEpic ? (
  <div className="space-y-3">
    {[
      ...epics.map((epic) => ({
        id: epic.id,
        title: epic.title,
        color: epic.color,
        issues: nonEpicIssues.filter((i) => i.epicId === epic.id),
        completedCount: epic.completedCount,
        childCount: epic.childCount,
      })),
      {
        id: null,
        title: 'Sem épico',
        color: null,
        issues: nonEpicIssues.filter((i) => !i.epicId),
        completedCount: 0,
        childCount: 0,
      },
    ].map((group) => (
      <div key={group.id ?? 'no-epic'} className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: group.color ?? '#9ca3af' }}
          />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{group.title}</span>
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
            {group.issues.length} issue{group.issues.length !== 1 ? 's' : ''}
          </span>
        </div>
        {group.issues.length === 0 ? (
          <p className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">Nenhuma issue.</p>
        ) : (
          group.issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))
        )}
      </div>
    ))}
  </div>
) : (
  /* existing state-grouped JSX here (unchanged) */
  <ExistingView />
)}
```

Note: replace `<ExistingView />` with the actual existing state-grouped JSX block — do not delete it, just wrap it in the `else` branch.

- [ ] **Step 6: Sync, typecheck, commit**

```bash
make sync-frontend
cd ~/projecthub/frontend && npm run typecheck 2>&1 | head -20
git add frontend/src/features/backlog/BacklogPage.tsx
git commit -m "feat(backlog): add epic grouping toggle and EpicBadge on issue rows"
```

---

### Task 12: `BoardPage` — filter epics and add `EpicBadge` to cards

**Files:**
- Modify: `frontend/src/features/board/BoardPage.tsx`

- [ ] **Step 1: Add `EpicBadge` import**

```tsx
import { EpicBadge } from '@/features/issues/EpicBadge'
```

- [ ] **Step 2: Filter epics from board columns**

Find where the issues are fetched and columns built. After the issues are loaded, add:

```tsx
const boardIssues = (issues ?? []).filter((i) => i.type !== 'epic')
```

Use `boardIssues` instead of `issues` when grouping into columns.

- [ ] **Step 3: Add `EpicBadge` to `IssueCard`**

Find `IssueCard` (lines ~46-116). Inside the card body, after the title, add:

```tsx
<EpicBadge epic={issue.epic} className="mt-1" />
```

- [ ] **Step 4: Sync, typecheck, commit**

```bash
make sync-frontend
cd ~/projecthub/frontend && npm run typecheck 2>&1 | head -20
git add frontend/src/features/board/BoardPage.tsx
git commit -m "feat(board): filter epics from kanban, add EpicBadge to cards"
```

---

### Task 13: `IssueDetailPage` — epic field in sidebar

**Files:**
- Modify: `frontend/src/features/issues/IssueDetailPage.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { EpicBadge } from './EpicBadge'
import { useEpics, useUpdateIssue } from '@/hooks/useIssues'
```

- [ ] **Step 2: Add epic selector state and data**

Inside the component:

```tsx
const [editingEpic, setEditingEpic] = useState(false)
const { data: epics = [] } = useEpics(issue?.projectId)
const updateIssue = useUpdateIssue()
```

- [ ] **Step 3: Add epic row to the sidebar metadata section**

Find the sidebar section where state, priority, assignee, etc. are displayed. Add:

```tsx
<div className="flex items-center justify-between py-1.5">
  <span className="text-xs text-gray-500 dark:text-gray-400">Épico</span>
  {editingEpic ? (
    <select
      autoFocus
      defaultValue={issue.epicId ?? ''}
      onChange={(e) => {
        updateIssue.mutate(
          { projectId: issue.projectId, issueId: issue.id, data: { epicId: e.target.value || null } },
          { onSuccess: () => setEditingEpic(false) },
        )
      }}
      onBlur={() => setEditingEpic(false)}
      className="h-7 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-1 text-xs text-gray-900 dark:text-gray-100"
    >
      <option value="">— Nenhum —</option>
      {epics.map((e) => (
        <option key={e.id} value={e.id}>#{e.sequenceId} {e.title}</option>
      ))}
    </select>
  ) : (
    <button
      onClick={() => setEditingEpic(true)}
      className="rounded p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      {issue.epic
        ? <EpicBadge epic={issue.epic} />
        : <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
      }
    </button>
  )}
</div>
```

- [ ] **Step 4: Sync, typecheck, commit**

```bash
make sync-frontend
cd ~/projecthub/frontend && npm run typecheck 2>&1 | head -20
git add frontend/src/features/issues/IssueDetailPage.tsx
git commit -m "feat(issues): add epic field to issue detail sidebar"
```

---

### Task 14: `ProjectNav` tab and `App.tsx` route

**Files:**
- Modify: `frontend/src/components/layout/ProjectNav.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add `BookMarked` icon and Épicos tab to `ProjectNav.tsx`**

Open `frontend/src/components/layout/ProjectNav.tsx`.

Add `BookMarked` to the lucide-react import line.

Find the tabs array / link list. Add the Épicos tab **after the backlog entry**:

```tsx
{ to: 'epics', icon: BookMarked, label: 'Épicos' },
```

(Follow the exact same structure as the existing tab entries in the file.)

- [ ] **Step 2: Add the route to `App.tsx`**

Open `frontend/src/App.tsx`.

Add the import:

```tsx
import { EpicsPage } from '@/features/epics/EpicsPage'
```

Inside the `ProjectProvider` routes block, add after the backlog route:

```tsx
<Route path="epics" element={<EpicsPage />} />
```

- [ ] **Step 3: Sync, typecheck, commit**

```bash
make sync-frontend
cd ~/projecthub/frontend && npm run typecheck 2>&1 | head -20
git add frontend/src/components/layout/ProjectNav.tsx frontend/src/App.tsx
git commit -m "feat(epics): add Épicos tab to project nav and /epics route"
```

---

### Task 15: Final integration check

- [ ] **Step 1: Run full backend test suite**

```bash
docker compose exec api python manage.py test apps.issues
```

Expected: All tests pass, no regressions.

- [ ] **Step 2: Run frontend typecheck**

```bash
cd ~/projecthub/frontend && source ~/.nvm/nvm.sh && nvm use --lts && npm run typecheck
```

Expected: No type errors.

- [ ] **Step 3: Manual smoke test**

1. Navigate to any project → click "Épicos" tab
2. Create an epic — verify color picker appears, epic card shows in list
3. Open an issue from Backlog or Board — verify epic selector is present, populated, and works
4. Enable "Por épico" toggle in Backlog — verify epics appear as section headers, unlinked issues fall under "Sem épico"
5. Go to Board — verify epics are not shown as cards; linked issues show the EpicBadge
6. Open a linked issue → Detail page — verify the epic badge appears in sidebar and clicking it opens the selector

- [ ] **Step 4: Final sync**

```bash
make sync-frontend
make sync-backend
```
