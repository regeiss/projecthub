from rest_framework.test import APITestCase

from apps.discovery.models import Idea, IdeaInsight
from apps.workspaces.models import Workspace, WorkspaceMember


class IdeaInsightApiTests(APITestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name="Insight WS", slug="ws-insights")
        self.member = WorkspaceMember.objects.create(
            workspace=self.workspace,
            keycloak_sub="sub-insight-admin",
            email="insight@x.com",
            name="Insight Admin",
            role="admin",
        )
        self.idea = Idea.objects.create(
            workspace=self.workspace,
            title="Busca avançada",
            status=Idea.Status.NEW,
            created_by=self.member,
        )
        self.client.force_authenticate(user=self.member)

    def test_add_note_insight_to_idea(self):
        response = self.client.post(
            f"/api/v1/discovery/ideas/{self.idea.id}/insights/",
            {
                "kind": "note",
                "title": "Cliente pediu filtro",
                "content": {"text": "Usuários enterprise precisam disso"},
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["title"], "Cliente pediu filtro")
        self.assertEqual(response.data["kind"], "note")

    def test_add_link_insight_to_idea(self):
        response = self.client.post(
            f"/api/v1/discovery/ideas/{self.idea.id}/insights/",
            {"kind": "link", "title": "Referência de UX", "content": {"url": "https://example.com"}},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["kind"], "link")

    def test_add_feedback_insight_to_idea(self):
        response = self.client.post(
            f"/api/v1/discovery/ideas/{self.idea.id}/insights/",
            {"kind": "feedback", "title": "NPS baixo nessa área", "content": {}},
            format="json",
        )
        self.assertEqual(response.status_code, 201)

    def test_list_insights_for_idea(self):
        IdeaInsight.objects.create(idea=self.idea, kind="note", title="Nota 1", created_by=self.member)
        IdeaInsight.objects.create(idea=self.idea, kind="link", title="Link 1", created_by=self.member)
        response = self.client.get(f"/api/v1/discovery/ideas/{self.idea.id}/insights/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_insights_are_isolated_per_idea(self):
        other_idea = Idea.objects.create(
            workspace=self.workspace,
            title="Outra ideia",
            status=Idea.Status.NEW,
            created_by=self.member,
        )
        IdeaInsight.objects.create(idea=other_idea, kind="note", title="Nota da outra ideia", created_by=self.member)
        response = self.client.get(f"/api/v1/discovery/ideas/{self.idea.id}/insights/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)
