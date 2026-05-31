import logging

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)


class WikiPageConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer para edição colaborativa via Yjs.
    Grupo: page_{page_id}
    Conexão: wss://host/ws/wiki/pages/{page_id}/?token=<access_token>

    Protocolo: relay puro de mensagens binárias Yjs (syncStep1/2, update, awareness).
    O backend não interpreta o conteúdo — apenas retransmite entre clientes.
    Salva o doc state no banco via debounce (10s) via Celery.
    """

    async def connect(self):
        if not self.scope["user"].is_authenticated:
            await self.close(code=4001)
            return

        self.page_id = self.scope["url_route"]["kwargs"]["page_id"]
        self.group_name = f"page_{self.page_id}"

        self._page = await self._get_page()
        if self._page is None:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send TipTap JSON for immediate editor seeding
        init_msg = self._build_init_message()
        if init_msg:
            await self.send(text_data=init_msg)

        # Send Yjs binary state for CRDT reconciliation
        if self._page.yjs_state:
            await self.send(bytes_data=bytes(self._page.yjs_state))

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, bytes_data=None, text_data=None):
        if bytes_data:
            # Relay para todos no grupo (exceto o remetente)
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "yjs_message",
                    "data": bytes_data.hex(),
                    "sender": self.channel_name,
                },
            )
            await self._schedule_save(bytes_data)

    async def yjs_message(self, event):
        if event["sender"] != self.channel_name:
            await self.send(bytes_data=bytes.fromhex(event["data"]))

    @sync_to_async(thread_sensitive=False)
    def _get_page(self):
        """Fetches the page and validates access. Returns page or None."""
        try:
            from apps.wiki.models import WikiPage

            page = WikiPage.objects.select_related("space").get(pk=self.page_id)
            if page.is_archived:
                return None
            if page.space.is_private:
                return page if self.scope["user"].is_authenticated else None
            return page
        except Exception:
            return None

    def _build_init_message(self):
        """Returns JSON init message string, or None if content is empty."""
        import json

        content = getattr(self._page, "content", None)
        if not content:
            return None
        return json.dumps({"type": "init", "content": content})

    async def _schedule_save(self, bytes_data):
        """
        Debounce: armazena o estado Yjs mais recente no Redis e agenda
        a task de persistência (countdown=10s). Múltiplas tasks podem ser
        enfileiradas, mas apenas a última com dados relevantes faz algo.
        """
        from django.core.cache import cache

        page_id = self.page_id
        yjs_hex = bytes_data.hex()
        member_id = str(self.scope["user"].pk)

        await sync_to_async(cache.set)(
            f"wiki_yjs_pending_{page_id}", yjs_hex, timeout=30
        )

        def _dispatch():
            from apps.wiki.tasks import save_yjs_state
            save_yjs_state.apply_async(
                kwargs={"page_id": page_id, "yjs_hex": yjs_hex, "member_id": member_id},
                countdown=10,
            )

        await sync_to_async(_dispatch)()
