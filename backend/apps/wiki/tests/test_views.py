import uuid

from django.test import TestCase
from rest_framework.test import APIClient

from apps.wiki.models import WikiPage, WikiPageComment, WikiSpace
from apps.workspaces.models import Workspace, WorkspaceMember


def make_member(workspace, role="member", suffix=""):
    sub = str(uuid.uuid4())
    return WorkspaceMember.objects.create(
        workspace=workspace, keycloak_sub=sub,
        email=f"{sub}{suffix}@t.com", name="U", role=role,
    )


def make_space(workspace, member, private=False):
    return WikiSpace.objects.create(
        workspace=workspace, name="Space", created_by=member, is_private=private
    )


def make_page(space, member, title="Page", parent=None, content=None):
    return WikiPage.objects.create(
        space=space, title=title, parent=parent,
        content=content or {"type": "doc", "content": []},
        created_by=member,
    )


class WikiSpaceViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ws = Workspace.objects.create(name="WS", slug="ws-sv")
        self.member = make_member(self.ws)
        self.client.force_authenticate(user=self.member)

    def test_list_spaces(self):
        make_space(self.ws, self.member)
        resp = self.client.get("/api/v1/wiki/spaces/")
        self.assertEqual(resp.status_code, 200)

    def test_create_space(self):
        resp = self.client.post("/api/v1/wiki/spaces/", {"name": "New Space", "workspace": str(self.ws.pk)})
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["name"], "New Space")

    def test_delete_space_by_creator(self):
        space = make_space(self.ws, self.member)
        resp = self.client.delete(f"/api/v1/wiki/spaces/{space.pk}/")
        self.assertEqual(resp.status_code, 204)

    def test_update_space(self):
        self.space = make_space(self.ws, self.member)
        resp = self.client.patch(
            f"/api/v1/wiki/spaces/{self.space.id}/",
            {"name": "Updated Name"},
        )
        self.assertEqual(resp.status_code, 200)
        self.space.refresh_from_db()
        self.assertEqual(self.space.name, "Updated Name")


class WikiPageViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ws = Workspace.objects.create(name="WS2", slug="ws-pv")
        self.member = make_member(self.ws)
        self.space = make_space(self.ws, self.member)
        self.page = make_page(self.space, self.member)
        self.client.force_authenticate(user=self.member)

    def test_list_pages(self):
        make_page(self.space, self.member)
        resp = self.client.get(f"/api/v1/wiki/spaces/{self.space.pk}/pages/")
        self.assertEqual(resp.status_code, 200)

    def test_create_page(self):
        resp = self.client.post(
            f"/api/v1/wiki/spaces/{self.space.pk}/pages/",
            {"title": "My Page"},
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["title"], "My Page")

    def test_page_detail_includes_ancestors_empty_for_root(self):
        page = make_page(self.space, self.member, title="Root")
        resp = self.client.get(f"/api/v1/wiki/pages/{page.pk}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["ancestors"], [])

    def test_page_detail_includes_ancestors_ordered_root_first(self):
        root = make_page(self.space, self.member, title="Root")
        child = make_page(self.space, self.member, title="Child", parent=root)
        grandchild = make_page(self.space, self.member, title="Grandchild", parent=child)
        resp = self.client.get(f"/api/v1/wiki/pages/{grandchild.pk}/")
        self.assertEqual(resp.status_code, 200)
        ancestors = resp.data["ancestors"]
        self.assertEqual(len(ancestors), 2)
        self.assertEqual(ancestors[0]["title"], "Root")
        self.assertEqual(ancestors[1]["title"], "Child")

    def test_update_page(self):
        page = make_page(self.space, self.member, title="Old")
        resp = self.client.patch(f"/api/v1/wiki/pages/{page.pk}/", {"title": "New"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["title"], "New")

    def test_delete_page(self):
        page = make_page(self.space, self.member)
        resp = self.client.delete(f"/api/v1/wiki/pages/{page.pk}/")
        self.assertEqual(resp.status_code, 204)

    def test_move_page(self):
        new_parent = WikiPage.objects.create(space=self.space, title="New Parent", sort_order=10.0, created_by=self.member)
        resp = self.client.patch(
            f"/api/v1/wiki/pages/{self.page.id}/move/",
            {"parent": str(new_parent.id)},
        )
        self.assertIn(resp.status_code, [200, 204])
        self.page.refresh_from_db()
        self.assertEqual(self.page.parent, new_parent)

    def test_publish_page(self):
        page = make_page(self.space, self.member)
        resp = self.client.post(f"/api/v1/wiki/pages/{page.pk}/publish/", {"publish": True})
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["is_published"])
        self.assertIsNotNone(resp.data["published_token"])

    def test_unpublish_page(self):
        self.page.is_published = True
        self.page.save()
        resp = self.client.patch(
            f"/api/v1/wiki/pages/{self.page.id}/",
            {"is_published": False},
        )
        self.assertEqual(resp.status_code, 200)
        self.page.refresh_from_db()
        self.assertFalse(self.page.is_published)

    def test_public_page_no_auth(self):
        page = make_page(self.space, self.member)
        self.client.post(f"/api/v1/wiki/pages/{page.pk}/publish/", {"publish": True})
        page.refresh_from_db()
        anon = APIClient()
        resp = anon.get(f"/api/v1/wiki/public/{page.published_token}/")
        self.assertEqual(resp.status_code, 200)

    def test_locked_page_edit_blocked_for_non_admin(self):
        page = make_page(self.space, self.member)
        page.is_locked = True
        page.save(update_fields=["is_locked"])
        other = make_member(self.ws, suffix="b")
        self.client.force_authenticate(user=other)
        resp = self.client.patch(f"/api/v1/wiki/pages/{page.pk}/", {"title": "Hack"})
        self.assertEqual(resp.status_code, 403)

    def test_private_space_blocks_non_member(self):
        private_space = make_space(self.ws, self.member, private=True)
        page = make_page(private_space, self.member)
        stranger = make_member(self.ws, suffix="z")
        self.client.force_authenticate(user=stranger)
        resp = self.client.get(f"/api/v1/wiki/pages/{page.pk}/")
        self.assertEqual(resp.status_code, 404)


class WikiVersionViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ws = Workspace.objects.create(name="WS3", slug="ws-vv")
        self.member = make_member(self.ws)
        self.space = make_space(self.ws, self.member)
        self.page = make_page(self.space, self.member)
        self.client.force_authenticate(user=self.member)

    def test_list_versions(self):
        resp = self.client.get(f"/api/v1/wiki/pages/{self.page.pk}/versions/")
        self.assertEqual(resp.status_code, 200)

    def test_restore_version(self):
        from apps.wiki.models import WikiPageVersion
        v = WikiPageVersion.objects.create(
            page=self.page, version_number=1, title="Old Title",
            content={"type": "doc", "content": []}, created_by=self.member,
        )
        resp = self.client.post(f"/api/v1/wiki/pages/{self.page.pk}/versions/{v.pk}/restore/")
        self.assertEqual(resp.status_code, 200)
        self.page.refresh_from_db()
        self.assertEqual(self.page.title, "Old Title")


class WikiCommentViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ws = Workspace.objects.create(name="WS4", slug="ws-cv")
        self.member = make_member(self.ws)
        self.space = make_space(self.ws, self.member)
        self.page = make_page(self.space, self.member)
        self.client.force_authenticate(user=self.member)

    def test_create_comment(self):
        resp = self.client.post(
            f"/api/v1/wiki/pages/{self.page.pk}/comments/",
            {"content": "Hello"},
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["content"], "Hello")

    def test_resolve_comment(self):
        comment = WikiPageComment.objects.create(
            page=self.page, author=self.member, content="Fix this"
        )
        resp = self.client.post(f"/api/v1/wiki/comments/{comment.pk}/resolve/")
        self.assertEqual(resp.status_code, 200)
        comment.refresh_from_db()
        self.assertTrue(comment.is_resolved)

    def test_delete_comment_by_author(self):
        comment = WikiPageComment.objects.create(
            page=self.page, author=self.member, content="Delete me"
        )
        resp = self.client.delete(f"/api/v1/wiki/comments/{comment.pk}/")
        self.assertEqual(resp.status_code, 204)
