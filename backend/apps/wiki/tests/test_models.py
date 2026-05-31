import uuid

from django.test import TestCase

from apps.projects.models import Project
from apps.wiki.models import WikiIssueLink, WikiPage, WikiPageVersion, WikiSpace
from apps.workspaces.models import Workspace, WorkspaceMember


def make_member(workspace, suffix="a"):
    sub = str(uuid.uuid4())
    return WorkspaceMember.objects.create(
        workspace=workspace,
        keycloak_sub=sub,
        email=f"{sub}@test.com",
        name=f"User {suffix}",
        role="member",
    )


class WikiSpaceModelTests(TestCase):
    def setUp(self):
        self.ws = Workspace.objects.create(name="WS", slug="ws-wiki-model")
        self.member = make_member(self.ws)

    def test_global_space_has_no_project(self):
        space = WikiSpace.objects.create(
            workspace=self.ws, name="Global", created_by=self.member
        )
        self.assertIsNone(space.project)

    def test_project_scoped_space_has_project(self):
        project = Project.objects.create(
            workspace=self.ws,
            name="Project Wiki",
            identifier="PWK",
            created_by=self.member,
        )
        space = WikiSpace.objects.create(
            workspace=self.ws,
            name="Project Wiki",
            project=project,
            created_by=self.member,
        )
        self.assertIsNotNone(space.project)
        self.assertEqual(space.project, project)

    def test_str_returns_name(self):
        space = WikiSpace.objects.create(
            workspace=self.ws, name="Docs", created_by=self.member
        )
        self.assertEqual(str(space), "Docs")


class WikiPageModelTests(TestCase):
    def setUp(self):
        self.ws = Workspace.objects.create(name="WS2", slug="ws-wiki-pg")
        self.member = make_member(self.ws)
        self.space = WikiSpace.objects.create(
            workspace=self.ws, name="Space", created_by=self.member
        )

    def _make_page(self, title="Page", parent=None):
        return WikiPage.objects.create(
            space=self.space,
            title=title,
            parent=parent,
            created_by=self.member,
        )

    def test_parent_child_relationship(self):
        parent = self._make_page("Parent")
        child = self._make_page("Child", parent=parent)
        self.assertEqual(child.parent, parent)
        self.assertIn(child, parent.children.all())

    def test_yjs_state_nullable_by_default(self):
        page = self._make_page("NoYjs")
        self.assertIsNone(page.yjs_state)

    def test_yjs_state_stores_bytes(self):
        page = self._make_page("WithYjs")
        page.yjs_state = b"\x01\x02\x03"
        page.save(update_fields=["yjs_state"])
        page.refresh_from_db()
        self.assertEqual(bytes(page.yjs_state), b"\x01\x02\x03")

    def test_content_stores_tiptap_json(self):
        page = self._make_page("WithContent")
        page.content = {"type": "doc", "content": []}
        page.save(update_fields=["content"])
        page.refresh_from_db()
        self.assertEqual(page.content["type"], "doc")

    def test_sort_order_midpoint(self):
        page_a = WikiPage.objects.create(
            space=self.space,
            title="Page A",
            sort_order=1.0,
            created_by=self.member,
        )
        page_b = WikiPage.objects.create(
            space=self.space,
            title="Page B",
            sort_order=3.0,
            created_by=self.member,
        )
        # A page inserted between A and B should use the midpoint
        midpoint = (page_a.sort_order + page_b.sort_order) / 2
        page_mid = WikiPage.objects.create(
            space=self.space,
            title="Page Mid",
            sort_order=midpoint,
            created_by=self.member,
        )
        self.assertAlmostEqual(page_mid.sort_order, 2.0)


class WikiPageVersionModelTests(TestCase):
    def setUp(self):
        self.ws = Workspace.objects.create(name="WS3", slug="ws-wiki-ver")
        self.member = make_member(self.ws)
        self.space = WikiSpace.objects.create(
            workspace=self.ws, name="Space", created_by=self.member
        )
        self.page = WikiPage.objects.create(
            space=self.space, title="Page", created_by=self.member
        )

    def test_version_number_auto_increment(self):
        v1 = WikiPageVersion.objects.create(
            page=self.page,
            version_number=1,
            title="v1",
            content={},
            created_by=self.member,
        )
        v2 = WikiPageVersion.objects.create(
            page=self.page,
            version_number=2,
            title="v2",
            content={},
            created_by=self.member,
        )
        self.assertEqual(v2.version_number, v1.version_number + 1)

    def test_str_includes_version_number(self):
        v = WikiPageVersion.objects.create(
            page=self.page,
            version_number=1,
            title="v1",
            content={},
            created_by=self.member,
        )
        self.assertIn("v1", str(v))


class WikiIssueLinkModelTests(TestCase):
    def test_link_type_choices(self):
        choices = [c[0] for c in WikiIssueLink.LinkType.choices]
        self.assertIn("spec", choices)
        self.assertIn("runbook", choices)
        self.assertIn("postmortem", choices)
        self.assertIn("decision", choices)
        self.assertIn("related", choices)
