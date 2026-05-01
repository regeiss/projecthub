from datetime import date, timedelta
from decimal import Decimal

from django.db import IntegrityError
from django.db import transaction
from django.test import TestCase
from django.utils import timezone

from apps.cycles.models import (
    Cycle,
    CycleIssue,
    SprintPlanAllocation,
    SprintPlanMemberCapacity,
)
from apps.cycles.planning import apply_sprint_plan, ensure_sprint_plan
from apps.issues.models import Issue
from apps.projects.models import IssueState, Project, ProjectMember
from apps.resources.models import MemberCapacity
from apps.resources.utils import get_working_days
from apps.workspaces.models import Workspace, WorkspaceMember


def make_workspace(slug="ws-cycle-plan"):
    workspace = Workspace.objects.create(name="Workspace", slug=slug)
    admin = WorkspaceMember.objects.create(
        workspace=workspace,
        keycloak_sub=f"{slug}-admin",
        email=f"{slug}-admin@test.com",
        name="Admin",
        role="admin",
    )
    return workspace, admin


def make_project(workspace, creator, identifier="CYC"):
    project = Project.objects.create(
        workspace=workspace,
        name="Cycle Project",
        identifier=identifier,
        created_by=creator,
    )
    ProjectMember.objects.create(project=project, member=creator, role="admin")
    return project


def make_member(workspace, project, name, key):
    member = WorkspaceMember.objects.create(
        workspace=workspace,
        keycloak_sub=key,
        email=f"{key}@test.com",
        name=name,
        role="member",
    )
    ProjectMember.objects.create(project=project, member=member, role="member")
    return member


def make_state(project):
    return IssueState.objects.create(
        project=project,
        name="Backlog",
        color="#aaa",
        category="backlog",
        sequence=1,
    )


def make_issue(project, state, actor, title, sequence_id):
    return Issue.objects.create(
        project=project,
        title=title,
        state=state,
        priority="none",
        reporter=actor,
        created_by=actor,
        sequence_id=sequence_id,
    )


class SprintPlanningDomainTests(TestCase):
    def setUp(self):
        self.workspace, self.actor = make_workspace()
        self.project = make_project(self.workspace, self.actor)
        self.member = make_member(self.workspace, self.project, "Teammate", "teammate")
        self.state = make_state(self.project)
        self.cycle = Cycle.objects.create(
            project=self.project,
            name="Sprint 1",
            start_date=date(2026, 4, 28),
            end_date=date(2026, 5, 9),
            created_by=self.actor,
        )

    def test_ensure_sprint_plan_bootstraps_prorated_member_capacity_once(self):
        MemberCapacity.objects.create(
            member=self.member,
            year=2026,
            month=4,
            available_days=Decimal("22.0"),
        )
        MemberCapacity.objects.create(
            member=self.member,
            year=2026,
            month=5,
            available_days=Decimal("10.0"),
        )

        plan = ensure_sprint_plan(self.cycle, self.actor)
        same_plan = ensure_sprint_plan(self.cycle, self.actor)

        capacity = plan.member_capacities.get(member=self.member)
        april_working = get_working_days(date(2026, 4, 1), date(2026, 4, 30))
        may_working = get_working_days(date(2026, 5, 1), date(2026, 5, 31))
        expected = (
            Decimal("22.0") * Decimal(get_working_days(date(2026, 4, 28), date(2026, 4, 30))) / Decimal(april_working)
            + Decimal("10.0") * Decimal(get_working_days(date(2026, 5, 1), date(2026, 5, 9))) / Decimal(may_working)
        ).quantize(Decimal("0.01"))

        self.assertEqual(plan.id, same_plan.id)
        self.assertEqual(plan.status, "draft")
        self.assertEqual(plan.member_capacities.count(), 2)
        self.assertEqual(capacity.default_days, expected)
        self.assertIsNone(capacity.override_days)
        self.assertIsNone(capacity.note)

    def test_ensure_sprint_plan_bootstraps_allocations_from_cycle_issues(self):
        issue = make_issue(self.project, self.state, self.actor, "Seeded issue", 1)
        issue.assignee = self.member
        issue.estimate_days = 3.5
        issue.estimate_points = 8
        issue.save(update_fields=["assignee", "estimate_days", "estimate_points"])
        CycleIssue.objects.create(cycle=self.cycle, issue=issue)

        plan = ensure_sprint_plan(self.cycle, self.actor)

        allocation = plan.allocations.get(issue=issue)
        self.assertEqual(allocation.planned_member, self.member)
        self.assertEqual(allocation.planned_days, Decimal("3.50"))
        self.assertEqual(allocation.planned_story_points, 8)
        self.assertEqual(allocation.rank, 1)
        self.assertIsNone(allocation.note)

    def test_ensure_sprint_plan_adds_capacity_for_member_added_after_plan_creation(self):
        plan = ensure_sprint_plan(self.cycle, self.actor)
        late_member = make_member(self.workspace, self.project, "Late Joiner", "late-joiner")
        MemberCapacity.objects.create(
            member=late_member,
            year=2026,
            month=4,
            available_days=Decimal("22.0"),
        )
        MemberCapacity.objects.create(
            member=late_member,
            year=2026,
            month=5,
            available_days=Decimal("10.0"),
        )

        refreshed_plan = ensure_sprint_plan(self.cycle, self.actor)
        capacity = refreshed_plan.member_capacities.get(member=late_member)
        april_working = get_working_days(date(2026, 4, 1), date(2026, 4, 30))
        may_working = get_working_days(date(2026, 5, 1), date(2026, 5, 31))
        expected = (
            Decimal("22.0") * Decimal(get_working_days(date(2026, 4, 28), date(2026, 4, 30))) / Decimal(april_working)
            + Decimal("10.0") * Decimal(get_working_days(date(2026, 5, 1), date(2026, 5, 9))) / Decimal(may_working)
        ).quantize(Decimal("0.01"))

        self.assertEqual(plan.id, refreshed_plan.id)
        self.assertEqual(refreshed_plan.member_capacities.count(), 3)
        self.assertEqual(capacity.default_days, expected)
        self.assertIsNone(capacity.override_days)

    def test_apply_sprint_plan_updates_live_issue_fields_and_marks_plan_applied(self):
        issue = make_issue(self.project, self.state, self.actor, "Planned issue", 2)

        plan = ensure_sprint_plan(self.cycle, self.actor)
        plan.allocations.create(
            issue=issue,
            planned_member=self.member,
            planned_days=Decimal("5.25"),
            planned_story_points=13,
            rank=1,
        )

        apply_sprint_plan(plan, self.actor)

        issue.refresh_from_db()
        plan.refresh_from_db()

        self.assertEqual(issue.assignee, self.member)
        self.assertEqual(issue.estimate_days, 5.25)
        self.assertEqual(issue.estimate_points, 13)
        self.assertTrue(CycleIssue.objects.filter(cycle=self.cycle, issue=issue).exists())
        self.assertEqual(plan.status, "applied")
        self.assertIsNotNone(plan.applied_at)
        self.assertEqual(plan.applied_by, self.actor)

    def test_apply_sprint_plan_rejects_issue_from_another_project(self):
        other_project = make_project(self.workspace, self.actor, identifier="OTH")
        other_state = make_state(other_project)
        foreign_issue = make_issue(
            other_project, other_state, self.actor, "Foreign issue", 3
        )

        plan = ensure_sprint_plan(self.cycle, self.actor)
        plan.allocations.create(
            issue=foreign_issue,
            planned_member=self.member,
            planned_days=Decimal("1.00"),
            planned_story_points=3,
            rank=1,
        )

        with self.assertRaisesMessage(
            ValueError, "Sprint plan allocation issue must belong to the cycle project."
        ):
            apply_sprint_plan(plan, self.actor)

        self.assertFalse(
            CycleIssue.objects.filter(cycle=self.cycle, issue=foreign_issue).exists()
        )

    def test_apply_sprint_plan_advances_issue_updated_at(self):
        issue = make_issue(self.project, self.state, self.actor, "Timestamp issue", 4)
        stale_time = timezone.now() - timedelta(days=3)
        Issue.objects.filter(id=issue.id).update(updated_at=stale_time)
        issue.refresh_from_db()

        plan = ensure_sprint_plan(self.cycle, self.actor)
        plan.allocations.create(
            issue=issue,
            planned_member=self.member,
            planned_days=Decimal("2.00"),
            planned_story_points=5,
            rank=1,
        )

        apply_sprint_plan(plan, self.actor)

        issue.refresh_from_db()
        self.assertGreater(issue.updated_at, stale_time)

    def test_apply_sprint_plan_is_noop_when_plan_is_already_applied(self):
        issue = make_issue(self.project, self.state, self.actor, "Already applied", 5)
        stale_time = timezone.now() - timedelta(days=2)

        plan = ensure_sprint_plan(self.cycle, self.actor)
        plan.allocations.create(
            issue=issue,
            planned_member=self.member,
            planned_days=Decimal("2.00"),
            planned_story_points=5,
            rank=1,
        )
        plan.status = "applied"
        plan.applied_at = stale_time
        plan.applied_by = self.actor
        plan.save(update_fields=["status", "applied_at", "applied_by", "updated_at"])

        apply_sprint_plan(plan, self.member)

        issue.refresh_from_db()
        plan.refresh_from_db()

        self.assertIsNone(issue.assignee)
        self.assertIsNone(issue.estimate_days)
        self.assertIsNone(issue.estimate_points)
        self.assertEqual(plan.applied_at, stale_time)
        self.assertEqual(plan.applied_by, self.actor)

    def test_planning_numeric_fields_enforce_non_negative_constraints(self):
        plan = ensure_sprint_plan(self.cycle, self.actor)
        actor_capacity = plan.member_capacities.get(member=self.actor)
        issue_one = make_issue(self.project, self.state, self.actor, "Constraint issue 1", 6)
        issue_two = make_issue(self.project, self.state, self.actor, "Constraint issue 2", 7)

        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                SprintPlanMemberCapacity.objects.filter(id=actor_capacity.id).update(
                    default_days=Decimal("-1.00")
                )

        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                SprintPlanMemberCapacity.objects.filter(id=actor_capacity.id).update(
                    override_days=Decimal("-0.50")
                )

        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                SprintPlanAllocation.objects.create(
                    plan=plan,
                    issue=issue_one,
                    planned_member=self.member,
                    planned_days=Decimal("-1.00"),
                    planned_story_points=1,
                    rank=1,
                )

        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                SprintPlanAllocation.objects.create(
                    plan=plan,
                    issue=issue_two,
                    planned_member=self.member,
                    planned_days=Decimal("1.00"),
                    planned_story_points=-1,
                    rank=1,
                )
