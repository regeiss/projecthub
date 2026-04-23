# Sprint Planning Capacity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cycle-level sprint planning board with separate draft planning assignments, prorated member capacity, and an explicit apply flow that writes assignee, cycle membership, `estimate_days`, and `estimate_points` back to live issues.

**Architecture:** Keep the domain inside `apps/cycles` by adding three planning models plus a small `planning.py` service module that owns bootstrap, proration, and apply logic. On the frontend, add typed cycle-planning service/hooks plus a dedicated planning UI inside cycle detail, with pure board-state helpers for totals and drag/drop state transitions so the tricky behavior is unit-tested outside the component tree.

**Tech Stack:** Django 5.1 + DRF + existing cycle/project permission patterns + existing `apps.resources.utils.get_working_days` helper; React 18 + TypeScript + TanStack Query + Tailwind + existing `@dnd-kit` packages

---

## File Map

### Backend

| File | Responsibility |
|------|----------------|
| `backend/apps/cycles/models.py` | Add `SprintPlan`, `SprintPlanMemberCapacity`, `SprintPlanAllocation` |
| `backend/apps/cycles/planning.py` | Bootstrap plan from cycle/member/issue data, prorate capacity, apply draft plan transactionally |
| `backend/apps/cycles/serializers.py` | Serialize plan, capacity rows, allocations, and apply response |
| `backend/apps/cycles/views.py` | Add nested plan endpoints under project cycle routes |
| `backend/apps/cycles/urls.py` | Register plan endpoints alongside existing cycle endpoints |
| `backend/apps/cycles/tests/test_planning_domain.py` | Domain tests for proration, seeding, and apply behavior |
| `backend/apps/cycles/tests/test_planning_api.py` | API tests for create/read/update/apply endpoints |
| `backend/apps/cycles/migrations/*.py` | Planning schema migration |

### Frontend

| File | Responsibility |
|------|----------------|
| `frontend/src/types/planning.ts` | Sprint plan, capacity, allocation, and apply-summary types |
| `frontend/src/types/index.ts` | Re-export planning types |
| `frontend/src/services/cycle-planning.service.ts` | API calls + snake_case to camelCase mapping |
| `frontend/src/hooks/useCyclePlanning.ts` | React Query hooks for plan CRUD/apply |
| `frontend/src/features/cycles/CycleDetail.tsx` | Add cycle detail tabs and mount planning board |
| `frontend/src/features/cycles/CycleDetailPlanning.test.tsx` | Regression test for planning tab integration |
| `frontend/src/features/cycles/planning/CyclePlanningBoard.tsx` | Initial planning board shell, later expanded with drag/drop and apply flow |
| `frontend/src/features/cycles/planning/planning-board-state.ts` | Pure helpers for totals, lane grouping, allocation moves |
| `frontend/src/features/cycles/planning/planning-board-state.test.ts` | Unit tests for board-state helpers |
| `frontend/src/features/cycles/planning/PlanningSummary.tsx` | Header metrics and draft state |
| `frontend/src/features/cycles/planning/PlanningMemberColumn.tsx` | Member lane header + issue drop zone |
| `frontend/src/features/cycles/planning/PlanningIssueCard.tsx` | Issue card with days/points badges and inline editors |
| `frontend/src/features/cycles/planning/SprintCapacityEditor.tsx` | Per-member sprint override editor |
| `frontend/src/features/cycles/planning/ApplySprintPlanModal.tsx` | Explicit apply confirmation + summary |
| `frontend/src/features/cycles/planning/CyclePlanningBoard.test.tsx` | UI test for summary, overload state, apply button |

### Existing code to reuse directly

| File | Why |
|------|-----|
| `backend/apps/resources/utils.py` | Reuse `get_working_days()` for monthly-to-cycle capacity proration |
| `frontend/src/services/issue.service.ts` | Existing `estimate_points` / `estimate_days` mapping confirms live issue fields |
| `frontend/src/hooks/useIssues.ts` | Reuse candidate issue fetching with `projectId` + `cycleId` filters |
| `frontend/src/hooks/useProjects.ts` | Reuse project member list for planning columns |

---

## Task 1: Add sprint-planning domain models and bootstrap/apply service

**Files:**
- Create: `backend/apps/cycles/planning.py`
- Modify: `backend/apps/cycles/models.py`
- Create: `backend/apps/cycles/tests/test_planning_domain.py`

- [ ] **Step 1: Write the failing domain tests**

```python
# backend/apps/cycles/tests/test_planning_domain.py
from decimal import Decimal
from django.test import TestCase

from apps.cycles.models import Cycle, CycleIssue
from apps.cycles.planning import ensure_sprint_plan, apply_sprint_plan
from apps.issues.models import Issue
from apps.projects.models import IssueState, Project, ProjectMember
from apps.resources.models import MemberCapacity
from apps.workspaces.models import Workspace, WorkspaceMember


class SprintPlanDomainTest(TestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name='WS', slug='ws-sprint-plan')
        self.admin = WorkspaceMember.objects.create(
            workspace=self.workspace,
            keycloak_sub='sub-admin',
            email='admin@test.com',
            name='Admin',
            role='admin',
        )
        self.dev = WorkspaceMember.objects.create(
            workspace=self.workspace,
            keycloak_sub='sub-dev',
            email='dev@test.com',
            name='Dev',
            role='member',
        )
        self.project = Project.objects.create(
            workspace=self.workspace,
            name='Planning',
            identifier='PLAN',
            created_by=self.admin,
        )
        ProjectMember.objects.create(project=self.project, member=self.admin, role='admin')
        ProjectMember.objects.create(project=self.project, member=self.dev, role='member')
        self.state = IssueState.objects.create(
            project=self.project,
            name='Backlog',
            color='#94a3b8',
            category='backlog',
            sequence=1,
        )
        self.cycle = Cycle.objects.create(
            project=self.project,
            name='Sprint 1',
            start_date='2026-04-01',
            end_date='2026-04-14',
            status='draft',
            created_by=self.admin,
        )
        self.issue = Issue.objects.create(
            project=self.project,
            title='Plan the sprint',
            state=self.state,
            priority='medium',
            assignee=self.dev,
            reporter=self.admin,
            created_by=self.admin,
            estimate_days=3,
            estimate_points=5,
        )
        CycleIssue.objects.create(cycle=self.cycle, issue=self.issue)
        MemberCapacity.objects.create(
            member=self.dev,
            year=2026,
            month=4,
            available_days='22.0',
        )

    def test_ensure_sprint_plan_bootstraps_prorated_capacity_and_seed_allocation(self):
        plan = ensure_sprint_plan(self.cycle, self.admin)

        capacity = plan.member_capacities.get(member=self.dev)
        allocation = plan.allocations.get(issue=self.issue)

        self.assertEqual(capacity.default_days, Decimal('10.0'))
        self.assertIsNone(capacity.override_days)
        self.assertEqual(allocation.planned_member, self.dev)
        self.assertEqual(allocation.planned_days, Decimal('3'))
        self.assertEqual(allocation.planned_story_points, 5)

    def test_apply_sprint_plan_updates_live_issue_fields(self):
        plan = ensure_sprint_plan(self.cycle, self.admin)
        allocation = plan.allocations.get(issue=self.issue)
        allocation.planned_days = Decimal('4.5')
        allocation.planned_story_points = 8
        allocation.save(update_fields=['planned_days', 'planned_story_points'])

        apply_sprint_plan(plan, self.admin)
        self.issue.refresh_from_db()
        plan.refresh_from_db()

        self.assertEqual(self.issue.assignee, self.dev)
        self.assertEqual(self.issue.estimate_days, 4.5)
        self.assertEqual(self.issue.estimate_points, 8)
        self.assertEqual(plan.status, 'applied')
        self.assertIsNotNone(plan.applied_at)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && python manage.py test apps.cycles.tests.test_planning_domain -v 2`

Expected: FAIL with import/model errors because `SprintPlan` and `apps.cycles.planning` do not exist yet.

- [ ] **Step 3: Add the new models to `backend/apps/cycles/models.py`**

```python
class SprintPlan(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Rascunho"
        APPLIED = "applied", "Aplicado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cycle = models.OneToOneField(
        Cycle, on_delete=models.CASCADE, related_name="plan"
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    applied_at = models.DateTimeField(null=True, blank=True)
    applied_by = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="applied_sprint_plans",
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="created_sprint_plans",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "sprint_plans"


class SprintPlanMemberCapacity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(
        SprintPlan, on_delete=models.CASCADE, related_name="member_capacities"
    )
    member = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.CASCADE,
        related_name="sprint_plan_capacities",
    )
    default_days = models.DecimalField(max_digits=5, decimal_places=1)
    override_days = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "sprint_plan_member_capacities"
        unique_together = [("plan", "member")]


class SprintPlanAllocation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(
        SprintPlan, on_delete=models.CASCADE, related_name="allocations"
    )
    issue = models.ForeignKey(
        "issues.Issue", on_delete=models.CASCADE, related_name="sprint_plan_allocations"
    )
    planned_member = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="planned_sprint_allocations",
        null=True,
        blank=True,
    )
    planned_days = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    planned_story_points = models.IntegerField(null=True, blank=True)
    rank = models.IntegerField(default=0)
    note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "sprint_plan_allocations"
        unique_together = [("plan", "issue")]
        ordering = ["rank", "created_at"]
```

- [ ] **Step 4: Implement the bootstrap/apply service in `backend/apps/cycles/planning.py`**

```python
import calendar
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone

from apps.projects.models import ProjectMember
from apps.resources.models import MemberCapacity
from apps.resources.utils import get_working_days

from .models import CycleIssue, SprintPlan, SprintPlanAllocation, SprintPlanMemberCapacity


def _prorated_capacity(cycle, member):
    if cycle.start_date.year != cycle.end_date.year or cycle.start_date.month != cycle.end_date.month:
        raise ValueError("Sprint planning v1 requires cycles to stay within one calendar month.")

    capacity = MemberCapacity.objects.filter(
        member=member,
        year=cycle.start_date.year,
        month=cycle.start_date.month,
    ).first()
    if not capacity:
        return None

    _, last_day = calendar.monthrange(cycle.start_date.year, cycle.start_date.month)
    month_start = cycle.start_date.replace(day=1)
    month_end = cycle.start_date.replace(day=last_day)

    month_working = get_working_days(month_start, month_end)
    cycle_working = get_working_days(cycle.start_date, cycle.end_date)
    if month_working == 0:
        return capacity.available_days

    value = Decimal(capacity.available_days) * Decimal(cycle_working) / Decimal(month_working)
    return value.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


@transaction.atomic
def ensure_sprint_plan(cycle, actor):
    plan, created = SprintPlan.objects.get_or_create(
        cycle=cycle,
        defaults={"created_by": actor},
    )

    if created:
        memberships = ProjectMember.objects.select_related("member").filter(project=cycle.project)
        for membership in memberships:
            SprintPlanMemberCapacity.objects.get_or_create(
                plan=plan,
                member=membership.member,
                defaults={"default_days": _prorated_capacity(cycle, membership.member)},
            )

        cycle_issues = (
            CycleIssue.objects.select_related("issue__assignee")
            .filter(cycle=cycle)
            .order_by("added_at")
        )
        for rank, cycle_issue in enumerate(cycle_issues):
            issue = cycle_issue.issue
            SprintPlanAllocation.objects.get_or_create(
                plan=plan,
                issue=issue,
                defaults={
                    "planned_member": issue.assignee,
                    "planned_days": issue.estimate_days,
                    "planned_story_points": issue.estimate_points,
                    "rank": rank,
                },
            )

    return plan


@transaction.atomic
def apply_sprint_plan(plan, actor):
    allocations = plan.allocations.select_related("issue", "planned_member")
    for allocation in allocations:
        CycleIssue.objects.get_or_create(cycle=plan.cycle, issue=allocation.issue)
        issue = allocation.issue
        issue.assignee = allocation.planned_member
        if allocation.planned_days is not None:
            issue.estimate_days = float(allocation.planned_days)
        if allocation.planned_story_points is not None:
            issue.estimate_points = allocation.planned_story_points
        issue.save(update_fields=["assignee", "estimate_days", "estimate_points", "updated_at"])

    plan.status = SprintPlan.Status.APPLIED
    plan.applied_at = timezone.now()
    plan.applied_by = actor
    plan.save(update_fields=["status", "applied_at", "applied_by", "updated_at"])
    return plan
```

- [ ] **Step 5: Generate and apply the migration**

Run:

```bash
cd backend
python manage.py makemigrations cycles
python manage.py migrate
```

Expected: a new `apps/cycles/migrations/...` file creating `sprint_plans`, `sprint_plan_member_capacities`, and `sprint_plan_allocations`.

- [ ] **Step 6: Run the domain test to verify it passes**

Run: `cd backend && python manage.py test apps.cycles.tests.test_planning_domain -v 2`

Expected: PASS with `Ran 2 tests`.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/cycles/models.py
git add backend/apps/cycles/planning.py
git add backend/apps/cycles/tests/test_planning_domain.py
git add backend/apps/cycles/migrations/
git commit -m "feat(cycles): add sprint planning models and domain service"
```

---

## Task 2: Expose sprint-planning API endpoints under cycle routes

**Files:**
- Modify: `backend/apps/cycles/serializers.py`
- Modify: `backend/apps/cycles/views.py`
- Modify: `backend/apps/cycles/urls.py`
- Create: `backend/apps/cycles/tests/test_planning_api.py`

- [ ] **Step 1: Write the failing API tests**

```python
# backend/apps/cycles/tests/test_planning_api.py
from rest_framework.test import APITestCase

from apps.cycles.models import Cycle
from apps.cycles.planning import ensure_sprint_plan
from apps.issues.models import Issue
from apps.projects.models import IssueState, Project, ProjectMember
from apps.resources.models import MemberCapacity
from apps.workspaces.models import Workspace, WorkspaceMember


class SprintPlanApiTest(APITestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name='WS', slug='ws-plan-api')
        self.admin = WorkspaceMember.objects.create(
            workspace=self.workspace,
            keycloak_sub='sub-admin',
            email='admin@test.com',
            name='Admin',
            role='admin',
        )
        self.dev = WorkspaceMember.objects.create(
            workspace=self.workspace,
            keycloak_sub='sub-dev',
            email='dev@test.com',
            name='Dev',
            role='member',
        )
        self.project = Project.objects.create(
            workspace=self.workspace,
            name='Planning',
            identifier='PLAN',
            created_by=self.admin,
        )
        ProjectMember.objects.create(project=self.project, member=self.admin, role='admin')
        ProjectMember.objects.create(project=self.project, member=self.dev, role='member')
        self.state = IssueState.objects.create(
            project=self.project,
            name='Backlog',
            color='#94a3b8',
            category='backlog',
            sequence=1,
        )
        self.cycle = Cycle.objects.create(
            project=self.project,
            name='Sprint 1',
            start_date='2026-04-01',
            end_date='2026-04-14',
            status='draft',
            created_by=self.admin,
        )
        self.issue = Issue.objects.create(
            project=self.project,
            title='API planned issue',
            state=self.state,
            priority='medium',
            reporter=self.admin,
            created_by=self.admin,
        )
        MemberCapacity.objects.create(member=self.dev, year=2026, month=4, available_days='22.0')
        self.client.force_authenticate(user=self.admin)

    def test_get_plan_creates_it_and_returns_member_capacities(self):
        res = self.client.get(f'/api/v1/projects/{self.project.id}/cycles/{self.cycle.id}/plan/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'draft')
        self.assertEqual(len(res.data['member_capacities']), 2)

    def test_patch_member_capacity_updates_override_days(self):
        ensure_sprint_plan(self.cycle, self.admin)
        res = self.client.patch(
            f'/api/v1/projects/{self.project.id}/cycles/{self.cycle.id}/plan/member-capacities/',
            {'items': [{'member': str(self.dev.id), 'override_days': '8.0'}]},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data[0]['override_days'], '8.0')

    def test_apply_endpoint_updates_issue_fields(self):
        plan = ensure_sprint_plan(self.cycle, self.admin)
        allocation = plan.allocations.create(
            issue=self.issue,
            planned_member=self.dev,
            planned_days='2.5',
            planned_story_points=3,
            rank=0,
        )
        res = self.client.post(
            f'/api/v1/projects/{self.project.id}/cycles/{self.cycle.id}/plan/apply/',
        )
        self.assertEqual(res.status_code, 200)
        self.issue.refresh_from_db()
        self.assertEqual(str(self.issue.assignee_id), str(self.dev.id))
        self.assertEqual(self.issue.estimate_days, 2.5)
        self.assertEqual(self.issue.estimate_points, 3)
```

- [ ] **Step 2: Run the API test to verify it fails**

Run: `cd backend && python manage.py test apps.cycles.tests.test_planning_api -v 2`

Expected: FAIL with `404 != 200` because the plan routes do not exist yet.

- [ ] **Step 3: Add serializers for plan, capacity rows, allocations, and apply response**

```python
# add to backend/apps/cycles/serializers.py
class SprintPlanMemberCapacitySerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.name", read_only=True)
    member_avatar = serializers.CharField(source="member.avatar_url", read_only=True)

    class Meta:
        model = SprintPlanMemberCapacity
        fields = [
            "id",
            "member",
            "member_name",
            "member_avatar",
            "default_days",
            "override_days",
            "note",
        ]


class SprintPlanAllocationSerializer(serializers.ModelSerializer):
    issue_title = serializers.CharField(source="issue.title", read_only=True)
    issue_sequence_id = serializers.IntegerField(source="issue.sequence_id", read_only=True)

    class Meta:
        model = SprintPlanAllocation
        fields = [
            "id",
            "issue",
            "issue_title",
            "issue_sequence_id",
            "planned_member",
            "planned_days",
            "planned_story_points",
            "rank",
            "note",
        ]


class SprintPlanSerializer(serializers.ModelSerializer):
    member_capacities = SprintPlanMemberCapacitySerializer(many=True, read_only=True)
    allocations = SprintPlanAllocationSerializer(many=True, read_only=True)

    class Meta:
        model = SprintPlan
        fields = [
            "id",
            "cycle",
            "status",
            "applied_at",
            "member_capacities",
            "allocations",
        ]
```

- [ ] **Step 4: Add the plan views to `backend/apps/cycles/views.py`**

```python
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsProjectAdmin

from .models import SprintPlanAllocation, SprintPlanMemberCapacity
from .planning import apply_sprint_plan, ensure_sprint_plan
from .serializers import (
    SprintPlanAllocationSerializer,
    SprintPlanMemberCapacitySerializer,
    SprintPlanSerializer,
)


class SprintPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_pk, pk):
        project = _get_project(project_pk, request.user)
        cycle = _get_cycle(pk, project)
        plan = ensure_sprint_plan(cycle, request.user)
        return Response(SprintPlanSerializer(plan).data)

    def post(self, request, project_pk, pk):
        project = _get_project(project_pk, request.user)
        cycle = _get_cycle(pk, project)
        plan = ensure_sprint_plan(cycle, request.user)
        return Response(SprintPlanSerializer(plan).data, status=status.HTTP_201_CREATED)


class SprintPlanMemberCapacityListView(APIView):
    permission_classes = [IsAuthenticated, IsProjectAdmin]

    def patch(self, request, project_pk, pk):
        project = _get_project(project_pk, request.user)
        cycle = _get_cycle(pk, project)
        plan = ensure_sprint_plan(cycle, request.user)

        items = request.data.get("items", [])
        updated = []
        for item in items:
            row = SprintPlanMemberCapacity.objects.get(plan=plan, member_id=item["member"])
            row.override_days = item.get("override_days")
            row.note = item.get("note", row.note)
            row.save(update_fields=["override_days", "note", "updated_at"])
            updated.append(row)

        return Response(SprintPlanMemberCapacitySerializer(updated, many=True).data)


class SprintPlanAllocationListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsProjectAdmin]

    def get(self, request, project_pk, pk):
        project = _get_project(project_pk, request.user)
        cycle = _get_cycle(pk, project)
        plan = ensure_sprint_plan(cycle, request.user)
        rows = plan.allocations.select_related("issue").all()
        return Response(SprintPlanAllocationSerializer(rows, many=True).data)

    def post(self, request, project_pk, pk):
        project = _get_project(project_pk, request.user)
        cycle = _get_cycle(pk, project)
        plan = ensure_sprint_plan(cycle, request.user)
        serializer = SprintPlanAllocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(plan=plan)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SprintPlanAllocationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SprintPlanAllocationSerializer
    permission_classes = [IsAuthenticated, IsProjectAdmin]
    lookup_url_kwarg = "allocation_pk"

    def get_queryset(self):
        project = _get_project(self.kwargs["project_pk"], self.request.user)
        cycle = _get_cycle(self.kwargs["pk"], project)
        plan = ensure_sprint_plan(cycle, self.request.user)
        return SprintPlanAllocation.objects.filter(plan=plan)


class SprintPlanApplyView(APIView):
    permission_classes = [IsAuthenticated, IsProjectAdmin]

    def post(self, request, project_pk, pk):
        project = _get_project(project_pk, request.user)
        cycle = _get_cycle(pk, project)
        plan = ensure_sprint_plan(cycle, request.user)
        plan = apply_sprint_plan(plan, request.user)
        return Response(SprintPlanSerializer(plan).data)
```

- [ ] **Step 5: Register the new nested routes in `backend/apps/cycles/urls.py`**

```python
# add to nested_urlpatterns in backend/apps/cycles/urls.py
path("<uuid:pk>/plan/", SprintPlanView.as_view(), name="cycle-plan"),
path(
    "<uuid:pk>/plan/member-capacities/",
    SprintPlanMemberCapacityListView.as_view(),
    name="cycle-plan-member-capacity-list",
),
path(
    "<uuid:pk>/plan/allocations/",
    SprintPlanAllocationListCreateView.as_view(),
    name="cycle-plan-allocation-list",
),
path(
    "<uuid:pk>/plan/allocations/<uuid:allocation_pk>/",
    SprintPlanAllocationDetailView.as_view(),
    name="cycle-plan-allocation-detail",
),
path("<uuid:pk>/plan/apply/", SprintPlanApplyView.as_view(), name="cycle-plan-apply"),
```

- [ ] **Step 6: Run the API test to verify it passes**

Run: `cd backend && python manage.py test apps.cycles.tests.test_planning_api -v 2`

Expected: PASS with `Ran 3 tests`.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/cycles/serializers.py
git add backend/apps/cycles/views.py
git add backend/apps/cycles/urls.py
git add backend/apps/cycles/tests/test_planning_api.py
git commit -m "feat(cycles): add sprint planning API endpoints"
```

---

## Task 3: Add frontend planning types, service/hooks, and cycle-detail tab shell

**Files:**
- Create: `frontend/src/types/planning.ts`
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/services/cycle-planning.service.ts`
- Create: `frontend/src/hooks/useCyclePlanning.ts`
- Create: `frontend/src/features/cycles/planning/CyclePlanningBoard.tsx`
- Modify: `frontend/src/features/cycles/CycleDetail.tsx`
- Create: `frontend/src/features/cycles/CycleDetailPlanning.test.tsx`

- [ ] **Step 1: Write the failing cycle-detail planning integration test**

```tsx
// frontend/src/features/cycles/CycleDetailPlanning.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CycleDetail } from './CycleDetail'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ projectId: 'project-1', cycleId: 'cycle-1' }),
  }
})

vi.mock('@/hooks/useCycles', () => ({
  useCycle: () => ({
    data: {
      id: 'cycle-1',
      projectId: 'project-1',
      name: 'Sprint 1',
      description: null,
      startDate: '2026-04-01',
      endDate: '2026-04-14',
      status: 'draft',
      issueCount: 0,
      completedCount: 0,
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-01T00:00:00Z',
    },
    isLoading: false,
  }),
  useCycleProgress: () => ({ data: undefined }),
  useUpdateCycle: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/useIssues', () => ({
  useIssues: () => ({ data: { results: [] } }),
}))

vi.mock('@/hooks/useCyclePlanning', () => ({
  useCyclePlan: () => ({
    data: {
      id: 'plan-1',
      cycleId: 'cycle-1',
      status: 'draft',
      memberCapacities: [
        {
          id: 'cap-1',
          member: 'member-1',
          memberName: 'Ana',
          memberAvatar: null,
          defaultDays: '10.0',
          overrideDays: null,
          note: null,
        },
      ],
      allocations: [
        {
          id: 'alloc-1',
          issue: 'issue-1',
          issueTitle: 'Plan login flow',
          issueSequenceId: 42,
          plannedMember: 'member-1',
          plannedDays: '3.0',
          plannedStoryPoints: 5,
          rank: 0,
          note: null,
        },
      ],
    },
    isLoading: false,
  }),
}))

describe('CycleDetail planning tab', () => {
  it('renders the planning board inside cycle detail', async () => {
    render(<CycleDetail />)

    await userEvent.click(screen.getByRole('button', { name: 'Planejamento' }))

    expect(screen.getByText('Capacidade do sprint')).toBeInTheDocument()
    expect(screen.getByText('Plan login flow')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm run test -- src/features/cycles/CycleDetailPlanning.test.tsx`

Expected: FAIL because `useCyclePlanning` and the `Planejamento` tab do not exist yet.

- [ ] **Step 3: Add the planning types, service mapping, and hooks**

```ts
// frontend/src/types/planning.ts
export interface SprintPlanMemberCapacity {
  id: string
  member: string
  memberName: string
  memberAvatar: string | null
  defaultDays: string | null
  overrideDays: string | null
  note: string | null
}

export interface SprintPlanAllocation {
  id: string
  issue: string
  issueTitle: string
  issueSequenceId: number
  plannedMember: string | null
  plannedDays: string | null
  plannedStoryPoints: number | null
  rank: number
  note: string | null
}

export interface SprintPlan {
  id: string
  cycleId: string
  status: 'draft' | 'applied'
  appliedAt: string | null
  memberCapacities: SprintPlanMemberCapacity[]
  allocations: SprintPlanAllocation[]
}
```

```ts
// frontend/src/services/cycle-planning.service.ts
import api from '@/lib/axios'
import type { SprintPlan, SprintPlanAllocation, SprintPlanMemberCapacity } from '@/types'

function mapCapacity(raw: any): SprintPlanMemberCapacity {
  return {
    id: raw.id,
    member: raw.member,
    memberName: raw.member_name,
    memberAvatar: raw.member_avatar ?? null,
    defaultDays: raw.default_days ?? null,
    overrideDays: raw.override_days ?? null,
    note: raw.note ?? null,
  }
}

function mapAllocation(raw: any): SprintPlanAllocation {
  return {
    id: raw.id,
    issue: raw.issue,
    issueTitle: raw.issue_title,
    issueSequenceId: raw.issue_sequence_id,
    plannedMember: raw.planned_member ?? null,
    plannedDays: raw.planned_days ?? null,
    plannedStoryPoints: raw.planned_story_points ?? null,
    rank: raw.rank ?? 0,
    note: raw.note ?? null,
  }
}

function mapPlan(raw: any): SprintPlan {
  return {
    id: raw.id,
    cycleId: raw.cycle,
    status: raw.status,
    appliedAt: raw.applied_at ?? null,
    memberCapacities: (raw.member_capacities ?? []).map(mapCapacity),
    allocations: (raw.allocations ?? []).map(mapAllocation),
  }
}

export const cyclePlanningService = {
  getPlan: (projectId: string, cycleId: string) =>
    api.get(`/projects/${projectId}/cycles/${cycleId}/plan/`).then((r) => mapPlan(r.data)),
  updateMemberCapacities: (projectId: string, cycleId: string, items: Array<{ member: string; override_days: string | null; note?: string | null }>) =>
    api.patch(`/projects/${projectId}/cycles/${cycleId}/plan/member-capacities/`, { items }).then((r) => r.data),
  createAllocation: (projectId: string, cycleId: string, data: Record<string, unknown>) =>
    api.post(`/projects/${projectId}/cycles/${cycleId}/plan/allocations/`, data).then((r) => mapAllocation(r.data)),
  updateAllocation: (projectId: string, cycleId: string, allocationId: string, data: Record<string, unknown>) =>
    api.patch(`/projects/${projectId}/cycles/${cycleId}/plan/allocations/${allocationId}/`, data).then((r) => mapAllocation(r.data)),
  deleteAllocation: (projectId: string, cycleId: string, allocationId: string) =>
    api.delete(`/projects/${projectId}/cycles/${cycleId}/plan/allocations/${allocationId}/`),
  applyPlan: (projectId: string, cycleId: string) =>
    api.post(`/projects/${projectId}/cycles/${cycleId}/plan/apply/`).then((r) => mapPlan(r.data)),
}
```

```ts
// frontend/src/hooks/useCyclePlanning.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cyclePlanningService } from '@/services/cycle-planning.service'

export function useCyclePlan(projectId: string, cycleId: string) {
  return useQuery({
    queryKey: ['cycle-plan', projectId, cycleId],
    queryFn: () => cyclePlanningService.getPlan(projectId, cycleId),
    enabled: !!projectId && !!cycleId,
  })
}

export function useApplyCyclePlan(projectId: string, cycleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => cyclePlanningService.applyPlan(projectId, cycleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cycle-plan', projectId, cycleId] })
      qc.invalidateQueries({ queryKey: ['cycles', projectId] })
      qc.invalidateQueries({ queryKey: ['issues'] })
      qc.invalidateQueries({ queryKey: ['workload'] })
    },
  })
}
```

- [ ] **Step 4: Add a planning tab shell to `CycleDetail.tsx`**

```tsx
// create frontend/src/features/cycles/planning/CyclePlanningBoard.tsx
import { PageSpinner } from '@/components/ui/Spinner'
import { useCyclePlan } from '@/hooks/useCyclePlanning'

export function CyclePlanningBoard({ projectId, cycleId }: { projectId: string; cycleId: string }) {
  const { data: plan, isLoading } = useCyclePlan(projectId, cycleId)

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Capacidade do sprint</h3>
      {plan?.allocations.map((allocation) => (
        <div
          key={allocation.id}
          className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900"
        >
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{allocation.issueTitle}</p>
        </div>
      ))}
      {plan?.memberCapacities.map((capacity) => (
        <p key={capacity.id} className="text-sm text-gray-600 dark:text-gray-300">
          {capacity.memberName}
        </p>
      ))}
    </div>
  )
}

// modify frontend/src/features/cycles/CycleDetail.tsx
const DETAIL_TABS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'planning', label: 'Planejamento' },
  { id: 'issues', label: 'Issues' },
] as const

const [activeTab, setActiveTab] = useState<'resumo' | 'planning' | 'issues'>('resumo')

<div className="mb-6 flex items-center gap-2">
  {DETAIL_TABS.map((tab) => (
    <button
      key={tab.id}
      type="button"
      onClick={() => setActiveTab(tab.id)}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        activeTab === tab.id
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
          : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
      )}
    >
      {tab.label}
    </button>
  ))}
</div>

{activeTab === 'planning' ? (
  <CyclePlanningBoard projectId={projectId} cycleId={cycleId} cycle={cycle} />
) : activeTab === 'issues' ? (
  <CycleIssuesList issues={issues} />
) : (
  <CycleSummary progress={progress} pct={pct} />
)}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npm run test -- src/features/cycles/CycleDetailPlanning.test.tsx`

Expected: PASS with `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/planning.ts
git add frontend/src/types/index.ts
git add frontend/src/services/cycle-planning.service.ts
git add frontend/src/hooks/useCyclePlanning.ts
git add frontend/src/features/cycles/planning/CyclePlanningBoard.tsx
git add frontend/src/features/cycles/CycleDetail.tsx
git add frontend/src/features/cycles/CycleDetailPlanning.test.tsx
git commit -m "feat(frontend): add cycle planning types, hooks, and detail tab shell"
```

---

## Task 4: Build pure planning-board state helpers and render the member/backlog lanes

**Files:**
- Create: `frontend/src/features/cycles/planning/planning-board-state.ts`
- Create: `frontend/src/features/cycles/planning/planning-board-state.test.ts`
- Modify: `frontend/src/features/cycles/planning/CyclePlanningBoard.tsx`
- Create: `frontend/src/features/cycles/planning/PlanningSummary.tsx`
- Create: `frontend/src/features/cycles/planning/PlanningMemberColumn.tsx`
- Create: `frontend/src/features/cycles/planning/PlanningIssueCard.tsx`
- Create: `frontend/src/features/cycles/planning/CyclePlanningBoard.test.tsx`

- [ ] **Step 1: Write the failing helper tests**

```ts
// frontend/src/features/cycles/planning/planning-board-state.test.ts
import { describe, expect, it } from 'vitest'
import { computePlanningSummary, groupAllocationsByLane, moveIssueToLane } from './planning-board-state'

const capacities = [
  { member: 'member-1', memberName: 'Ana', defaultDays: '10.0', overrideDays: null },
  { member: 'member-2', memberName: 'Bruno', defaultDays: '5.0', overrideDays: '4.0' },
] as const

const allocations = [
  { id: 'a-1', issue: 'issue-1', issueTitle: 'Login', issueSequenceId: 12, plannedMember: 'member-1', plannedDays: '3.0', plannedStoryPoints: 5, rank: 0, note: null },
  { id: 'a-2', issue: 'issue-2', issueTitle: 'Billing', issueSequenceId: 14, plannedMember: 'member-1', plannedDays: '8.0', plannedStoryPoints: 8, rank: 1, note: null },
] as const

describe('planning board state', () => {
  it('computes totals and overload from planned days', () => {
    const summary = computePlanningSummary(capacities, allocations)
    expect(summary.totalAvailableDays).toBe(14)
    expect(summary.totalPlannedDays).toBe(11)
    expect(summary.totalPlannedStoryPoints).toBe(13)
    expect(summary.overloadedMembers).toEqual(['member-1'])
  })

  it('groups allocations by member lane and unassigned lane', () => {
    const lanes = groupAllocationsByLane(allocations)
    expect(lanes.member['member-1']).toHaveLength(2)
    expect(lanes.unassigned).toHaveLength(0)
  })

  it('moves an allocation between lanes while keeping rank order', () => {
    const next = moveIssueToLane(allocations, 'a-2', 'member-2')
    expect(next.find((item) => item.id === 'a-2')?.plannedMember).toBe('member-2')
    expect(next.find((item) => item.id === 'a-2')?.rank).toBe(0)
  })
})
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run: `cd frontend && npm run test -- src/features/cycles/planning/planning-board-state.test.ts`

Expected: FAIL because the helper file does not exist yet.

- [ ] **Step 3: Implement the pure helper module**

```ts
// frontend/src/features/cycles/planning/planning-board-state.ts
import type { SprintPlanAllocation, SprintPlanMemberCapacity } from '@/types'

export function parseDays(value: string | null | undefined) {
  return value == null ? 0 : Number(value)
}

export function availableDays(capacity: Pick<SprintPlanMemberCapacity, 'defaultDays' | 'overrideDays'>) {
  return parseDays(capacity.overrideDays ?? capacity.defaultDays)
}

export function computePlanningSummary(
  capacities: Array<Pick<SprintPlanMemberCapacity, 'member' | 'defaultDays' | 'overrideDays'>>,
  allocations: Array<Pick<SprintPlanAllocation, 'plannedMember' | 'plannedDays' | 'plannedStoryPoints'>>
) {
  const totalAvailableDays = capacities.reduce((sum, row) => sum + availableDays(row), 0)
  const totalPlannedDays = allocations.reduce((sum, row) => sum + parseDays(row.plannedDays), 0)
  const totalPlannedStoryPoints = allocations.reduce((sum, row) => sum + (row.plannedStoryPoints ?? 0), 0)

  const overloadedMembers = capacities
    .filter((capacity) => {
      const memberDays = allocations
        .filter((allocation) => allocation.plannedMember === capacity.member)
        .reduce((sum, allocation) => sum + parseDays(allocation.plannedDays), 0)
      return memberDays > availableDays(capacity)
    })
    .map((row) => row.member)

  return { totalAvailableDays, totalPlannedDays, totalPlannedStoryPoints, overloadedMembers }
}

export function groupAllocationsByLane(allocations: SprintPlanAllocation[]) {
  const member: Record<string, SprintPlanAllocation[]> = {}
  const unassigned = allocations.filter((row) => !row.plannedMember)
  allocations
    .filter((row) => row.plannedMember)
    .forEach((row) => {
      const laneId = row.plannedMember as string
      member[laneId] = [...(member[laneId] ?? []), row].sort((a, b) => a.rank - b.rank)
    })
  return { member, unassigned }
}

export function moveIssueToLane(allocations: SprintPlanAllocation[], allocationId: string, laneId: string | null) {
  const next = allocations.map((row) =>
    row.id === allocationId ? { ...row, plannedMember: laneId } : row
  )
  const laneRows = next
    .filter((row) => row.plannedMember === laneId)
    .sort((a, b) => a.rank - b.rank)
    .map((row, index) => ({ ...row, rank: index }))

  return next.map((row) => laneRows.find((laneRow) => laneRow.id === row.id) ?? row)
}
```

- [ ] **Step 4: Implement the board shell and render summary + member columns**

```tsx
// core shape for frontend/src/features/cycles/planning/CyclePlanningBoard.tsx
export function CyclePlanningBoard({ projectId, cycleId, cycle }: Props) {
  const { data: plan, isLoading } = useCyclePlan(projectId, cycleId)
  const { data: members = [] } = useProjectMembers(projectId)
  const { data: issueData = { results: [] } } = useIssues(projectId, {})
  const allocations = plan?.allocations ?? []
  const capacities = plan?.memberCapacities ?? []
  const summary = computePlanningSummary(capacities, allocations)

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <PlanningSummary cycle={cycle} plan={plan} summary={summary} />
      <div className="grid gap-4 xl:grid-cols-[320px_repeat(auto-fit,minmax(260px,1fr))]">
        <PlanningMemberColumn
          laneId="backlog"
          title="Backlog"
          subtitle="Issues disponiveis para planejar"
          issues={issueData.results.filter((issue) => !allocations.some((allocation) => allocation.issue === issue.id))}
        />
        {members.map((member) => (
          <PlanningMemberColumn
            key={member.memberId}
            laneId={member.memberId}
            title={member.memberName}
            capacity={capacities.find((row) => row.member === member.memberId) ?? null}
            allocations={allocations.filter((row) => row.plannedMember === member.memberId)}
          />
        ))}
      </div>
    </div>
  )
}
```

```tsx
// frontend/src/features/cycles/planning/CyclePlanningBoard.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CyclePlanningBoard } from './CyclePlanningBoard'

vi.mock('@/hooks/useCyclePlanning', () => ({
  useCyclePlan: () => ({
    data: {
      id: 'plan-1',
      cycleId: 'cycle-1',
      status: 'draft',
      memberCapacities: [
        { id: 'cap-1', member: 'member-1', memberName: 'Ana', memberAvatar: null, defaultDays: '10.0', overrideDays: null, note: null },
      ],
      allocations: [
        { id: 'alloc-1', issue: 'issue-1', issueTitle: 'Login', issueSequenceId: 12, plannedMember: 'member-1', plannedDays: '12.0', plannedStoryPoints: 13, rank: 0, note: null },
      ],
    },
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useProjects', () => ({
  useProjectMembers: () => ({
    data: [{ id: 'pm-1', memberId: 'member-1', memberName: 'Ana', memberAvatar: null }],
  }),
}))

vi.mock('@/hooks/useIssues', () => ({
  useIssues: () => ({ data: { results: [] } }),
}))

describe('CyclePlanningBoard', () => {
  it('shows overloaded member totals', () => {
    render(
      <CyclePlanningBoard
        projectId="project-1"
        cycleId="cycle-1"
        cycle={{ id: 'cycle-1', name: 'Sprint 1', startDate: '2026-04-01', endDate: '2026-04-14' } as any}
      />,
    )

    expect(screen.getByText('13')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Login')).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Run the helper and board tests to verify they pass**

Run:

```bash
cd frontend
npm run test -- src/features/cycles/planning/planning-board-state.test.ts src/features/cycles/planning/CyclePlanningBoard.test.tsx
```

Expected: PASS with overload summary and member lanes rendered.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/cycles/planning/planning-board-state.ts
git add frontend/src/features/cycles/planning/planning-board-state.test.ts
git add frontend/src/features/cycles/planning/CyclePlanningBoard.tsx
git add frontend/src/features/cycles/planning/PlanningSummary.tsx
git add frontend/src/features/cycles/planning/PlanningMemberColumn.tsx
git add frontend/src/features/cycles/planning/PlanningIssueCard.tsx
git add frontend/src/features/cycles/planning/CyclePlanningBoard.test.tsx
git commit -m "feat(frontend): add sprint planning board state and lane UI"
```

---

## Task 5: Wire capacity overrides, allocation mutations, drag/drop, and explicit apply modal

**Files:**
- Modify: `frontend/src/hooks/useCyclePlanning.ts`
- Modify: `frontend/src/features/cycles/planning/CyclePlanningBoard.tsx`
- Create: `frontend/src/features/cycles/planning/SprintCapacityEditor.tsx`
- Create: `frontend/src/features/cycles/planning/ApplySprintPlanModal.tsx`
- Create: `frontend/src/features/cycles/planning/ApplySprintPlanModal.test.tsx`

- [ ] **Step 1: Write the failing apply-modal test**

```tsx
// frontend/src/features/cycles/planning/ApplySprintPlanModal.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApplySprintPlanModal } from './ApplySprintPlanModal'

describe('ApplySprintPlanModal', () => {
  it('shows the apply summary and confirms the mutation', async () => {
    const onConfirm = vi.fn()
    render(
      <ApplySprintPlanModal
        open
        onClose={vi.fn()}
        onConfirm={onConfirm}
        summary={{
          issuesAddedToCycle: 2,
          assigneeChanges: 3,
          estimateDayChanges: 1,
          estimatePointChanges: 2,
        }}
      />,
    )

    expect(screen.getByText('2 issues serao adicionadas ao ciclo')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar plano' }))
    expect(onConfirm).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the modal test to verify it fails**

Run: `cd frontend && npm run test -- src/features/cycles/planning/ApplySprintPlanModal.test.tsx`

Expected: FAIL because the modal component does not exist yet.

- [ ] **Step 3: Extend the hooks with mutation helpers and invalidation**

```ts
// extend frontend/src/hooks/useCyclePlanning.ts
export function useUpdateCyclePlanMemberCapacities(projectId: string, cycleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: Array<{ member: string; override_days: string | null; note?: string | null }>) =>
      cyclePlanningService.updateMemberCapacities(projectId, cycleId, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cycle-plan', projectId, cycleId] })
    },
  })
}

export function useCreateCyclePlanAllocation(projectId: string, cycleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => cyclePlanningService.createAllocation(projectId, cycleId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cycle-plan', projectId, cycleId] }),
  })
}

export function useUpdateCyclePlanAllocation(projectId: string, cycleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ allocationId, data }: { allocationId: string; data: Record<string, unknown> }) =>
      cyclePlanningService.updateAllocation(projectId, cycleId, allocationId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cycle-plan', projectId, cycleId] }),
  })
}

export function useDeleteCyclePlanAllocation(projectId: string, cycleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (allocationId: string) => cyclePlanningService.deleteAllocation(projectId, cycleId, allocationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cycle-plan', projectId, cycleId] }),
  })
}
```

- [ ] **Step 4: Implement the apply modal and wire it to the board**

```tsx
// frontend/src/features/cycles/planning/ApplySprintPlanModal.tsx
export function ApplySprintPlanModal({ open, onClose, onConfirm, summary }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Aplicar plano do sprint" size="md">
      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
        <p>{summary.issuesAddedToCycle} issues serao adicionadas ao ciclo</p>
        <p>{summary.assigneeChanges} atribuicoes serao atualizadas</p>
        <p>{summary.estimateDayChanges} estimativas em dias serao atualizadas</p>
        <p>{summary.estimatePointChanges} estimativas em pontos serao atualizadas</p>
      </div>
      <ModalFooter>
        <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
        <Button type="button" onClick={onConfirm}>Aplicar plano</Button>
      </ModalFooter>
    </Modal>
  )
}
```

```tsx
// inside CyclePlanningBoard.tsx
const applyPlan = useApplyCyclePlan(projectId, cycleId)
const [applyOpen, setApplyOpen] = useState(false)
const applySummary = {
  issuesAddedToCycle: allocations.length,
  assigneeChanges: allocations.filter((row) => row.plannedMember).length,
  estimateDayChanges: allocations.filter((row) => row.plannedDays != null).length,
  estimatePointChanges: allocations.filter((row) => row.plannedStoryPoints != null).length,
}

<div className="flex items-center justify-end">
  <Button type="button" onClick={() => setApplyOpen(true)}>
    Aplicar plano
  </Button>
</div>

<ApplySprintPlanModal
  open={applyOpen}
  onClose={() => setApplyOpen(false)}
  summary={applySummary}
  onConfirm={() => applyPlan.mutate(undefined, { onSuccess: () => setApplyOpen(false) })}
/>
```

- [ ] **Step 5: Add drag/drop and inline capacity editing once the pure state helpers are already passing**

```tsx
// shape inside CyclePlanningBoard.tsx
<DndContext onDragEnd={(event) => {
  const activeId = String(event.active.id)
  const laneId = event.over ? String(event.over.id) : null
  if (!laneId) return
  const allocation = allocations.find((row) => row.id === activeId)
  if (allocation) {
    updateAllocation.mutate({
      allocationId: allocation.id,
      data: { planned_member: laneId === 'unassigned' ? null : laneId },
    })
  } else {
    const issue = backlogIssues.find((row) => row.id === activeId)
    if (issue) {
      createAllocation.mutate({
        issue: issue.id,
        planned_member: laneId === 'unassigned' ? null : laneId,
        planned_days: issue.estimateDays,
        planned_story_points: issue.estimatePoints,
        rank: allocations.filter((row) => row.plannedMember === laneId).length,
      })
    }
  }
}}>
```

- [ ] **Step 6: Run the focused frontend tests to verify they pass**

Run:

```bash
cd frontend
npm run test -- src/features/cycles/CycleDetailPlanning.test.tsx src/features/cycles/planning/planning-board-state.test.ts src/features/cycles/planning/CyclePlanningBoard.test.tsx src/features/cycles/planning/ApplySprintPlanModal.test.tsx
```

Expected: PASS with all planning UI tests green.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/hooks/useCyclePlanning.ts
git add frontend/src/features/cycles/planning/SprintCapacityEditor.tsx
git add frontend/src/features/cycles/planning/ApplySprintPlanModal.tsx
git add frontend/src/features/cycles/planning/ApplySprintPlanModal.test.tsx
git add frontend/src/features/cycles/planning/CyclePlanningBoard.tsx
git commit -m "feat(frontend): wire sprint planning mutations and explicit apply flow"
```

---

## Task 6: Run full verification and close the loop

**Files:**
- No new code files in this task; verification only

- [ ] **Step 1: Run the backend planning suite**

Run:

```bash
cd backend
python manage.py test apps.cycles.tests.test_planning_domain apps.cycles.tests.test_planning_api -v 2
```

Expected: PASS with both planning suites green.

- [ ] **Step 2: Run the focused frontend planning suite**

Run:

```bash
cd frontend
npm run test -- src/features/cycles/CycleDetailPlanning.test.tsx src/features/cycles/planning/planning-board-state.test.ts src/features/cycles/planning/CyclePlanningBoard.test.tsx src/features/cycles/planning/ApplySprintPlanModal.test.tsx
```

Expected: PASS with all planning tests green.

- [ ] **Step 3: Run frontend typecheck**

Run:

```bash
cd frontend
npm run typecheck
```

Expected: PASS with no new type errors.

- [ ] **Step 4: Manually verify the feature**

Check in the app:

```text
1. Open /projects/:projectId/cycles/:cycleId
2. Switch to the Planejamento tab
3. Confirm member columns show prorated capacity
4. Drag a backlog issue onto a member lane
5. Override one member's sprint capacity
6. Open the apply modal and verify the summary
7. Apply the plan
8. Reopen the issue detail and confirm assignee / estimate_days / estimate_points are updated
9. Open reports/resources and confirm downstream data still loads
```

- [ ] **Step 5: Commit the verified feature**

```bash
git status --short
git add backend/apps/cycles frontend/src/features/cycles frontend/src/hooks/useCyclePlanning.ts frontend/src/services/cycle-planning.service.ts frontend/src/types/planning.ts frontend/src/types/index.ts
git commit -m "feat: add sprint planning board with member capacity"
```

---

## Spec Coverage Check

- Separate planning assignments: covered by Task 1 model additions and Task 5 mutation wiring
- Dual metrics (`estimate_days` + story points): covered by Task 1 apply service and Task 4 card/summary UI
- Prorated capacity from monthly capacity: covered by Task 1 `_prorated_capacity()` and Task 2 GET plan bootstrap
- Per-sprint capacity override: covered by Task 2 capacity PATCH endpoint and Task 5 `SprintCapacityEditor`
- Explicit apply flow: covered by Task 2 apply endpoint and Task 5 apply modal
- Cycle-detail placement: covered by Task 3 tab integration
- Focused test coverage: covered by Tasks 1, 2, 3, 4, 5, and 6

## Placeholder Scan

- No `TODO`, `TBD`, or deferred validation placeholders remain
- The only intentionally deferred item from the spec (`cross-month cycles`) is handled concretely in Task 1 by raising a clear v1 validation error in the planning service

## Type Consistency Check

- Live issue fields use existing repo names: `estimate_days` / `estimate_points` on the backend and `estimateDays` / `estimatePoints` on the frontend
- Plan capacity fields consistently use `default_days` / `override_days` in API payloads and `defaultDays` / `overrideDays` in TypeScript
- Allocation fields consistently use `planned_member`, `planned_days`, and `planned_story_points` across service, hook, and UI layers
