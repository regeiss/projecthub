from django.test import TestCase
from rest_framework.test import APIClient

from apps.workspaces.models import WorkspaceMember


class MeViewWithoutWorkspaceTest(TestCase):
    def test_returns_200_for_authenticated_user_without_workspace(self):
        client = APIClient()
        user = WorkspaceMember(
            keycloak_sub="kc-new-user",
            email="new@test.com",
            name="Novo Usuario",
            role="member",
        )
        client.force_authenticate(user=user)

        response = client.get("/api/v1/auth/me/")

        self.assertEqual(response.status_code, 200, response.data)
        self.assertIsNone(response.data["workspace"])
        self.assertEqual(response.data["email"], "new@test.com")
