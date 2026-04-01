import uuid
from unittest.mock import patch

from django.test import TestCase

from apps.wiki.models import WikiPage, WikiPageVersion, WikiSpace
from apps.workspaces.models import Workspace, WorkspaceMember


def make_member(workspace):
    sub = str(uuid.uuid4())
    return WorkspaceMember.objects.create(
        workspace=workspace,
        keycloak_sub=sub,
        email=f"{sub}@t.com",
        name="U",
        role="member",
    )


class SaveYjsStateTaskTests(TestCase):
    def setUp(self):
        self.ws = Workspace.objects.create(name="WS", slug="ws-task-yjs")
        self.member = make_member(self.ws)
        self.space = WikiSpace.objects.create(
            workspace=self.ws, name="S", created_by=self.member
        )
        self.page = WikiPage.objects.create(
            space=self.space,
            title="P",
            content={"type": "doc", "content": []},
            created_by=self.member,
        )

    def test_save_yjs_state_writes_to_yjs_state_field(self):
        from apps.wiki.tasks import save_yjs_state

        yjs_bytes = b"\xab\xcd\xef"
        yjs_hex = yjs_bytes.hex()
        with patch("django.core.cache.cache.delete"):
            save_yjs_state(str(self.page.pk), yjs_hex, str(self.member.pk))
        self.page.refresh_from_db()
        self.assertEqual(bytes(self.page.yjs_state), yjs_bytes)

    def test_save_yjs_state_does_not_modify_content(self):
        from apps.wiki.tasks import save_yjs_state

        original_content = {"type": "doc", "content": []}
        self.page.content = original_content
        self.page.save(update_fields=["content"])
        yjs_hex = b"\x01\x02".hex()
        with patch("django.core.cache.cache.delete"):
            save_yjs_state(str(self.page.pk), yjs_hex, str(self.member.pk))
        self.page.refresh_from_db()
        self.assertEqual(self.page.content, original_content)


class CreatePageVersionTaskTests(TestCase):
    def setUp(self):
        self.ws = Workspace.objects.create(name="WS2", slug="ws-task-ver")
        self.member = make_member(self.ws)
        self.space = WikiSpace.objects.create(
            workspace=self.ws, name="S", created_by=self.member
        )
        self.page = WikiPage.objects.create(
            space=self.space,
            title="Original",
            content={"type": "doc", "content": []},
            created_by=self.member,
        )

    def test_create_page_version_snapshots_title_and_content(self):
        from apps.wiki.tasks import create_page_version

        create_page_version(str(self.page.pk), str(self.member.pk), "initial")
        v = WikiPageVersion.objects.get(page=self.page, version_number=1)
        self.assertEqual(v.title, "Original")
        self.assertEqual(v.content, {"type": "doc", "content": []})

    def test_create_page_version_auto_increments(self):
        from apps.wiki.tasks import create_page_version

        create_page_version(str(self.page.pk), str(self.member.pk))
        create_page_version(str(self.page.pk), str(self.member.pk))
        versions = WikiPageVersion.objects.filter(page=self.page).order_by(
            "version_number"
        )
        self.assertEqual(versions[0].version_number, 1)
        self.assertEqual(versions[1].version_number, 2)
