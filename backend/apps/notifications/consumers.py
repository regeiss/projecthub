from channels.generic.websocket import AsyncJsonWebsocketConsumer


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer para notificações in-app em tempo real.
    Grupo: user_{user_id}
    Conexão: wss://host/ws/notifications/?token=<access_token>
    """

    async def connect(self):
        if not self.scope["user"].is_authenticated:
            await self.close(code=4001)
            return

        self.user_id = str(self.scope["user"].id)
        self.group_name = f"user_{self.user_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_new(self, event):
        """Chamado por tasks/signals ao criar uma notificação."""
        await self.send_json({
            "type": "notification.new",
            "notification": event["notification"],
        })
