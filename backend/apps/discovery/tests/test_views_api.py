from rest_framework.test import APITestCase

from apps.discovery.models import Idea
from apps.workspaces.models import Workspace, WorkspaceMember


def make_workspace(name="WS", slug="ws-field-test", keycloak_sub="sub-field-admin", email="field-admin@x.com"):
    workspace = Workspace.objects.create(name=name, slug=slug)
    member = WorkspaceMember.objects.create(
        workspace=workspace,
        keycloak_sub=keycloak_sub,
        email=email,
        name="Field Admin",
        role="admin",
    )
    return workspace, member


class DiscoveryFieldApiTests(APITestCase):
    def setUp(self):
        self.workspace, self.member = make_workspace()
        self.idea = Idea.objects.create(
            workspace=self.workspace,
            title="Portal de feedback",
            status=Idea.Status.NEW,
            created_by=self.member,
        )
        self.client.force_authenticate(user=self.member)

    def test_workspace_can_create_field_definition(self):
        response = self.client.post(
            "/api/v1/discovery/fields/",
            {"label": "Impact", "key": "impact", "type": "number"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["label"], "Impact")
        self.assertEqual(response.data["key"], "impact")

    def test_idea_can_store_custom_field_value(self):
        field_response = self.client.post(
            "/api/v1/discovery/fields/",
            {"label": "Impact", "key": "impact", "type": "number"},
            format="json",
        )

        response = self.client.patch(
            f"/api/v1/discovery/ideas/{self.idea.id}/",
            {"field_values": [{"field": field_response.data["id"], "number_value": 8}]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["field_values"]), 1)
        self.assertEqual(response.data["field_values"][0]["number_value"], 8.0)

    def test_workspace_can_save_a_table_view(self):
        response = self.client.post(
            "/api/v1/discovery/views/",
            {
                "name": "Priorização",
                "view_type": "table",
                "visible_columns": ["title", "status", "score"],
                "group_by": None,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], "Priorização")
        self.assertEqual(response.data["view_type"], "table")
