import uuid

from django.test import TestCase
from rest_framework.test import APIClient

from apps.workspaces.models import AccessRequest, Workspace, WorkspaceMember


def make_workspace(name="Secretaria de TI", slug="secretaria-ti"):
    return Workspace.objects.create(name=name, slug=slug)


def make_member(workspace, role="admin", sub=None, email="admin@test.com", name="Admin"):
    return WorkspaceMember.objects.create(
        workspace=workspace,
        keycloak_sub=sub or str(uuid.uuid4()),
        email=email,
        name=name,
        role=role,
    )


def make_user_without_workspace(sub="kc-new-user", email="new@test.com", name="Novo Usuario"):
    return WorkspaceMember(
        keycloak_sub=sub,
        email=email,
        name=name,
        role="member",
    )


class AccessRequestCreateAndMineViewTest(TestCase):
    def setUp(self):
        self.workspace = make_workspace()
        self.client = APIClient()
        self.user = make_user_without_workspace()
        self.client.force_authenticate(user=self.user)

    def test_create_access_request_returns_201_and_links_workspace(self):
        response = self.client.post(
            "/api/v1/workspaces/access-requests/",
            {
                "secretaria": "CTIBD",
                "workspace_name": "Secretaria de TI",
                "reason": "Preciso acompanhar projetos.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        request = AccessRequest.objects.get(keycloak_sub="kc-new-user")
        self.assertEqual(request.workspace_id, self.workspace.id)
        self.assertEqual(request.status, AccessRequest.Status.PENDING)
        self.assertEqual(request.previous_denial_count, 0)

    def test_create_rejects_second_pending_request(self):
        AccessRequest.objects.create(
            workspace=self.workspace,
            workspace_name=self.workspace.name,
            keycloak_sub="kc-new-user",
            email="new@test.com",
            name="Novo Usuario",
            secretaria="CTIBD",
            reason="Primeira tentativa",
        )

        response = self.client.post(
            "/api/v1/workspaces/access-requests/",
            {
                "secretaria": "CTIBD",
                "workspace_name": "Secretaria de TI",
                "reason": "Segunda tentativa",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 409, response.data)
        self.assertEqual(response.data["detail"], "pending_exists")

    def test_my_access_requests_lists_requests_for_current_user(self):
        AccessRequest.objects.create(
            workspace=self.workspace,
            workspace_name=self.workspace.name,
            keycloak_sub="kc-new-user",
            email="new@test.com",
            name="Novo Usuario",
            secretaria="CTIBD",
            reason="Preciso acompanhar projetos.",
        )
        AccessRequest.objects.create(
            workspace=self.workspace,
            workspace_name=self.workspace.name,
            keycloak_sub="other-user",
            email="other@test.com",
            name="Outro",
            secretaria="Outra",
            reason="Nao deveria aparecer",
        )

        response = self.client.get("/api/v1/workspaces/access-requests/me/")

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["keycloak_sub"], "kc-new-user")


class WorkspaceAccessRequestAdminViewTest(TestCase):
    def setUp(self):
        self.workspace = make_workspace()
        self.extra_workspace = make_workspace(name="Gabinete", slug="gabinete")
        self.admin = make_member(self.workspace, role="admin", sub="admin-sub")
        self.member = make_member(self.workspace, role="member", sub="member-sub")
        self.client = APIClient()
        self.list_url = f"/api/v1/workspaces/{self.workspace.slug}/access-requests/"

    def make_request(self, **overrides):
        data = {
            "workspace": self.workspace,
            "workspace_name": self.workspace.name,
            "keycloak_sub": "kc-target",
            "email": "target@test.com",
            "name": "Target User",
            "secretaria": "CTIBD",
            "reason": "Preciso acessar o sistema.",
        }
        data.update(overrides)
        return AccessRequest.objects.create(**data)

    def test_non_admin_cannot_list_requests(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 403)

    def test_admin_lists_pending_requests(self):
        request = self.make_request()
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.list_url, {"status": "pending"})

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(request.id))

    def test_admin_can_approve_request_and_create_memberships(self):
        request = self.make_request()
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            f"{self.list_url}{request.id}/resolve/",
            {"action": "approve", "extra_workspace_ids": [str(self.extra_workspace.id)], "role": "guest"},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        request.refresh_from_db()
        self.assertEqual(request.status, AccessRequest.Status.APPROVED)
        self.assertEqual(request.resolved_by, "admin-sub")
        self.assertTrue(
            WorkspaceMember.objects.filter(workspace=self.workspace, keycloak_sub="kc-target", role="guest").exists()
        )
        self.assertTrue(
            WorkspaceMember.objects.filter(workspace=self.extra_workspace, keycloak_sub="kc-target", role="guest").exists()
        )

    def test_admin_can_deny_request_with_reason(self):
        request = self.make_request()
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            f"{self.list_url}{request.id}/resolve/",
            {"action": "deny", "denial_reason": "Sem vagas disponiveis."},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        request.refresh_from_db()
        self.assertEqual(request.status, AccessRequest.Status.DENIED)
        self.assertEqual(request.denial_reason, "Sem vagas disponiveis.")
