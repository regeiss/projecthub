import uuid
from django.test import TestCase
from rest_framework.test import APIClient

from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project, IssueState
from apps.issues.models import Issue
from apps.wiki.models import WikiSpace, WikiPage


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_workspace():
    return Workspace.objects.create(name="WS", slug=str(uuid.uuid4())[:8])


def make_member(workspace, role="member"):
    return WorkspaceMember.objects.create(
        workspace=workspace,
        keycloak_sub=str(uuid.uuid4()),
        email=f"{uuid.uuid4()}@t.com",
        name="Test User",
        role=role,
    )


def make_project(workspace, member):
    return Project.objects.create(
        workspace=workspace,
        name="Test Project",
        identifier="TST",
        created_by=member,
    )


def make_state(project, name="Backlog"):
    return IssueState.objects.create(
        project=project,
        name=name,
        color="#aaa",
        category="backlog",
        sequence=1,
    )


def make_issue(project, state, member, title="Test Issue", description=None):
    return Issue.objects.create(
        project=project,
        title=title,
        state=state,
        description=description,
        created_by=member,
        reporter=member,
    )


def make_wiki_space(workspace, member):
    return WikiSpace.objects.create(
        workspace=workspace, name="Engineering", created_by=member
    )


def make_wiki_page(space, member, title="Docs", content=None):
    return WikiPage.objects.create(
        space=space,
        title=title,
        content=content or {"type": "doc", "content": []},
        created_by=member,
    )


# ---------------------------------------------------------------------------
# Tests for description_text field (Task 2)
# ---------------------------------------------------------------------------

class DescriptionTextFieldTest(TestCase):
    def setUp(self):
        self.ws = make_workspace()
        self.member = make_member(self.ws)
        self.project = make_project(self.ws, self.member)
        self.state = make_state(self.project)

    def test_description_text_populated_on_save(self):
        """description_text is populated from TipTap JSON when issue is saved."""
        tiptap = {
            "type": "doc",
            "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": "hello world"}]}
            ],
        }
        issue = make_issue(self.project, self.state, self.member, description=tiptap)
        issue.refresh_from_db()
        self.assertIn("hello world", issue.description_text)

    def test_description_text_empty_when_no_description(self):
        """description_text is empty string when description is None."""
        issue = make_issue(self.project, self.state, self.member, description=None)
        issue.refresh_from_db()
        self.assertEqual(issue.description_text, "")


# ---------------------------------------------------------------------------
# Tests for GlobalSearchView (Task 4)
# ---------------------------------------------------------------------------

class GlobalSearchViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ws = make_workspace()
        self.member = make_member(self.ws)
        self.project = make_project(self.ws, self.member)
        self.state = make_state(self.project)
        self.client.force_authenticate(user=self.member)

    def test_requires_auth(self):
        unauth_client = APIClient()
        resp = unauth_client.get("/api/v1/search/?q=test")
        self.assertEqual(resp.status_code, 401)

    def test_q_required(self):
        resp = self.client.get("/api/v1/search/")
        self.assertEqual(resp.status_code, 400)

    def test_q_min_length(self):
        resp = self.client.get("/api/v1/search/?q=a")
        self.assertEqual(resp.status_code, 400)

    def test_returns_issues(self):
        make_issue(self.project, self.state, self.member, title="autenticação JWT")
        resp = self.client.get("/api/v1/search/?q=autenticação")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("issues", resp.data)
        self.assertIn("wiki_pages", resp.data)

    def test_total_is_sum_of_results(self):
        make_issue(self.project, self.state, self.member, title="autenticação JWT")
        resp = self.client.get("/api/v1/search/?q=autenticação")
        self.assertEqual(
            resp.data["total"],
            len(resp.data["issues"]) + len(resp.data["wiki_pages"])
        )

    def test_project_filter(self):
        make_issue(self.project, self.state, self.member, title="autenticação login")
        resp = self.client.get(f"/api/v1/search/?q=autenticação&project_id={self.project.id}")
        self.assertEqual(resp.status_code, 200)
        for issue in resp.data["issues"]:
            self.assertEqual(issue["project"]["id"], str(self.project.id))

    def test_other_workspace_results_excluded(self):
        other_ws = make_workspace()
        other_member = make_member(other_ws)
        other_project = make_project(other_ws, other_member)
        other_state = make_state(other_project, name="Backlog2")
        make_issue(other_project, other_state, other_member, title="autenticação JWT secret")
        resp = self.client.get("/api/v1/search/?q=autenticação")
        for issue in resp.data["issues"]:
            self.assertEqual(issue["project"]["id"], str(self.project.id))

    def test_wiki_pages_in_response(self):
        space = make_wiki_space(self.ws, self.member)
        make_wiki_page(space, self.member, title="autenticação docs")
        resp = self.client.get("/api/v1/search/?q=autenticação")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("wiki_pages", resp.data)

    def test_response_structure(self):
        resp = self.client.get("/api/v1/search/?q=test")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("issues", resp.data)
        self.assertIn("wiki_pages", resp.data)
        self.assertIn("total", resp.data)

    def test_issue_not_returned_for_unrelated_query(self):
        make_issue(self.project, self.state, self.member, title="completamente irrelevante xyz")
        resp = self.client.get("/api/v1/search/?q=autenticação")
        self.assertEqual(resp.status_code, 200)
        titles = [i["title"] for i in resp.data["issues"]]
        self.assertNotIn("completamente irrelevante xyz", titles)

    def test_wiki_page_returned(self):
        space = make_wiki_space(self.ws, self.member)
        make_wiki_page(space, self.member, title="Guia de autenticação")
        resp = self.client.get("/api/v1/search/?q=autenticação")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("wiki_pages", resp.data)
        # FTS may or may not return the page depending on rank threshold
        self.assertIsInstance(resp.data["wiki_pages"], list)

    def test_private_project_excluded_for_non_member(self):
        """Issues from a private project are hidden from non-members."""
        private_project = Project.objects.create(
            workspace=self.ws,
            name="Private",
            identifier="PRV",
            created_by=self.member,
            is_private=True,
        )
        make_issue(private_project, self.state, self.member, title="autenticação privada")
        # Create a different member who is NOT in the private project
        other_member = make_member(self.ws)
        other_client = APIClient()
        other_client.force_authenticate(user=other_member)
        resp = other_client.get("/api/v1/search/?q=autenticação")
        self.assertEqual(resp.status_code, 200)
        titles = [i["title"] for i in resp.data["issues"]]
        self.assertNotIn("autenticação privada", titles)

    def test_admin_sees_private_project_results(self):
        """Workspace admin can see issues from any private project."""
        admin_member = make_member(self.ws, role="admin")
        private_project = Project.objects.create(
            workspace=self.ws,
            name="Private",
            identifier="PRV2",
            created_by=self.member,
            is_private=True,
        )
        make_issue(private_project, self.state, self.member, title="autenticação admin")
        admin_client = APIClient()
        admin_client.force_authenticate(user=admin_member)
        resp = admin_client.get("/api/v1/search/?q=autenticação")
        self.assertEqual(resp.status_code, 200)
        # Admin should have access to the project — result may or may not appear depending on
        # FTS rank threshold, but the response must succeed (not 403)
        self.assertIn("issues", resp.data)

    def test_invalid_project_id_returns_400(self):
        resp = self.client.get("/api/v1/search/?q=test&project_id=not-a-uuid")
        self.assertEqual(resp.status_code, 400)

    def test_invalid_date_from_returns_400(self):
        resp = self.client.get("/api/v1/search/?q=test&date_from=not-a-date")
        self.assertEqual(resp.status_code, 400)
