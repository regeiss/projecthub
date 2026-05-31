# Resource Allocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full resource management module covering capacity planning, workload visibility, time entry logging, and automatic labour cost rollup to the portfolio.

**Architecture:** New `apps/resources` Django app (models, serializers, views, Celery task, signal). Workload is computed on-demand from `Issue.estimate_days` + `TimeEntry` rows; no stored aggregate. A 30-second debounced Celery task syncs labour cost to `PortfolioCostEntry` on every time entry change. Frontend adds two new pages (`ResourcesPage`, `ProjectResourcesPage`) plus a shared `WorkloadGrid` component.

**Tech Stack:** Django 5.1 + DRF + Celery (queue `default`) · React 18 + TypeScript + TanStack Query + Tailwind · existing `core/permissions.py` patterns

---

## File Map

### Backend — new files
| File | Responsibility |
|------|---------------|
| `apps/resources/__init__.py` | Package marker |
| `apps/resources/apps.py` | AppConfig, wires signals in `ready()` |
| `apps/resources/models.py` | ResourceProfile, MemberCapacity, TimeEntry |
| `apps/resources/admin.py` | Django admin registration |
| `apps/resources/serializers.py` | ResourceProfile, MemberCapacity, TimeEntry serializers |
| `apps/resources/utils.py` | `get_working_days()`, `compute_workload()` |
| `apps/resources/views.py` | All API views |
| `apps/resources/urls.py` | URL patterns |
| `apps/resources/tasks.py` | `sync_labor_costs` Celery task |
| `apps/resources/signals.py` | `post_save`/`post_delete` on TimeEntry |
| `apps/resources/tests/__init__.py` | Package marker |
| `apps/resources/tests/test_models.py` | Model constraint tests |
| `apps/resources/tests/test_views.py` | API endpoint tests |
| `apps/resources/tests/test_tasks.py` | Cost sync task tests |

### Backend — modified files
| File | Change |
|------|--------|
| `config/settings/base.py` | Add `apps.resources` to `LOCAL_APPS` |
| `config/urls.py` | Add `path("api/v1/resources/", ...)` |

### Frontend — new files
| File | Responsibility |
|------|---------------|
| `src/types/resource.ts` | ResourceProfile, MemberCapacity, TimeEntry, MemberWorkload TypeScript types |
| `src/services/resource.service.ts` | All API calls, snake_case → camelCase mapping |
| `src/hooks/useResources.ts` | TanStack Query hooks |
| `src/features/resources/WorkloadGrid.tsx` | Shared capacity bar + utilization table |
| `src/features/resources/ResourcesPage.tsx` | Workspace-wide workload page |
| `src/features/resources/ProjectResourcesPage.tsx` | Project-scoped workload + time entries |
| `src/features/resources/TimeEntriesTab.tsx` | Time entry table + delete |
| `src/features/resources/LogTimeModal.tsx` | Log time modal |

### Frontend — modified files
| File | Change |
|------|--------|
| `src/types/index.ts` | Re-export resource types |
| `src/App.tsx` | Add two new routes |
| `src/components/layout/ProjectNav.tsx` | Add Resources tab |
| `src/components/layout/Sidebar.tsx` | Add workspace resources nav item |

---

## Task 1: Backend models

**Files:**
- Create: `backend/apps/resources/__init__.py`
- Create: `backend/apps/resources/models.py`

- [ ] **Step 1: Create the package marker**

```bash
mkdir backend/apps/resources
touch backend/apps/resources/__init__.py
```

- [ ] **Step 2: Write `models.py`**

```python
# backend/apps/resources/models.py
import uuid
from django.db import models


class ResourceProfile(models.Model):
    """Daily rate for a workspace member on a specific project."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='resource_profiles'
    )
    member = models.ForeignKey(
        'workspaces.WorkspaceMember', on_delete=models.CASCADE, related_name='resource_profiles'
    )
    daily_rate_brl = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = 'resource_profiles'
        unique_together = [('project', 'member')]

    def __str__(self):
        return f'{self.member} @ {self.project} — R${self.daily_rate_brl}/dia'


class MemberCapacity(models.Model):
    """Available working days for a member in a calendar month."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(
        'workspaces.WorkspaceMember', on_delete=models.CASCADE, related_name='capacities'
    )
    year = models.IntegerField()
    month = models.IntegerField()  # 1–12
    available_days = models.DecimalField(max_digits=5, decimal_places=1)
    note = models.TextField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'member_capacities'
        unique_together = [('member', 'year', 'month')]

    def __str__(self):
        return f'{self.member} — {self.year}/{self.month:02d}: {self.available_days}d'


class TimeEntry(models.Model):
    """
    Actual hours logged by a member against an issue.
    Immutable: corrections are new entries with negative hours.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    issue = models.ForeignKey(
        'issues.Issue', on_delete=models.CASCADE, related_name='time_entries'
    )
    member = models.ForeignKey(
        'workspaces.WorkspaceMember', on_delete=models.PROTECT, related_name='time_entries'
    )
    date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2)  # may be negative
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'time_entries'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'{self.member} on {self.issue_id}: {self.hours}h @ {self.date}'
```

- [ ] **Step 3: Commit**

```bash
git add backend/apps/resources/
git commit -m "feat(resources): add ResourceProfile, MemberCapacity, TimeEntry models"
```

---

## Task 2: App registration and migrations

**Files:**
- Create: `backend/apps/resources/apps.py`
- Modify: `backend/config/settings/base.py`

- [ ] **Step 1: Create `apps.py`**

```python
# backend/apps/resources/apps.py
from django.apps import AppConfig


class ResourcesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.resources'

    def ready(self):
        import apps.resources.signals  # noqa: F401
```

- [ ] **Step 2: Register in INSTALLED_APPS**

In `backend/config/settings/base.py`, add `'apps.resources'` to `LOCAL_APPS` after `'apps.risks'`:

```python
LOCAL_APPS = [
    "apps.authentication",
    "apps.workspaces",
    "apps.projects",
    "apps.issues",
    "apps.cycles",
    "apps.modules",
    "apps.wiki",
    "apps.notifications",
    "apps.cpm",
    "apps.portfolio",
    "apps.milestones",
    "apps.risks",
    "apps.resources",   # ← add this line
]
```

- [ ] **Step 3: Create stub signals file so `ready()` doesn't crash**

```python
# backend/apps/resources/signals.py
# Signals wired in Task 7 after tasks.py exists.
```

- [ ] **Step 4: Run migrations**

```bash
cd backend
python manage.py makemigrations resources
python manage.py migrate
```

Expected output: `Migrations for 'resources': ... Created model ResourceProfile, MemberCapacity, TimeEntry`

- [ ] **Step 5: Commit**

```bash
git add backend/apps/resources/apps.py backend/apps/resources/signals.py
git add backend/config/settings/base.py
git add backend/apps/resources/migrations/
git commit -m "feat(resources): register app and generate migrations"
```

---

## Task 3: Admin and serializers

**Files:**
- Create: `backend/apps/resources/admin.py`
- Create: `backend/apps/resources/serializers.py`

- [ ] **Step 1: Write `admin.py`**

```python
# backend/apps/resources/admin.py
from django.contrib import admin
from .models import MemberCapacity, ResourceProfile, TimeEntry


@admin.register(ResourceProfile)
class ResourceProfileAdmin(admin.ModelAdmin):
    list_display = ['member', 'project', 'daily_rate_brl', 'created_at']
    list_filter = ['project']


@admin.register(MemberCapacity)
class MemberCapacityAdmin(admin.ModelAdmin):
    list_display = ['member', 'year', 'month', 'available_days']
    list_filter = ['year', 'month']


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ['member', 'issue', 'date', 'hours', 'created_at']
    list_filter = ['date', 'member']
```

- [ ] **Step 2: Write `serializers.py`**

```python
# backend/apps/resources/serializers.py
from rest_framework import serializers
from .models import MemberCapacity, ResourceProfile, TimeEntry


class ResourceProfileSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.name', read_only=True)
    member_avatar = serializers.CharField(source='member.avatar_url', read_only=True)

    class Meta:
        model = ResourceProfile
        fields = [
            'id', 'project', 'member', 'member_name', 'member_avatar',
            'daily_rate_brl', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        from apps.projects.models import ProjectMember
        project = data.get('project') or (self.instance.project if self.instance else None)
        member = data.get('member') or (self.instance.member if self.instance else None)
        if project and member:
            if not ProjectMember.objects.filter(project=project, member=member).exists():
                raise serializers.ValidationError(
                    {'member': 'Membro não pertence ao projeto.'}
                )
        return data


class MemberCapacitySerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.name', read_only=True)

    class Meta:
        model = MemberCapacity
        fields = ['id', 'member', 'member_name', 'year', 'month', 'available_days', 'note']
        read_only_fields = ['id']

    def validate(self, data):
        month = data.get('month')
        if month is not None and not (1 <= month <= 12):
            raise serializers.ValidationError({'month': 'Mês deve ser entre 1 e 12.'})
        return data


class TimeEntrySerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.name', read_only=True)
    member_avatar = serializers.CharField(source='member.avatar_url', read_only=True)
    issue_title = serializers.CharField(source='issue.title', read_only=True)
    issue_sequence_id = serializers.IntegerField(source='issue.sequence_id', read_only=True)
    project_id = serializers.UUIDField(source='issue.project_id', read_only=True)

    class Meta:
        model = TimeEntry
        fields = [
            'id', 'issue', 'issue_title', 'issue_sequence_id', 'project_id',
            'member', 'member_name', 'member_avatar',
            'date', 'hours', 'description', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
```

- [ ] **Step 3: Commit**

```bash
git add backend/apps/resources/admin.py backend/apps/resources/serializers.py
git commit -m "feat(resources): add admin registration and serializers"
```

---

## Task 4: ResourceProfile and MemberCapacity CRUD views + URLs

**Files:**
- Create: `backend/apps/resources/views.py` (partial — extended in Task 5 and 6)
- Create: `backend/apps/resources/urls.py`
- Modify: `backend/config/urls.py`
- Create: `backend/apps/resources/tests/__init__.py`
- Create: `backend/apps/resources/tests/test_views.py` (partial)

- [ ] **Step 1: Write failing tests for profile + capacity CRUD**

```python
# backend/apps/resources/tests/__init__.py
```

```python
# backend/apps/resources/tests/test_views.py
from rest_framework.test import APITestCase
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project, ProjectMember, IssueState
from apps.resources.models import MemberCapacity, ResourceProfile


def make_workspace():
    ws = Workspace.objects.create(name='WS', slug='ws-test')
    admin = WorkspaceMember.objects.create(
        workspace=ws, keycloak_sub='sub-admin', email='admin@x.com',
        name='Admin', role='admin',
    )
    return ws, admin


def make_project(ws, creator):
    project = Project.objects.create(
        workspace=ws, name='Proj', identifier='PRJ', created_by=creator,
    )
    ProjectMember.objects.create(project=project, member=creator, role='admin')
    return project


class ResourceProfileViewTest(APITestCase):
    def setUp(self):
        self.ws, self.admin = make_workspace()
        self.project = make_project(self.ws, self.admin)
        self.client.force_authenticate(user=self.admin)

    def test_create_profile(self):
        res = self.client.post('/api/v1/resources/profiles/', {
            'project': str(self.project.id),
            'member': str(self.admin.id),
            'daily_rate_brl': '350.00',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['daily_rate_brl'], '350.00')

    def test_create_profile_non_project_member_fails(self):
        other = WorkspaceMember.objects.create(
            workspace=self.ws, keycloak_sub='sub-2', email='b@x.com',
            name='Bob', role='member',
        )
        res = self.client.post('/api/v1/resources/profiles/', {
            'project': str(self.project.id),
            'member': str(other.id),
            'daily_rate_brl': '300.00',
        })
        self.assertEqual(res.status_code, 400)

    def test_list_profiles(self):
        ResourceProfile.objects.create(
            project=self.project, member=self.admin, daily_rate_brl='400.00'
        )
        res = self.client.get(f'/api/v1/resources/profiles/?project={self.project.id}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_update_profile(self):
        profile = ResourceProfile.objects.create(
            project=self.project, member=self.admin, daily_rate_brl='300.00'
        )
        res = self.client.patch(f'/api/v1/resources/profiles/{profile.id}/', {
            'daily_rate_brl': '450.00',
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['daily_rate_brl'], '450.00')


class MemberCapacityViewTest(APITestCase):
    def setUp(self):
        self.ws, self.admin = make_workspace()
        self.client.force_authenticate(user=self.admin)

    def test_create_capacity(self):
        res = self.client.post('/api/v1/resources/capacity/', {
            'member': str(self.admin.id),
            'year': 2026,
            'month': 4,
            'available_days': '20.0',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(float(res.data['available_days']), 20.0)

    def test_invalid_month_fails(self):
        res = self.client.post('/api/v1/resources/capacity/', {
            'member': str(self.admin.id),
            'year': 2026,
            'month': 13,
            'available_days': '20.0',
        })
        self.assertEqual(res.status_code, 400)
```

- [ ] **Step 2: Run tests — confirm they fail with 404 (routes not wired yet)**

```bash
cd backend
python manage.py test apps.resources.tests.test_views.ResourceProfileViewTest.test_create_profile -v 2
```

Expected: FAIL — `AssertionError: 404 != 201`

- [ ] **Step 3: Write views for ResourceProfile and MemberCapacity**

```python
# backend/apps/resources/views.py
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics, status

from core.permissions import IsWorkspaceMember
from core.permissions import _get_project_role, _ROLE_RANK

from .models import MemberCapacity, ResourceProfile, TimeEntry
from .serializers import (
    MemberCapacitySerializer,
    ResourceProfileSerializer,
    TimeEntrySerializer,
)


def _require_project_admin(user, project):
    rank = _ROLE_RANK.get(_get_project_role(user, project), 0)
    if rank < 3:
        raise PermissionDenied('Requer permissão de admin no projeto.')


# ---------------------------------------------------------------------------
# ResourceProfile
# ---------------------------------------------------------------------------

class ResourceProfileListCreateView(APIView):
    permission_classes = [IsWorkspaceMember]

    def get(self, request):
        qs = ResourceProfile.objects.select_related('member').filter(
            project__workspace=request.user.workspace
        )
        project_id = request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return Response(ResourceProfileSerializer(qs, many=True).data)

    def post(self, request):
        serializer = ResourceProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = serializer.validated_data['project']
        if str(project.workspace_id) != str(request.user.workspace_id):
            raise PermissionDenied()
        _require_project_admin(request.user, project)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ResourceProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ResourceProfileSerializer
    permission_classes = [IsWorkspaceMember]

    def get_queryset(self):
        return ResourceProfile.objects.filter(project__workspace=self.request.user.workspace)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        _require_project_admin(request.user, instance.project)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        _require_project_admin(request.user, instance.project)
        return super().destroy(request, *args, **kwargs)


# ---------------------------------------------------------------------------
# MemberCapacity
# ---------------------------------------------------------------------------

class MemberCapacityListCreateView(APIView):
    permission_classes = [IsWorkspaceMember]

    def get(self, request):
        qs = MemberCapacity.objects.select_related('member').filter(
            member__workspace=request.user.workspace
        )
        member_id = request.query_params.get('member')
        if member_id:
            qs = qs.filter(member_id=member_id)
        year = request.query_params.get('year')
        if year:
            qs = qs.filter(year=year)
        month = request.query_params.get('month')
        if month:
            qs = qs.filter(month=month)
        return Response(MemberCapacitySerializer(qs, many=True).data)

    def post(self, request):
        serializer = MemberCapacitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = serializer.validated_data['member']
        if str(member.workspace_id) != str(request.user.workspace_id):
            raise PermissionDenied()
        # Only workspace admin or the member themselves can set capacity
        if request.user.role != 'admin' and str(member.id) != str(request.user.id):
            raise PermissionDenied('Apenas admins podem definir capacidade de outros membros.')
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MemberCapacityDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MemberCapacitySerializer
    permission_classes = [IsWorkspaceMember]

    def get_queryset(self):
        return MemberCapacity.objects.filter(member__workspace=self.request.user.workspace)

    def _check_write(self, instance):
        if (self.request.user.role != 'admin' and
                str(instance.member_id) != str(self.request.user.id)):
            raise PermissionDenied('Apenas admins podem editar capacidade de outros membros.')

    def update(self, request, *args, **kwargs):
        self._check_write(self.get_object())
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._check_write(self.get_object())
        return super().destroy(request, *args, **kwargs)
```

- [ ] **Step 4: Write `urls.py` and wire into config**

```python
# backend/apps/resources/urls.py
from django.urls import path
from .views import (
    MemberCapacityDetailView,
    MemberCapacityListCreateView,
    ResourceProfileDetailView,
    ResourceProfileListCreateView,
)

urlpatterns = [
    path('profiles/', ResourceProfileListCreateView.as_view(), name='resource-profile-list'),
    path('profiles/<uuid:pk>/', ResourceProfileDetailView.as_view(), name='resource-profile-detail'),
    path('capacity/', MemberCapacityListCreateView.as_view(), name='member-capacity-list'),
    path('capacity/<uuid:pk>/', MemberCapacityDetailView.as_view(), name='member-capacity-detail'),
]
```

In `backend/config/urls.py`, add after portfolio line:

```python
path("api/v1/resources/",   include(("apps.resources.urls", "resources"))),
```

- [ ] **Step 5: Run the tests — confirm they pass**

```bash
cd backend
python manage.py test apps.resources.tests.test_views.ResourceProfileViewTest apps.resources.tests.test_views.MemberCapacityViewTest -v 2
```

Expected: all 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/apps/resources/views.py backend/apps/resources/urls.py
git add backend/apps/resources/tests/ backend/config/urls.py
git commit -m "feat(resources): ResourceProfile and MemberCapacity CRUD endpoints"
```

---

## Task 5: TimeEntry views

**Files:**
- Modify: `backend/apps/resources/views.py`
- Modify: `backend/apps/resources/urls.py`
- Modify: `backend/apps/resources/tests/test_views.py`

- [ ] **Step 1: Add failing tests**

Append to `backend/apps/resources/tests/test_views.py`:

```python
from apps.resources.models import TimeEntry
from apps.issues.models import Issue


def make_issue(project, creator, state):
    return Issue.objects.create(
        project=project,
        title='Test Issue',
        state=state,
        priority='none',
        reporter=creator,
    )


class TimeEntryViewTest(APITestCase):
    def setUp(self):
        self.ws, self.admin = make_workspace()
        self.project = make_project(self.ws, self.admin)
        self.state = IssueState.objects.create(
            project=self.project,
            name='Backlog',
            color='#aaa',
            category='backlog',
            sequence=1,
        )
        self.issue = make_issue(self.project, self.admin, self.state)
        self.client.force_authenticate(user=self.admin)

    def test_create_time_entry(self):
        res = self.client.post('/api/v1/resources/time-entries/', {
            'issue': str(self.issue.id),
            'member': str(self.admin.id),
            'date': '2026-04-14',
            'hours': '4.00',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['hours'], '4.00')

    def test_list_time_entries_filtered_by_issue(self):
        TimeEntry.objects.create(
            issue=self.issue, member=self.admin,
            date='2026-04-14', hours='3.00',
        )
        res = self.client.get(f'/api/v1/resources/time-entries/?issue={self.issue.id}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_delete_time_entry(self):
        entry = TimeEntry.objects.create(
            issue=self.issue, member=self.admin,
            date='2026-04-14', hours='2.00',
        )
        res = self.client.delete(f'/api/v1/resources/time-entries/{entry.id}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(TimeEntry.objects.filter(id=entry.id).exists())

    def test_member_cannot_delete_others_entry(self):
        other = WorkspaceMember.objects.create(
            workspace=self.ws, keycloak_sub='sub-3', email='c@x.com',
            name='Carol', role='member',
        )
        ProjectMember.objects.create(project=self.project, member=other, role='member')
        entry = TimeEntry.objects.create(
            issue=self.issue, member=self.admin,
            date='2026-04-14', hours='2.00',
        )
        self.client.force_authenticate(user=other)
        res = self.client.delete(f'/api/v1/resources/time-entries/{entry.id}/')
        self.assertEqual(res.status_code, 403)
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd backend
python manage.py test apps.resources.tests.test_views.TimeEntryViewTest.test_create_time_entry -v 2
```

Expected: FAIL — 404

- [ ] **Step 3: Add TimeEntry views to `views.py`**

Append to `backend/apps/resources/views.py`:

```python
# ---------------------------------------------------------------------------
# TimeEntry
# ---------------------------------------------------------------------------

class TimeEntryListCreateView(APIView):
    permission_classes = [IsWorkspaceMember]

    def get(self, request):
        qs = TimeEntry.objects.select_related('member', 'issue').filter(
            issue__project__workspace=request.user.workspace
        )
        issue_id = request.query_params.get('issue')
        if issue_id:
            qs = qs.filter(issue_id=issue_id)
        member_id = request.query_params.get('member')
        if member_id:
            qs = qs.filter(member_id=member_id)
        date_from = request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        date_to = request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(date__lte=date_to)
        project_id = request.query_params.get('project')
        if project_id:
            qs = qs.filter(issue__project_id=project_id)
        return Response(TimeEntrySerializer(qs, many=True).data)

    def post(self, request):
        serializer = TimeEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        issue = serializer.validated_data['issue']
        member = serializer.validated_data['member']
        if str(issue.project.workspace_id) != str(request.user.workspace_id):
            raise PermissionDenied()
        # Any member can log for themselves; project admin can log for others
        if str(member.id) != str(request.user.id):
            _require_project_admin(request.user, issue.project)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TimeEntryDestroyView(generics.DestroyAPIView):
    permission_classes = [IsWorkspaceMember]

    def get_queryset(self):
        return TimeEntry.objects.filter(issue__project__workspace=self.request.user.workspace)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        is_owner = str(instance.member_id) == str(request.user.id)
        is_project_admin = _ROLE_RANK.get(
            _get_project_role(request.user, instance.issue.project), 0
        ) >= 3
        if not (is_owner or is_project_admin):
            raise PermissionDenied('Apenas o autor ou admin do projeto pode excluir este apontamento.')
        return super().destroy(request, *args, **kwargs)
```

- [ ] **Step 4: Add URL entries**

In `backend/apps/resources/urls.py`, add the TimeEntry imports and patterns:

```python
from django.urls import path
from .views import (
    MemberCapacityDetailView,
    MemberCapacityListCreateView,
    ResourceProfileDetailView,
    ResourceProfileListCreateView,
    TimeEntryDestroyView,
    TimeEntryListCreateView,
)

urlpatterns = [
    path('profiles/', ResourceProfileListCreateView.as_view(), name='resource-profile-list'),
    path('profiles/<uuid:pk>/', ResourceProfileDetailView.as_view(), name='resource-profile-detail'),
    path('capacity/', MemberCapacityListCreateView.as_view(), name='member-capacity-list'),
    path('capacity/<uuid:pk>/', MemberCapacityDetailView.as_view(), name='member-capacity-detail'),
    path('time-entries/', TimeEntryListCreateView.as_view(), name='time-entry-list'),
    path('time-entries/<uuid:pk>/', TimeEntryDestroyView.as_view(), name='time-entry-destroy'),
]
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
cd backend
python manage.py test apps.resources.tests.test_views.TimeEntryViewTest -v 2
```

Expected: all 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/apps/resources/views.py backend/apps/resources/urls.py
git add backend/apps/resources/tests/test_views.py
git commit -m "feat(resources): TimeEntry list/create/delete endpoints"
```

---

## Task 6: Workload utility and views

**Files:**
- Create: `backend/apps/resources/utils.py`
- Modify: `backend/apps/resources/views.py`
- Modify: `backend/apps/resources/urls.py`
- Modify: `backend/apps/resources/tests/test_views.py`

- [ ] **Step 1: Write failing workload test**

Append to `backend/apps/resources/tests/test_views.py`:

```python
from apps.resources.models import TimeEntry


class WorkloadViewTest(APITestCase):
    def setUp(self):
        self.ws, self.admin = make_workspace()
        self.project = make_project(self.ws, self.admin)
        self.state = IssueState.objects.create(
            project=self.project, name='Backlog', color='#aaa',
            category='backlog', sequence=1,
        )
        MemberCapacity.objects.create(
            member=self.admin, year=2026, month=4, available_days='20.0'
        )
        self.client.force_authenticate(user=self.admin)

    def test_workspace_workload_returns_member(self):
        res = self.client.get('/api/v1/resources/workload/?period=2026-04')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['member_name'], 'Admin')
        self.assertAlmostEqual(res.data[0]['available_days'], 20.0)

    def test_project_workload(self):
        res = self.client.get(
            f'/api/v1/resources/projects/{self.project.id}/workload/?period=2026-04'
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data[0]['member_name'], 'Admin')
```

- [ ] **Step 2: Run test — confirm fail**

```bash
cd backend
python manage.py test apps.resources.tests.test_views.WorkloadViewTest.test_workspace_workload_returns_member -v 2
```

Expected: FAIL — 404

- [ ] **Step 3: Write `utils.py`**

```python
# backend/apps/resources/utils.py
import calendar
from datetime import date, timedelta
from decimal import Decimal

from django.db import models as db_models


def get_working_days(start: date, end: date) -> int:
    """Count Mon–Fri days between start and end inclusive."""
    count = 0
    current = start
    while current <= end:
        if current.weekday() < 5:
            count += 1
        current += timedelta(days=1)
    return count


def compute_workload(members, period_start: date, period_end: date, project=None) -> list:
    """
    Compute workload rows for a queryset/list of WorkspaceMember instances.
    project: optional Project instance to scope planned days and actual hours.
    """
    from apps.issues.models import Issue
    from .models import MemberCapacity, ResourceProfile, TimeEntry

    year = period_start.year
    month = period_start.month
    _, last_day = calendar.monthrange(year, month)
    month_start = date(year, month, 1)
    month_end = date(year, month, last_day)
    month_working = get_working_days(month_start, month_end)
    period_working = get_working_days(period_start, period_end)

    result = []
    for member in members:
        # Capacity — slice monthly by period ratio
        try:
            cap = MemberCapacity.objects.get(member=member, year=year, month=month)
            if month_working > 0:
                available = cap.available_days * Decimal(period_working) / Decimal(month_working)
            else:
                available = cap.available_days
        except MemberCapacity.DoesNotExist:
            available = None

        # Planned days
        issue_qs = Issue.objects.filter(assignee=member)
        if project:
            issue_qs = issue_qs.filter(project=project)
        else:
            issue_qs = issue_qs.filter(project__workspace_id=member.workspace_id)

        planned_issues = issue_qs.filter(
            db_models.Q(due_date__range=(period_start, period_end)) |
            db_models.Q(
                due_date__isnull=True,
                state__category__in=['backlog', 'unstarted', 'started'],
            )
        )
        planned_days = (
            planned_issues.aggregate(total=db_models.Sum('estimate_days'))['total']
            or Decimal('0')
        )

        # Actual days from time entries
        te_qs = TimeEntry.objects.filter(
            member=member,
            date__range=(period_start, period_end),
        )
        if project:
            te_qs = te_qs.filter(issue__project=project)
        else:
            te_qs = te_qs.filter(issue__project__workspace_id=member.workspace_id)

        actual_hours = (
            te_qs.aggregate(total=db_models.Sum('hours'))['total'] or Decimal('0')
        )
        actual_days = actual_hours / Decimal('8')

        # Rate and cost
        if project:
            profile = ResourceProfile.objects.filter(project=project, member=member).first()
        else:
            profile = None

        daily_rate = profile.daily_rate_brl if profile else None
        planned_cost = float(planned_days) * float(daily_rate) if daily_rate else None
        actual_cost = float(actual_days) * float(daily_rate) if daily_rate else None
        utilization_pct = (
            round(float(actual_days / available * 100), 1) if available else None
        )

        result.append({
            'member_id': str(member.id),
            'member_name': member.name,
            'member_avatar': member.avatar_url,
            'available_days': float(available) if available is not None else None,
            'planned_days': float(planned_days),
            'actual_days': float(actual_days),
            'utilization_pct': utilization_pct,
            'daily_rate_brl': str(daily_rate) if daily_rate else None,
            'planned_cost': planned_cost,
            'actual_cost': actual_cost,
        })

    return result
```

- [ ] **Step 4: Add workload views to `views.py`**

Append to `backend/apps/resources/views.py`:

```python
import calendar
from datetime import date as date_type

from .utils import compute_workload


def _parse_period(period_param):
    """Parse 'YYYY-MM' string. Returns (period_start, period_end) or raises ValueError."""
    year = int(period_param[:4])
    month = int(period_param[5:7])
    _, last_day = calendar.monthrange(year, month)
    return date_type(year, month, 1), date_type(year, month, last_day)


def _period_from_request(request):
    """Return (period_start, period_end) from query params or current month."""
    cycle_id = request.query_params.get('cycle_id')
    period_param = request.query_params.get('period')

    if cycle_id:
        from apps.cycles.models import Cycle
        try:
            cycle = Cycle.objects.get(pk=cycle_id)
        except Cycle.DoesNotExist:
            raise NotFound('Ciclo não encontrado.')
        return cycle.start_date, cycle.end_date

    if period_param:
        try:
            return _parse_period(period_param)
        except (ValueError, IndexError):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'period': 'Use o formato YYYY-MM.'})

    today = date_type.today()
    _, last_day = calendar.monthrange(today.year, today.month)
    return date_type(today.year, today.month, 1), date_type(today.year, today.month, last_day)


class WorkspaceWorkloadView(APIView):
    permission_classes = [IsWorkspaceMember]

    def get(self, request):
        from apps.workspaces.models import WorkspaceMember
        period_start, period_end = _period_from_request(request)
        members = WorkspaceMember.objects.filter(
            workspace=request.user.workspace, is_active=True
        )
        return Response(compute_workload(members, period_start, period_end))


class ProjectWorkloadView(APIView):
    permission_classes = [IsWorkspaceMember]

    def get(self, request, project_pk):
        from apps.projects.models import Project
        from apps.workspaces.models import WorkspaceMember
        try:
            project = Project.objects.get(pk=project_pk, workspace=request.user.workspace)
        except Project.DoesNotExist:
            raise NotFound('Projeto não encontrado.')

        period_start, period_end = _period_from_request(request)
        members = WorkspaceMember.objects.filter(
            project_memberships__project=project, is_active=True
        ).distinct()
        return Response(compute_workload(members, period_start, period_end, project=project))
```

- [ ] **Step 5: Add workload URLs**

Replace `backend/apps/resources/urls.py` entirely:

```python
from django.urls import path
from .views import (
    MemberCapacityDetailView,
    MemberCapacityListCreateView,
    ProjectWorkloadView,
    ResourceProfileDetailView,
    ResourceProfileListCreateView,
    TimeEntryDestroyView,
    TimeEntryListCreateView,
    WorkspaceWorkloadView,
)

urlpatterns = [
    path('profiles/', ResourceProfileListCreateView.as_view(), name='resource-profile-list'),
    path('profiles/<uuid:pk>/', ResourceProfileDetailView.as_view(), name='resource-profile-detail'),
    path('capacity/', MemberCapacityListCreateView.as_view(), name='member-capacity-list'),
    path('capacity/<uuid:pk>/', MemberCapacityDetailView.as_view(), name='member-capacity-detail'),
    path('time-entries/', TimeEntryListCreateView.as_view(), name='time-entry-list'),
    path('time-entries/<uuid:pk>/', TimeEntryDestroyView.as_view(), name='time-entry-destroy'),
    path('workload/', WorkspaceWorkloadView.as_view(), name='workspace-workload'),
    path('projects/<uuid:project_pk>/workload/', ProjectWorkloadView.as_view(), name='project-workload'),
]
```

- [ ] **Step 6: Run all resource tests**

```bash
cd backend
python manage.py test apps.resources.tests.test_views -v 2
```

Expected: all 11 tests PASS

- [ ] **Step 7: Commit**

```bash
git add backend/apps/resources/utils.py backend/apps/resources/views.py
git add backend/apps/resources/urls.py backend/apps/resources/tests/test_views.py
git commit -m "feat(resources): workload computation utility and views"
```

---

## Task 7: Celery task and signal for cost sync

**Files:**
- Create: `backend/apps/resources/tasks.py`
- Modify: `backend/apps/resources/signals.py`
- Create: `backend/apps/resources/tests/test_tasks.py`

- [ ] **Step 1: Write failing task test**

```python
# backend/apps/resources/tests/test_tasks.py
from django.test import TestCase
from unittest.mock import patch
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project, ProjectMember, IssueState
from apps.issues.models import Issue
from apps.portfolio.models import Portfolio, PortfolioProject
from apps.resources.models import ResourceProfile, TimeEntry
from apps.resources.tasks import sync_labor_costs


def _setup_world():
    ws = Workspace.objects.create(name='WS', slug='ws-t2')
    admin = WorkspaceMember.objects.create(
        workspace=ws, keycloak_sub='sub-t2', email='t2@x.com', name='T2', role='admin',
    )
    project = Project.objects.create(
        workspace=ws, name='P', identifier='PP', created_by=admin,
    )
    ProjectMember.objects.create(project=project, member=admin, role='admin')
    state = IssueState.objects.create(
        project=project, name='Backlog', color='#aaa', category='backlog', sequence=1,
    )
    issue = Issue.objects.create(
        project=project, title='T', state=state, priority='none', reporter=admin,
    )
    portfolio = Portfolio.objects.create(workspace=ws, name='Port', owner=admin)
    pp = PortfolioProject.objects.create(portfolio=portfolio, project=project)
    ResourceProfile.objects.create(project=project, member=admin, daily_rate_brl='400.00')
    return issue, admin, pp


class SyncLaborCostsTest(TestCase):
    def test_creates_cost_entry(self):
        issue, admin, pp = _setup_world()
        TimeEntry.objects.create(issue=issue, member=admin, date='2026-04-10', hours='8.00')

        sync_labor_costs(str(issue.id), 2026, 4)

        from apps.portfolio.models import PortfolioCostEntry
        entry = PortfolioCostEntry.objects.get(portfolio_project=pp, category='labor')
        self.assertAlmostEqual(float(entry.amount), 400.00, places=2)
        self.assertEqual(entry.description, 'Auto: mão de obra 2026-04')

    def test_updates_existing_auto_entry(self):
        issue, admin, pp = _setup_world()
        TimeEntry.objects.create(issue=issue, member=admin, date='2026-04-10', hours='8.00')
        sync_labor_costs(str(issue.id), 2026, 4)

        TimeEntry.objects.create(issue=issue, member=admin, date='2026-04-11', hours='8.00')
        sync_labor_costs(str(issue.id), 2026, 4)

        from apps.portfolio.models import PortfolioCostEntry
        entries = PortfolioCostEntry.objects.filter(portfolio_project=pp, category='labor')
        self.assertEqual(entries.count(), 1)
        self.assertAlmostEqual(float(entries.first().amount), 800.00, places=2)

    def test_no_portfolio_project_exits_silently(self):
        ws = Workspace.objects.create(name='WS2', slug='ws-t3')
        admin = WorkspaceMember.objects.create(
            workspace=ws, keycloak_sub='sub-t3', email='t3@x.com', name='T3', role='admin',
        )
        project = Project.objects.create(
            workspace=ws, name='P2', identifier='P2', created_by=admin,
        )
        state = IssueState.objects.create(
            project=project, name='Backlog', color='#bbb', category='backlog', sequence=1,
        )
        issue = Issue.objects.create(
            project=project, title='T', state=state, priority='none', reporter=admin,
        )
        # No PortfolioProject — should not raise
        sync_labor_costs(str(issue.id), 2026, 4)
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
cd backend
python manage.py test apps.resources.tests.test_tasks.SyncLaborCostsTest.test_creates_cost_entry -v 2
```

Expected: FAIL — `ImportError: cannot import name 'sync_labor_costs'`

- [ ] **Step 3: Write `tasks.py`**

```python
# backend/apps/resources/tasks.py
import calendar
from datetime import date
from decimal import Decimal

from celery import shared_task


@shared_task(queue='default')
def sync_labor_costs(issue_id: str, year: int, month: int):
    """
    Aggregate TimeEntry hours for (project, year, month) and upsert a
    PortfolioCostEntry(category='labor') for the portfolio project.
    Idempotent: deletes and recreates the auto entry each run.
    """
    from apps.issues.models import Issue
    from apps.portfolio.models import PortfolioCostEntry, PortfolioProject
    from .models import ResourceProfile, TimeEntry

    try:
        issue = Issue.objects.select_related('project').get(id=issue_id)
    except Issue.DoesNotExist:
        return

    project = issue.project
    portfolio_project = PortfolioProject.objects.filter(project=project).first()
    if not portfolio_project:
        return

    entries = (
        TimeEntry.objects
        .filter(issue__project=project, date__year=year, date__month=month)
        .select_related('member')
    )

    total_cost = Decimal('0')
    for entry in entries:
        profile = ResourceProfile.objects.filter(project=project, member=entry.member).first()
        if profile:
            total_cost += (entry.hours / Decimal('8')) * profile.daily_rate_brl

    _, last_day = calendar.monthrange(year, month)
    entry_date = date(year, month, last_day)
    description = f'Auto: mão de obra {year:04d}-{month:02d}'

    # Delete previous auto entry for this month then recreate
    PortfolioCostEntry.objects.filter(
        portfolio_project=portfolio_project,
        date=entry_date,
        category='labor',
        description=description,
    ).delete()

    if total_cost > 0:
        PortfolioCostEntry.objects.create(
            portfolio_project=portfolio_project,
            date=entry_date,
            category='labor',
            amount=total_cost,
            description=description,
            created_by=None,
        )
```

- [ ] **Step 4: Run task tests — confirm they pass**

```bash
cd backend
python manage.py test apps.resources.tests.test_tasks -v 2
```

Expected: all 3 tests PASS

- [ ] **Step 5: Wire the signal**

Replace `backend/apps/resources/signals.py`:

```python
# backend/apps/resources/signals.py
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import TimeEntry


@receiver(post_save, sender=TimeEntry)
@receiver(post_delete, sender=TimeEntry)
def trigger_sync_labor_costs(sender, instance, **kwargs):
    from .tasks import sync_labor_costs
    sync_labor_costs.apply_async(
        kwargs={
            'issue_id': str(instance.issue_id),
            'year': instance.date.year,
            'month': instance.date.month,
        },
        countdown=30,
    )
```

- [ ] **Step 6: Run full resource test suite**

```bash
cd backend
python manage.py test apps.resources -v 2
```

Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add backend/apps/resources/tasks.py backend/apps/resources/signals.py
git add backend/apps/resources/tests/test_tasks.py
git commit -m "feat(resources): sync_labor_costs Celery task and TimeEntry signal"
```

---

## Task 8: Frontend types and service

**Files:**
- Create: `frontend/src/types/resource.ts`
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/services/resource.service.ts`

- [ ] **Step 1: Write `types/resource.ts`**

```typescript
// frontend/src/types/resource.ts

export interface ResourceProfile {
  id: string
  project: string
  member: string
  memberName: string
  memberAvatar: string | null
  dailyRateBrl: string
  createdAt: string
  updatedAt: string
}

export interface MemberCapacity {
  id: string
  member: string
  memberName: string
  year: number
  month: number
  availableDays: number
  note: string | null
}

export interface TimeEntry {
  id: string
  issue: string
  issueTitle: string
  issueSequenceId: number
  projectId: string
  member: string
  memberName: string
  memberAvatar: string | null
  date: string
  hours: number
  description: string | null
  createdAt: string
}

export interface MemberWorkload {
  memberId: string
  memberName: string
  memberAvatar: string | null
  availableDays: number | null
  plannedDays: number
  actualDays: number
  utilizationPct: number | null
  dailyRateBrl: string | null
  plannedCost: number | null
  actualCost: number | null
}

export interface CreateResourceProfileDto {
  project: string
  member: string
  dailyRateBrl: string
}

export interface CreateTimeEntryDto {
  issue: string
  member: string
  date: string
  hours: number
  description?: string
}

export interface UpsertCapacityDto {
  member: string
  year: number
  month: number
  availableDays: number
  note?: string
}

export interface WorkloadParams {
  period?: string    // 'YYYY-MM'
  cycleId?: string
}
```

- [ ] **Step 2: Export from `types/index.ts`**

Add at the end of `frontend/src/types/index.ts`:

```typescript
export * from './resource'
```

- [ ] **Step 3: Write `resource.service.ts`**

```typescript
// frontend/src/services/resource.service.ts
import api from '@/lib/axios'
import type {
  CreateResourceProfileDto,
  CreateTimeEntryDto,
  MemberCapacity,
  MemberWorkload,
  ResourceProfile,
  TimeEntry,
  UpsertCapacityDto,
  WorkloadParams,
} from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(r: any): ResourceProfile {
  return {
    id: r.id,
    project: r.project,
    member: r.member,
    memberName: r.member_name,
    memberAvatar: r.member_avatar ?? null,
    dailyRateBrl: r.daily_rate_brl,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCapacity(r: any): MemberCapacity {
  return {
    id: r.id,
    member: r.member,
    memberName: r.member_name,
    year: r.year,
    month: r.month,
    availableDays: parseFloat(r.available_days),
    note: r.note ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTimeEntry(r: any): TimeEntry {
  return {
    id: r.id,
    issue: r.issue,
    issueTitle: r.issue_title,
    issueSequenceId: r.issue_sequence_id,
    projectId: r.project_id,
    member: r.member,
    memberName: r.member_name,
    memberAvatar: r.member_avatar ?? null,
    date: r.date,
    hours: parseFloat(r.hours),
    description: r.description ?? null,
    createdAt: r.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWorkload(r: any): MemberWorkload {
  return {
    memberId: r.member_id,
    memberName: r.member_name,
    memberAvatar: r.member_avatar ?? null,
    availableDays: r.available_days ?? null,
    plannedDays: r.planned_days,
    actualDays: r.actual_days,
    utilizationPct: r.utilization_pct ?? null,
    dailyRateBrl: r.daily_rate_brl ?? null,
    plannedCost: r.planned_cost ?? null,
    actualCost: r.actual_cost ?? null,
  }
}

export const resourceService = {
  // --- ResourceProfile ---
  listProfiles(projectId?: string): Promise<ResourceProfile[]> {
    const params = projectId ? { project: projectId } : {}
    return api.get('/resources/profiles/', { params }).then(r => r.data.map(mapProfile))
  },
  createProfile(dto: CreateResourceProfileDto): Promise<ResourceProfile> {
    return api.post('/resources/profiles/', {
      project: dto.project,
      member: dto.member,
      daily_rate_brl: dto.dailyRateBrl,
    }).then(r => mapProfile(r.data))
  },
  updateProfile(id: string, dailyRateBrl: string): Promise<ResourceProfile> {
    return api.patch(`/resources/profiles/${id}/`, {
      daily_rate_brl: dailyRateBrl,
    }).then(r => mapProfile(r.data))
  },
  deleteProfile(id: string): Promise<void> {
    return api.delete(`/resources/profiles/${id}/`)
  },

  // --- MemberCapacity ---
  listCapacity(params?: { member?: string; year?: number; month?: number }): Promise<MemberCapacity[]> {
    return api.get('/resources/capacity/', { params }).then(r => r.data.map(mapCapacity))
  },
  createCapacity(dto: UpsertCapacityDto): Promise<MemberCapacity> {
    return api.post('/resources/capacity/', {
      member: dto.member,
      year: dto.year,
      month: dto.month,
      available_days: dto.availableDays,
      note: dto.note,
    }).then(r => mapCapacity(r.data))
  },
  updateCapacity(id: string, dto: Partial<UpsertCapacityDto>): Promise<MemberCapacity> {
    const payload: Record<string, unknown> = {}
    if (dto.availableDays !== undefined) payload.available_days = dto.availableDays
    if (dto.note !== undefined) payload.note = dto.note
    return api.patch(`/resources/capacity/${id}/`, payload).then(r => mapCapacity(r.data))
  },

  // --- TimeEntry ---
  listTimeEntries(params?: {
    issue?: string; member?: string; project?: string;
    date_from?: string; date_to?: string;
  }): Promise<TimeEntry[]> {
    return api.get('/resources/time-entries/', { params }).then(r => r.data.map(mapTimeEntry))
  },
  createTimeEntry(dto: CreateTimeEntryDto): Promise<TimeEntry> {
    return api.post('/resources/time-entries/', {
      issue: dto.issue,
      member: dto.member,
      date: dto.date,
      hours: dto.hours,
      description: dto.description,
    }).then(r => mapTimeEntry(r.data))
  },
  deleteTimeEntry(id: string): Promise<void> {
    return api.delete(`/resources/time-entries/${id}/`)
  },

  // --- Workload ---
  getWorkload(params: WorkloadParams): Promise<MemberWorkload[]> {
    const p: Record<string, string> = {}
    if (params.period) p.period = params.period
    if (params.cycleId) p.cycle_id = params.cycleId
    return api.get('/resources/workload/', { params: p }).then(r => r.data.map(mapWorkload))
  },
  getProjectWorkload(projectId: string, params: WorkloadParams): Promise<MemberWorkload[]> {
    const p: Record<string, string> = {}
    if (params.period) p.period = params.period
    if (params.cycleId) p.cycle_id = params.cycleId
    return api
      .get(`/resources/projects/${projectId}/workload/`, { params: p })
      .then(r => r.data.map(mapWorkload))
  },
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/resource.ts frontend/src/types/index.ts
git add frontend/src/services/resource.service.ts
git commit -m "feat(resources): frontend types and service"
```

---

## Task 9: Frontend hooks

**Files:**
- Create: `frontend/src/hooks/useResources.ts`

- [ ] **Step 1: Write `useResources.ts`**

```typescript
// frontend/src/hooks/useResources.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { resourceService } from '@/services/resource.service'
import type { CreateResourceProfileDto, CreateTimeEntryDto, UpsertCapacityDto, WorkloadParams } from '@/types'

// ---- Profiles ----
export function useResourceProfiles(projectId?: string) {
  return useQuery({
    queryKey: ['resource-profiles', projectId],
    queryFn: () => resourceService.listProfiles(projectId),
    enabled: true,
  })
}

export function useCreateResourceProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateResourceProfileDto) => resourceService.createProfile(dto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['resource-profiles', vars.project] })
    },
  })
}

export function useUpdateResourceProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dailyRateBrl }: { id: string; dailyRateBrl: string }) =>
      resourceService.updateProfile(id, dailyRateBrl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resource-profiles'] })
    },
  })
}

// ---- Capacity ----
export function useMemberCapacities(params?: { member?: string; year?: number; month?: number }) {
  return useQuery({
    queryKey: ['member-capacity', params],
    queryFn: () => resourceService.listCapacity(params),
  })
}

export function useCreateCapacity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpsertCapacityDto) => resourceService.createCapacity(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-capacity'] })
      qc.invalidateQueries({ queryKey: ['workload'] })
    },
  })
}

export function useUpdateCapacity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<UpsertCapacityDto> }) =>
      resourceService.updateCapacity(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-capacity'] })
      qc.invalidateQueries({ queryKey: ['workload'] })
    },
  })
}

// ---- Time Entries ----
export function useTimeEntries(params?: {
  issue?: string; member?: string; project?: string;
  date_from?: string; date_to?: string;
}) {
  return useQuery({
    queryKey: ['time-entries', params],
    queryFn: () => resourceService.listTimeEntries(params),
  })
}

export function useCreateTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateTimeEntryDto) => resourceService.createTimeEntry(dto),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['time-entries'] })
      qc.invalidateQueries({ queryKey: ['workload'] })
    },
  })
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => resourceService.deleteTimeEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] })
      qc.invalidateQueries({ queryKey: ['workload'] })
    },
  })
}

// ---- Workload ----
export function useWorkload(params: WorkloadParams) {
  return useQuery({
    queryKey: ['workload', 'workspace', params],
    queryFn: () => resourceService.getWorkload(params),
  })
}

export function useProjectWorkload(projectId: string, params: WorkloadParams) {
  return useQuery({
    queryKey: ['workload', 'project', projectId, params],
    queryFn: () => resourceService.getProjectWorkload(projectId, params),
    enabled: !!projectId,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useResources.ts
git commit -m "feat(resources): TanStack Query hooks for resource API"
```

---

## Task 10: WorkloadGrid component

**Files:**
- Create: `frontend/src/features/resources/WorkloadGrid.tsx`

- [ ] **Step 1: Write `WorkloadGrid.tsx`**

```tsx
// frontend/src/features/resources/WorkloadGrid.tsx
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import type { MemberWorkload } from '@/types'

interface WorkloadGridProps {
  rows: MemberWorkload[]
  showCost?: boolean
  onRowClick?: (row: MemberWorkload) => void
  expandedMemberId?: string | null
  renderExpanded?: (row: MemberWorkload) => React.ReactNode
}

function UtilizationBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-400">—</span>
  const color =
    pct > 100
      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
      : pct >= 80
      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
      : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', color)}>
      {pct.toFixed(1)}%
    </span>
  )
}

function CapacityBar({ planned, available }: { planned: number; available: number | null }) {
  if (!available) return <span className="text-xs text-gray-400">sem capacidade</span>
  const pct = Math.min((planned / available) * 100, 100)
  const color =
    pct > 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-indigo-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {planned.toFixed(1)} / {available.toFixed(1)}d
      </span>
    </div>
  )
}

export function WorkloadGrid({
  rows,
  showCost = false,
  onRowClick,
  expandedMemberId,
  renderExpanded,
}: WorkloadGridProps) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        Nenhum membro encontrado para o período.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Membro
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Planejado / Disponível
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Real (dias)
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Utilização
            </th>
            {showCost && (
              <>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  Custo plan.
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  Custo real
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <>
              <tr
                key={row.memberId}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-gray-100 dark:border-gray-800',
                  onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  expandedMemberId === row.memberId && 'bg-indigo-50/40 dark:bg-indigo-900/10',
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar src={row.memberAvatar} name={row.memberName} size="sm" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {row.memberName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <CapacityBar planned={row.plannedDays} available={row.availableDays} />
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {row.actualDays.toFixed(1)}d
                </td>
                <td className="px-4 py-3">
                  <UtilizationBadge pct={row.utilizationPct} />
                </td>
                {showCost && (
                  <>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {row.plannedCost != null
                        ? `R$\u00A0${row.plannedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {row.actualCost != null
                        ? `R$\u00A0${row.actualCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                  </>
                )}
              </tr>
              {expandedMemberId === row.memberId && renderExpanded && (
                <tr key={`${row.memberId}-expanded`} className="bg-gray-50/50 dark:bg-gray-800/30">
                  <td colSpan={showCost ? 6 : 4} className="px-4 py-3">
                    {renderExpanded(row)}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/resources/WorkloadGrid.tsx
git commit -m "feat(resources): WorkloadGrid shared component"
```

---

## Task 11: ResourcesPage (workspace-wide)

**Files:**
- Create: `frontend/src/features/resources/ResourcesPage.tsx`

- [ ] **Step 1: Write `ResourcesPage.tsx`**

```tsx
// frontend/src/features/resources/ResourcesPage.tsx
import { useState } from 'react'
import { useWorkload } from '@/hooks/useResources'
import { PageSpinner } from '@/components/ui/Spinner'
import { WorkloadGrid } from './WorkloadGrid'
import type { MemberWorkload } from '@/types'

function PeriodPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      type="month"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  )
}

function MemberWorkloadDetail({ row }: { row: MemberWorkload }) {
  return (
    <dl className="grid grid-cols-3 gap-4 text-sm">
      <div>
        <dt className="text-xs text-gray-500 dark:text-gray-400">Disponível</dt>
        <dd className="font-medium text-gray-900 dark:text-gray-100">
          {row.availableDays != null ? `${row.availableDays.toFixed(1)}d` : '—'}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-gray-500 dark:text-gray-400">Planejado</dt>
        <dd className="font-medium text-gray-900 dark:text-gray-100">
          {row.plannedDays.toFixed(1)}d
        </dd>
      </div>
      <div>
        <dt className="text-xs text-gray-500 dark:text-gray-400">Apontado</dt>
        <dd className="font-medium text-gray-900 dark:text-gray-100">
          {row.actualDays.toFixed(1)}d
        </dd>
      </div>
    </dl>
  )
}

export function ResourcesPage() {
  const today = new Date()
  const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const [period, setPeriod] = useState(defaultPeriod)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: rows = [], isLoading } = useWorkload({ period })

  function toggleExpand(row: MemberWorkload) {
    setExpandedId(prev => (prev === row.memberId ? null : row.memberId))
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Recursos — Workspace
        </h1>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      <WorkloadGrid
        rows={rows}
        onRowClick={toggleExpand}
        expandedMemberId={expandedId}
        renderExpanded={(row) => <MemberWorkloadDetail row={row} />}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/resources/ResourcesPage.tsx
git commit -m "feat(resources): workspace-wide ResourcesPage"
```

---

## Task 12: ProjectResourcesPage, TimeEntriesTab, and LogTimeModal

**Files:**
- Create: `frontend/src/features/resources/LogTimeModal.tsx`
- Create: `frontend/src/features/resources/TimeEntriesTab.tsx`
- Create: `frontend/src/features/resources/ProjectResourcesPage.tsx`

- [ ] **Step 1: Write `LogTimeModal.tsx`**

```tsx
// frontend/src/features/resources/LogTimeModal.tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCreateTimeEntry } from '@/hooks/useResources'
import { useIssues } from '@/hooks/useIssues'
import { useAuthStore } from '@/stores/authStore'
import { Search } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export function LogTimeModal({ open, onClose }: Props) {
  const { projectId } = useParams<{ projectId: string }>()
  const { user } = useAuthStore()
  const { data: issues = [] } = useIssues(projectId ?? '', {})
  const create = useCreateTimeEntry()

  const [search, setSearch] = useState('')
  const [selectedIssueId, setSelectedIssueId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState('')
  const [description, setDescription] = useState('')

  const filtered = issues.filter(
    i => i.type !== 'epic' &&
      (search === '' || i.title.toLowerCase().includes(search.toLowerCase()))
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedIssueId || !user) return
    create.mutate(
      {
        issue: selectedIssueId,
        member: user.id,
        date,
        hours: parseFloat(hours),
        description: description || undefined,
      },
      {
        onSuccess: () => {
          setSearch('')
          setSelectedIssueId('')
          setHours('')
          setDescription('')
          onClose()
        },
      },
    )
  }

  const selectedIssue = issues.find(i => i.id === selectedIssueId)

  return (
    <Modal open={open} onClose={onClose} title="Apontar horas">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Issue picker */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Issue
          </label>
          {selectedIssue ? (
            <div className="flex items-center justify-between rounded-md border border-indigo-300 bg-white dark:bg-gray-900 px-3 py-2 text-sm">
              <span className="text-gray-700 dark:text-gray-300">
                <span className="font-mono text-xs text-gray-400 mr-1.5">#{selectedIssue.sequenceId}</span>
                {selectedIssue.title}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIssueId('')}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                trocar
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5">
                <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar issue..."
                  className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none"
                />
              </div>
              {search && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
                  {filtered.slice(0, 15).map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() => { setSelectedIssueId(issue.id); setSearch('') }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <span className="font-mono text-xs text-gray-400 shrink-0">#{issue.sequenceId}</span>
                      <span className="truncate text-gray-700 dark:text-gray-300">{issue.title}</span>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="px-3 py-2 text-xs text-gray-400">Nenhuma issue encontrada.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Horas"
            type="number"
            step="0.25"
            min="-24"
            max="24"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="ex: 4.0"
            required
          />
        </div>

        <Input
          label="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="O que foi feito..."
        />

        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            loading={create.isPending}
            disabled={!selectedIssueId || !hours}
          >
            Salvar
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 2: Write `TimeEntriesTab.tsx`**

```tsx
// frontend/src/features/resources/TimeEntriesTab.tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTimeEntries, useDeleteTimeEntry } from '@/hooks/useResources'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { LogTimeModal } from './LogTimeModal'
import { Trash2, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function TimeEntriesTab() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { data: entries = [], isLoading } = useTimeEntries({ project: projectId })
  const deleteEntry = useDeleteTimeEntry()
  const [logging, setLogging] = useState(false)

  if (isLoading) return <PageSpinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {entries.length} apontamento{entries.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={() => setLogging(true)}>
          <Plus className="h-3.5 w-3.5" />
          Apontar horas
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          Nenhum apontamento registrado.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                {['Data', 'Membro', 'Issue', 'Horas', 'Descrição', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                    {entry.date}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                    {entry.memberName}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() =>
                        navigate(`/projects/${projectId}/issues/${entry.issue}`)
                      }
                      className="font-mono text-xs text-indigo-600 hover:underline"
                    >
                      #{entry.issueSequenceId}
                    </button>
                    <span className="ml-1.5 text-gray-600 dark:text-gray-400 truncate max-w-xs inline-block align-middle">
                      {entry.issueTitle}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium">
                    {entry.hours.toFixed(2)}h
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {entry.description ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => deleteEntry.mutate(entry.id)}
                      disabled={deleteEntry.isPending}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:opacity-40"
                      title="Excluir apontamento"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {logging && <LogTimeModal open={logging} onClose={() => setLogging(false)} />}
    </div>
  )
}
```

- [ ] **Step 3: Write `ProjectResourcesPage.tsx`**

```tsx
// frontend/src/features/resources/ProjectResourcesPage.tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectWorkload, useResourceProfiles, useCreateResourceProfile, useUpdateResourceProfile, useMemberCapacities, useCreateCapacity, useUpdateCapacity } from '@/hooks/useResources'
import { PageSpinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { WorkloadGrid } from './WorkloadGrid'
import { TimeEntriesTab } from './TimeEntriesTab'
import type { MemberWorkload } from '@/types'

type Tab = 'workload' | 'time-entries'

function PeriodPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="month"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  )
}

function RateEditor({ projectId, row }: { projectId: string; row: MemberWorkload }) {
  const { data: profiles = [] } = useResourceProfiles(projectId)
  const create = useCreateResourceProfile()
  const update = useUpdateResourceProfile()
  const existing = profiles.find(p => p.member === row.memberId)

  const [editing, setEditing] = useState(false)
  const [rate, setRate] = useState(existing?.dailyRateBrl ?? '')

  function handleSave() {
    if (existing) {
      update.mutate({ id: existing.id, dailyRateBrl: rate }, { onSuccess: () => setEditing(false) })
    } else {
      create.mutate(
        { project: projectId, member: row.memberId, dailyRateBrl: rate },
        { onSuccess: () => setEditing(false) },
      )
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setRate(existing?.dailyRateBrl ?? ''); setEditing(true) }}
        className="text-xs text-indigo-600 hover:underline"
      >
        {existing ? `R$${existing.dailyRateBrl}/dia` : '+ Taxa'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        step="0.01"
        min="0"
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        className="w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-0.5 text-xs"
        placeholder="ex: 350.00"
        autoFocus
      />
      <button
        onClick={handleSave}
        disabled={create.isPending || update.isPending}
        className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
      >
        salvar
      </button>
      <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">
        cancelar
      </button>
    </div>
  )
}

export function ProjectResourcesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const today = new Date()
  const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const [period, setPeriod] = useState(defaultPeriod)
  const [activeTab, setActiveTab] = useState<Tab>('workload')

  const { data: rows = [], isLoading } = useProjectWorkload(projectId ?? '', { period })

  const tabCls = (t: Tab) =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
      activeTab === t
        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`

  if (isLoading) return <PageSpinner />

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className={tabCls('workload')} onClick={() => setActiveTab('workload')}>
            Workload
          </button>
          <button className={tabCls('time-entries')} onClick={() => setActiveTab('time-entries')}>
            Apontamentos
          </button>
        </div>
        {activeTab === 'workload' && (
          <PeriodPicker value={period} onChange={setPeriod} />
        )}
      </div>

      {activeTab === 'workload' && (
        <WorkloadGrid
          rows={rows}
          showCost
          renderExpanded={(row) =>
            projectId ? <RateEditor projectId={projectId} row={row} /> : null
          }
        />
      )}

      {activeTab === 'time-entries' && <TimeEntriesTab />}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/resources/
git commit -m "feat(resources): LogTimeModal, TimeEntriesTab, ProjectResourcesPage"
```

---

## Task 13: Routing and nav wiring

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/ProjectNav.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add imports and routes to `App.tsx`**

Add imports after the last existing import:

```typescript
import { ResourcesPage } from './features/resources/ResourcesPage'
import { ProjectResourcesPage } from './features/resources/ProjectResourcesPage'
```

Add routes inside the `<Route path="/projects/:projectId" element={<ProjectProvider />}>` block, after `<Route path="risks" ...>`:

```tsx
<Route path="resources" element={<ProjectResourcesPage />} />
```

Add workspace route after `<Route path="/workspace/settings" ...>`:

```tsx
<Route path="/workspace/resources" element={<ResourcesPage />} />
```

- [ ] **Step 2: Add Resources tab to `ProjectNav.tsx`**

In the `tabs` array, add after `{ path: 'risks', ... }`:

```typescript
{ path: 'resources', label: 'Recursos', icon: Users },
```

Add `Users` to the lucide-react import:

```typescript
import { KanbanSquare, List, RotateCcw, Network, BookOpen, Flag, ShieldAlert, Layers, Settings, BookMarked, Users } from 'lucide-react'
```

- [ ] **Step 3: Add workspace resources link to `Sidebar.tsx`**

Add `Users` to the lucide-react import in `Sidebar.tsx`:

```typescript
import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  Users,
  Settings,
  Plus,
} from 'lucide-react'
```

In the main navigation `<nav>` block, add after the Portfolio item:

```tsx
<NavItem to="/workspace/resources" icon={Users} label="Recursos" />
```

- [ ] **Step 4: Run frontend typecheck**

```bash
cd frontend
npm run typecheck
```

Expected: no type errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx
git add frontend/src/components/layout/ProjectNav.tsx
git add frontend/src/components/layout/Sidebar.tsx
git commit -m "feat(resources): wire routes, project nav tab, sidebar link"
```

---

## Sync and verify

- [ ] **Sync backend to Docker container**

```bash
make sync-backend
```

- [ ] **Sync frontend to WSL**

In WSL terminal: `make sync-frontend`

- [ ] **Verify API health**

```bash
curl http://localhost:8000/api/health/
```

- [ ] **Run full resource test suite**

```bash
cd backend
python manage.py test apps.resources -v 2
```

Expected: all tests PASS
