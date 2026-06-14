from rest_framework.test import APITestCase

from apps.discovery.models import Idea
from apps.workspaces.models import Workspace, WorkspaceMember


class IdeaScorecardApiTests(APITestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name="Scoring WS", slug="ws-scoring")
        self.member = WorkspaceMember.objects.create(
            workspace=self.workspace,
            keycloak_sub="sub-scoring-admin",
            email="scoring@x.com",
            name="Scoring Admin",
            role="admin",
        )
        self.idea = Idea.objects.create(
            workspace=self.workspace,
            title="Painel analítico",
            status=Idea.Status.NEW,
            created_by=self.member,
        )
        self.client.force_authenticate(user=self.member)

    def test_score_is_computed_from_inputs(self):
        response = self.client.patch(
            f"/api/v1/discovery/ideas/{self.idea.id}/scorecard/",
            {"impact": 8, "effort": 3, "confidence": 7},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        # score = (impact * confidence) / effort = (8 * 7) / 3 = 18.67
        self.assertAlmostEqual(response.data["score"], 18.67, places=1)

    def test_scorecard_defaults_to_zero_score(self):
        response = self.client.patch(
            f"/api/v1/discovery/ideas/{self.idea.id}/scorecard/",
            {"impact": 0, "effort": 0, "confidence": 0},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["score"], 0.0)

    def test_scorecard_returns_impact_effort_confidence(self):
        self.client.patch(
            f"/api/v1/discovery/ideas/{self.idea.id}/scorecard/",
            {"impact": 5, "effort": 2, "confidence": 8},
            format="json",
        )
        response = self.client.patch(
            f"/api/v1/discovery/ideas/{self.idea.id}/scorecard/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["impact"], 5.0)
        self.assertEqual(response.data["effort"], 2.0)
        self.assertEqual(response.data["confidence"], 8.0)

    def test_idea_list_includes_scorecard(self):
        self.client.patch(
            f"/api/v1/discovery/ideas/{self.idea.id}/scorecard/",
            {"impact": 6, "effort": 2, "confidence": 5},
            format="json",
        )
        response = self.client.get("/api/v1/discovery/ideas/")
        self.assertEqual(response.status_code, 200)
        idea_data = next(i for i in response.data if str(i["id"]) == str(self.idea.id))
        self.assertIn("scorecard", idea_data)
        self.assertAlmostEqual(idea_data["scorecard"]["score"], 15.0, places=1)
