from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer


class IssueBoardConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer para sincronização do Kanban em tempo real.
    Grupo: project_{project_id}
    Conexão: wss://host/ws/projects/{project_id}/board/?token=<access_token>

    Mensagens do frontend:
      {"type": "issue.move", "issueId": "uuid", "stateId": "uuid", "sortOrder": 1.5}

    Broadcasts para todos os clientes:
      {"type": "issue.updated", "payload": {...}}
      {"type": "cpm.updated", "projectId": "uuid"}
    """

    async def connect(self):
        if not self.scope["user"].is_authenticated:
            await self.close(code=4001)
            return

        self.project_id = self.scope["url_route"]["kwargs"]["project_id"]
        self.group_name = f"project_{self.project_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        event_type = content.get("type")

        if event_type == "issue.move":
            await self._handle_issue_move(content)
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "issue_updated",
                    "payload": content,
                    "sender": self.channel_name,
                },
            )

    async def issue_updated(self, event):
        if event["sender"] != self.channel_name:
            await self.send_json({
                "type": "issue.updated",
                "payload": event["payload"],
            })

    async def cpm_updated(self, event):
        """Broadcast quando o algoritmo CPM recalcula o projeto."""
        await self.send_json({
            "type": "cpm.updated",
            "projectId": event.get("project_id"),
        })

    @sync_to_async(thread_sensitive=False)
    def _handle_issue_move(self, content):
        issue_id = content.get("issueId")
        state_id = content.get("stateId")
        sort_order = content.get("sortOrder")

        if not (issue_id and state_id and sort_order is not None):
            return

        from apps.issues.models import Issue

        Issue.objects.filter(
            pk=issue_id,
            project_id=self.project_id,
        ).update(state_id=state_id, sort_order=sort_order)
