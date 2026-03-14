# WEBSOCKET.md — Protocolo WebSocket e Consumers

## Rotas WebSocket

```
wss://host/ws/wiki/pages/{page_id}/          WikiPageConsumer
wss://host/ws/notifications/                 NotificationConsumer
wss://host/ws/projects/{project_id}/board/  IssueBoardConsumer
```

---

## Autenticação

O token Keycloak é enviado como query param na conexão:

```
wss://host/ws/wiki/pages/{id}/?token=<keycloak_access_token>
```

O middleware `core/websocket/middleware.py` extrai e valida o token antes de
passar para o consumer. Se inválido, rejeita a conexão com código 4001.

```python
# core/websocket/middleware.py
class KeycloakAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        params = dict(x.split('=') for x in query_string.split('&') if '=' in x)
        token = params.get('token', '')

        if token:
            try:
                member = await authenticate_keycloak_token(token)
                scope['user'] = member
            except AuthenticationFailed:
                scope['user'] = AnonymousUser()
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
```

---

## WikiPageConsumer

Relay puro das mensagens binárias do Yjs. Não interpreta o conteúdo.

```python
# apps/wiki/consumers.py
class WikiPageConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        if not self.scope['user'].is_authenticated:
            await self.close(code=4001)
            return

        self.page_id = self.scope['url_route']['kwargs']['page_id']
        self.group_name = f'page_{self.page_id}'

        # Verificar permissão de leitura na página
        has_access = await self.check_page_access()
        if not has_access:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Enviar estado atual do doc Yjs para sincronização inicial
        doc_state = await self.get_doc_state()
        if doc_state:
            await self.send(bytes_data=doc_state)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, bytes_data=None, text_data=None):
        if bytes_data:
            # Fazer relay para todos no grupo (exceto o remetente)
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'yjs_message',
                    'data': bytes_data.hex(),  # bytes→hex para o channel layer
                    'sender': self.channel_name,
                }
            )

            # Salvar estado do doc (debounce via Redis)
            await self.schedule_save(bytes_data)

    async def yjs_message(self, event):
        # Não reenviar para o remetente original
        if event['sender'] != self.channel_name:
            await self.send(bytes_data=bytes.fromhex(event['data']))
```

**Mensagens Yjs (binárias):**
- `syncStep1` — client pede estado atual
- `syncStep2` — server responde com estado
- `update` — diff de atualização (CRDT)
- `awareness` — presença e cursors dos usuários

---

## NotificationConsumer

Push de notificações in-app em tempo real.

```python
# apps/notifications/consumers.py
class NotificationConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        if not self.scope['user'].is_authenticated:
            await self.close(code=4001)
            return

        self.user_id = str(self.scope['user'].id)
        self.group_name = f'user_{self.user_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_new(self, event):
        """Chamado pelo signal/task quando uma notificação é criada."""
        await self.send_json({
            'type': 'notification.new',
            'notification': event['notification'],
        })
```

**Como disparar do backend (nas tasks/signals):**

```python
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()

async_to_sync(channel_layer.group_send)(
    f'user_{recipient_id}',
    {
        'type': 'notification.new',
        'notification': NotificationSerializer(notification).data,
    }
)
```

---

## IssueBoardConsumer

Sincroniza movimentos de cards no Kanban entre usuários.

```python
# apps/issues/consumers.py
class IssueBoardConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        if not self.scope['user'].is_authenticated:
            await self.close(code=4001)
            return

        self.project_id = self.scope['url_route']['kwargs']['project_id']
        self.group_name = f'project_{self.project_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        event_type = content.get('type')

        if event_type == 'issue.move':
            # Persistir no banco
            await self.handle_issue_move(content)
            # Broadcast para outros
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'issue_updated',
                    'payload': content,
                    'sender': self.channel_name,
                }
            )

    async def issue_updated(self, event):
        if event['sender'] != self.channel_name:
            await self.send_json({
                'type': 'issue.updated',
                'payload': event['payload'],
            })
```

**Formato da mensagem `issue.move` (frontend → backend):**

```json
{
  "type": "issue.move",
  "issueId": "uuid",
  "stateId": "uuid",
  "sortOrder": 1.5
}
```

**Formato do broadcast `issue.updated` (backend → todos):**

```json
{
  "type": "issue.updated",
  "payload": {
    "issueId": "uuid",
    "stateId": "uuid",
    "sortOrder": 1.5
  }
}
```

---

## Frontend — hook de board WebSocket

```typescript
// Em features/board/BoardPage.tsx ou hook dedicado
function useBoardWebSocket(projectId: string) {
  const wsRef = useRef<WebSocket | null>(null)
  const qc = useQueryClient()

  useEffect(() => {
    const token = keycloak.token
    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_URL}/projects/${projectId}/board/?token=${token}`
    )

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'issue.updated') {
        // Atualizar cache do TanStack Query com o novo estado
        qc.setQueryData(['issues', { projectId }], (old: Issue[]) =>
          old.map(issue =>
            issue.id === msg.payload.issueId
              ? { ...issue, stateId: msg.payload.stateId, sortOrder: msg.payload.sortOrder }
              : issue
          )
        )
      }
    }

    ws.onerror = () => console.error('Board WS error')

    // Reconexão com backoff exponencial
    ws.onclose = () => {
      setTimeout(() => {
        // reconectar
      }, 3000)
    }

    wsRef.current = ws
    return () => ws.close()
  }, [projectId])

  const sendMove = useCallback((issueId: string, stateId: string, sortOrder: number) => {
    wsRef.current?.send(JSON.stringify({ type: 'issue.move', issueId, stateId, sortOrder }))
  }, [])

  return { sendMove }
}
```

---

## CPM broadcast (Fase 2)

Quando o algoritmo CPM recalcula, faz broadcast para o grupo do projeto:

```python
# apps/cpm/tasks.py (após calcular)
async_to_sync(channel_layer.group_send)(
    f'project_{project_id}',
    {
        'type': 'cpm_updated',
        'project_id': project_id,
    }
)
```

O `IssueBoardConsumer` (ou um consumer CPM dedicado) recebe e retransmite:

```json
{
  "type": "cpm.updated",
  "projectId": "uuid"
}
```

O frontend recarrega os dados CPM ao receber esse evento (invalidar query `cpm`).
