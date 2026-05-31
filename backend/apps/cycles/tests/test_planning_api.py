from datetime import date
from decimal import Decimal

from rest_framework.test import APITestCase

from apps.cycles.models import Cycle, SprintPlanMemberCapacity
from apps.cycles.planning import ensure_sprint_plan
from apps.issues.models import Issue
from apps.resources.models import MemberCapacity
from .test_planning_domain import make_member, make_project, make_state, make_workspace


class SprintPlanApiTest(APITestCase):
    def setUp(self):
        self.workspace, self.admin = make_workspace("ws-plan-api")
        self.project = make_project(self.workspace, self.admin, identifier="PLAN")
        self.dev = make_member(self.workspace, self.project, "Dev", "sub-dev")
        self.state = make_state(self.project)
        self.cycle = Cycle.objects.create(
            project=self.project,
            name="Sprint 1",
            start_date=date(2026, 4, 1),
            end_date=date(2026, 4, 14),
            status="draft",
            created_by=self.admin,
        )
        self.issue = Issue.objects.create(
            project=self.project,
            title="API planned issue",
            state=self.state,
            priority="medium",
            reporter=self.admin,
            created_by=self.admin,
        )
        MemberCapacity.objects.create(
            member=self.dev,
            year=2026,
            month=4,
            available_days="22.0",
        )
        self.client.force_authenticate(user=self.admin)

    def test_get_plan_creates_it_and_returns_member_capacities(self):
        response = self.client.get(
            f"/api/v1/projects/{self.project.id}/cycles/{self.cycle.id}/plan/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "draft")
        self.assertEqual(len(response.data["member_capacities"]), 2)
        self.assertEqual(response.data["allocations"], [])

    def test_patch_member_capacity_updates_override_days(self):
        ensure_sprint_plan(self.cycle, self.admin)

        response = self.client.patch(
            f"/api/v1/projects/{self.project.id}/cycles/{self.cycle.id}/plan/member-capacities/",
            {"items": [{"member": str(self.dev.id), "override_days": "8.00"}]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(str(response.data[0]["member"]), str(self.dev.id))
        self.assertEqual(response.data[0]["override_days"], "8.00")
        capacity = SprintPlanMemberCapacity.objects.get(
            plan__cycle=self.cycle,
            member=self.dev,
        )
        self.assertEqual(capacity.override_days, Decimal("8.00"))

    def test_apply_endpoint_updates_issue_fields(self):
        plan = ensure_sprint_plan(self.cycle, self.admin)
        plan.allocations.create(
            issue=self.issue,
            planned_member=self.dev,
            planned_days="2.50",
            planned_story_points=3,
            rank=0,
        )

        response = self.client.post(
            f"/api/v1/projects/{self.project.id}/cycles/{self.cycle.id}/plan/apply/"
        )

        self.assertEqual(response.status_code, 200)
        self.issue.refresh_from_db()
        self.assertEqual(str(self.issue.assignee_id), str(self.dev.id))
        self.assertEqual(self.issue.estimate_days, 2.5)
        self.assertEqual(self.issue.estimate_points, 3)
        self.assertEqual(response.data["status"], "applied")

    def test_create_allocation_rejects_negative_story_points(self):
        plan = ensure_sprint_plan(self.cycle, self.admin)

        response = self.client.post(
            f"/api/v1/projects/{self.project.id}/cycles/{self.cycle.id}/plan/allocations/",
            {
                "issue": str(self.issue.id),
                "planned_member": str(self.dev.id),
                "planned_days": "1.00",
                "planned_story_points": -1,
                "rank": 0,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(plan.allocations.filter(issue=self.issue).exists())
