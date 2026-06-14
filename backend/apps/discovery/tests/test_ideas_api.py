import uuid

from django.apps import apps
from django.test import TestCase
from rest_framework.test import APITestCase

from apps.discovery.models import Idea
from apps.projects.models import IssueState, Project
from apps.workspaces.models import Workspace, WorkspaceMember


class DiscoveryAppRegistrationTests(TestCase):
    databases = set()

    def test_discovery_app_is_installed(self):
        self.assertIsNotNone(apps.get_app_config("discovery"))


def make_workspace(name="WS", slug=None, keycloak_sub=None, email=None):
    slug = slug or f"ws-{uuid.uuid4().hex[:8]}"
    keycloak_sub = keycloak_sub or f"sub-{uuid.uuid4().hex[:8]}"
    email = email or f"{uuid.uuid4().hex[:8]}@x.com"
    workspace = Workspace.objects.create(name=name, slug=slug)
    member = WorkspaceMember.objects.create(
        workspace=workspace,
        keycloak_sub=keycloak_sub,
        email=email,
        name="Test Member",
        role="admin",
    )
    return workspace, member


class IdeaApiTests(APITestCase):
    def setUp(self):
        self.workspace, self.member = make_workspace(name="Primary WS")
        self.other_workspace, self.other_member = make_workspace(name="Other WS")
        Idea.objects.create(
            workspace=self.workspace,
            title="Portal de sugestões",
            status=Idea.Status.NEW,
            created_by=self.member,
        )
        Idea.objects.create(
            workspace=self.other_workspace,
            title="Ideia de outro workspace",
            status=Idea.Status.NEW,
            created_by=self.other_member,
        )
        self.client.force_authenticate(user=self.member)

    def test_list_only_returns_ideas_for_active_workspace(self):
        response = self.client.get("/api/v1/discovery/ideas/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Portal de sugestões")

    def test_create_idea_sets_workspace_from_authenticated_member(self):
        response = self.client.post(
            "/api/v1/discovery/ideas/",
            {"title": "Sistema de onboarding", "status": "new"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["title"], "Sistema de onboarding")
        self.assertEqual(str(response.data["workspace"]), str(self.workspace.id))

    def test_patch_idea_updates_status(self):
        idea = Idea.objects.filter(workspace=self.workspace).first()
        response = self.client.patch(
            f"/api/v1/discovery/ideas/{idea.id}/",
            {"status": "reviewing"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "reviewing")

    def test_cannot_access_idea_from_other_workspace(self):
        other_idea = Idea.objects.filter(workspace=self.other_workspace).first()
        response = self.client.get(f"/api/v1/discovery/ideas/{other_idea.id}/")
        self.assertEqual(response.status_code, 404)


class IdeaPromoteApiTests(APITestCase):
    def setUp(self):
        self.workspace, self.member = make_workspace(name="Promote WS")
        self.project = Project.objects.create(
            workspace=self.workspace,
            name="Projeto Alpha",
            identifier="ALPHA",
            created_by=self.member,
        )
        self.state = IssueState.objects.create(
            project=self.project,
            name="Backlog",
            color="#aaaaaa",
            sequence=1,
            is_default=True,
        )
        self.idea = Idea.objects.create(
            workspace=self.workspace,
            title="Feature para promover",
            status=Idea.Status.PLANNED,
            created_by=self.member,
            project=self.project,
        )
        self.client.force_authenticate(user=self.member)

    def test_promote_idea_to_issue_creates_linked_issue(self):
        response = self.client.post(
            f"/api/v1/discovery/ideas/{self.idea.id}/promote/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(response.data["promoted_issue"])

    def test_promote_idea_without_project_returns_400(self):
        idea_no_project = Idea.objects.create(
            workspace=self.workspace,
            title="Sem projeto",
            status=Idea.Status.NEW,
            created_by=self.member,
        )
        response = self.client.post(
            f"/api/v1/discovery/ideas/{idea_no_project.id}/promote/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
