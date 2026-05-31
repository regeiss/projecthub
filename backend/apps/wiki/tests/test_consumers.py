import json
import uuid

from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase

from apps.wiki.consumers import WikiPageConsumer
from apps.wiki.models import WikiPage, WikiSpace
from apps.workspaces.models import Workspace, WorkspaceMember


def make_member(workspace):
    sub = str(uuid.uuid4())
    return WorkspaceMember.objects.create(
        workspace=workspace, keycloak_sub=sub,
        email=f"{sub}@t.com", name="U", role="member",
    )


async def make_communicator(page_id, user):
    communicator = WebsocketCommunicator(
        WikiPageConsumer.as_asgi(),
        f"/ws/wiki/pages/{page_id}/",
    )
    communicator.scope["url_route"] = {"kwargs": {"page_id": str(page_id)}}
    communicator.scope["user"] = user
    return communicator


class WikiPageConsumerConnectTests(TransactionTestCase):
    """TransactionTestCase required: channel layer group operations need committed DB transactions."""

    def setUp(self):
        self.ws = Workspace.objects.create(name="WS", slug="ws-cons")
        self.member = make_member(self.ws)
        self.space = WikiSpace.objects.create(
            workspace=self.ws, name="S", created_by=self.member
        )

    async def test_connect_sends_init_json_message(self):
        page = await WikiPage.objects.acreate(
            space=self.space, title="P",
            content={"type": "doc", "content": [{"type": "paragraph"}]},
            created_by=self.member,
        )
        communicator = await make_communicator(page.pk, self.member)
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        response = await communicator.receive_from()
        msg = json.loads(response)
        self.assertEqual(msg["type"], "init")
        self.assertIn("content", msg)
        await communicator.disconnect()

    async def test_connect_sends_yjs_binary_when_state_exists(self):
        page = await WikiPage.objects.acreate(
            space=self.space, title="P2",
            content={"type": "doc", "content": [{"type": "paragraph"}]},
            yjs_state=b"\x01\x02\x03",
            created_by=self.member,
        )
        communicator = await make_communicator(page.pk, self.member)
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        # First: init JSON
        await communicator.receive_from()
        # Second: Yjs binary
        binary = await communicator.receive_from()
        self.assertEqual(binary, b"\x01\x02\x03")
        await communicator.disconnect()

    async def test_archived_page_connect_rejected(self):
        page = await WikiPage.objects.acreate(
            space=self.space, title="Archived",
            content={}, is_archived=True,
            created_by=self.member,
        )
        communicator = await make_communicator(page.pk, self.member)
        connected, code = await communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(code, 4003)
        await communicator.disconnect()

    async def test_unauthenticated_connect_rejected(self):
        from django.contrib.auth.models import AnonymousUser
        page = await WikiPage.objects.acreate(
            space=self.space, title="P3",
            content={}, created_by=self.member,
        )
        communicator = await make_communicator(page.pk, AnonymousUser())
        connected, code = await communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(code, 4001)
        await communicator.disconnect()

    async def test_binary_message_relayed_to_group_not_sender(self):
        """Binary Yjs updates must be broadcast to peers but NOT echoed back to sender."""
        page = await WikiPage.objects.acreate(
            space=self.space, title="Relay",
            # Non-empty content so _build_init_message() sends an init JSON frame
            # that we can reliably drain with receive_from() on each connect.
            content={"type": "doc", "content": [{"type": "paragraph"}]},
            created_by=self.member,
        )
        member2 = await sync_to_async(make_member)(self.ws)
        sender = await make_communicator(page.pk, self.member)
        receiver = await make_communicator(page.pk, member2)

        connected, _ = await sender.connect()
        self.assertTrue(connected)
        # Drain init JSON frame (consumer sends this on every connect)
        await sender.receive_from()  # consume the init message

        connected, _ = await receiver.connect()
        self.assertTrue(connected)
        await receiver.receive_from()  # consume the init message

        payload = b"\x01\x02\x03"
        await sender.send_to(bytes_data=payload)

        # receiver should get the message
        received = await receiver.receive_from()
        self.assertEqual(received, payload)

        # sender must NOT receive its own message back
        self.assertTrue(await sender.receive_nothing())

        await sender.disconnect()
        await receiver.disconnect()
