from django.test import TestCase
from rest_framework.test import APIClient

from apps.issues.models import Issue
from apps.projects.models import IssueState, Project
from apps.workspaces.models import Workspace, WorkspaceMember


def make_workspace():
    return Workspace.objects.create(name="WS", slug="ws")


def make_member(workspace, role="admin"):
    return WorkspaceMember.objects.create(
        workspace=workspace,
        email=f"{role}@test.com",
        role=role,
        name=role.capitalize(),
    )


def make_project(workspace, member):
    return Project.objects.create(
        workspace=workspace,
        name="Proj",
        identifier="PROJ",
        created_by=member,
    )


def make_state(project, category="backlog"):
    return IssueState.objects.create(
        project=project,
        name=category.capitalize(),
        color="#aaaaaa",
        category=category,
        sequence=1,
    )


class CpmGanttViewTests(TestCase):
    def setUp(self):
        self.workspace = make_workspace()
        self.member = make_member(self.workspace)
        self.project = make_project(self.workspace, self.member)
        self.state = make_state(self.project)
        self.client = APIClient()
        self.client.force_authenticate(user=self.member)

    def _issue(self, title, issue_type="task", start_date=None):
        return Issue.objects.create(
            project=self.project,
            title=title,
            state=self.state,
            priority="none",
            type=issue_type,
            reporter=self.member,
            created_by=self.member,
            start_date=start_date,
        )

    def test_gantt_does_not_return_epic_issues(self):
        self._issue("Epic container", issue_type="epic", start_date="2026-05-01")
        task = self._issue("Task child", issue_type="task", start_date="2026-05-02")

        response = self.client.get(f"/api/v1/cpm/projects/{self.project.id}/gantt/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["tasks"]), 1)
        self.assertEqual(response.data["tasks"][0]["id"], str(task.id))
        self.assertNotIn("Epic container", response.data["tasks"][0]["name"])
