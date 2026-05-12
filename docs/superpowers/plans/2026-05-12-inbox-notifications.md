# Inbox / Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-screen Inbox page at `/inbox` with server-side filtering, `is_archived` support, and per-filter TanStack Query cache.

**Architecture:** Server-side filter params (`filter`, `project_id`, `unread`) on the existing `GET /notifications/` endpoint; new `GET /notifications/counts/` for sidebar badges; new `POST` actions for archive and mark-unread. Frontend: two-column layout (`InboxSidebar` + `InboxList`) with URL persistence via `useSearchParams`.

**Tech Stack:** Django 5.1 + DRF, React 18 + TypeScript, TanStack Query v5, Tailwind CSS, Lucide React, `react-router-dom` v6 `useSearchParams`.

---

## File Map

| Action | Path |
|--------|------|
| Modify | `backend/apps/notifications/models.py` |
| Create | `backend/apps/notifications/migrations/0002_notification_is_archived.py` |
| Modify | `backend/apps/notifications/serializers.py` |
| Modify | `backend/apps/notifications/views.py` |
| Modify | `backend/apps/notifications/urls.py` |
| Modify | `scripts/db/init.sql` |
| Modify | `frontend/src/types/index.ts` |
| Modify | `frontend/src/services/notification.service.ts` |
| Create | `frontend/src/hooks/useInbox.ts` |
| Modify | `frontend/src/hooks/useNotificationSocket.ts` |
| Create | `frontend/src/features/notifications/InboxPage.tsx` |
| Create | `frontend/src/features/notifications/InboxSidebar.tsx` |
| Create | `frontend/src/features/notifications/InboxList.tsx` |
| Create | `frontend/src/features/notifications/InboxItem.tsx` |
| Create | `frontend/src/features/notifications/InboxEmptyState.tsx` |
| Modify | `frontend/src/App.tsx` |
| Modify | `frontend/src/components/layout/Sidebar.tsx` |

---

### Task 1: Add `is_archived` to Notification model + migration

**Files:**
- Modify: `backend/apps/notifications/models.py`
- Create: `backend/apps/notifications/migrations/0002_notification_is_archived.py`
- Modify: `scripts/db/init.sql`

- [ ] **Step 1: Add field to model**

Edit `backend/apps/notifications/models.py` — add after `is_read` line (line 37):

```python
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

- [ ] **Step 2: Create migration**

Create `backend/apps/notifications/migrations/0002_notification_is_archived.py`:

```python
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='is_archived',
            field=models.BooleanField(default=False, db_index=True),
        ),
    ]
```

- [ ] **Step 3: Update init.sql**

In `scripts/db/init.sql`, find the `notifications` table definition and add `is_archived` after `is_read`:

```sql
    is_read        BOOLEAN      NOT NULL DEFAULT FALSE,
    is_archived    BOOLEAN      NOT NULL DEFAULT FALSE,
    read_at        TIMESTAMPTZ,
```

Also add index after the existing notification indexes:

```sql
CREATE INDEX idx_notifications_archived ON notifications(recipient_id, is_archived, created_at DESC);
```

- [ ] **Step 4: Apply migration**

```bash
docker compose exec api python manage.py migrate notifications
```

Expected output: `Applying notifications.0002_notification_is_archived... OK`

- [ ] **Step 5: Commit**

```bash
git add backend/apps/notifications/models.py \
        backend/apps/notifications/migrations/0002_notification_is_archived.py \
        scripts/db/init.sql
git commit -m "feat(notifications): add is_archived field to Notification model"
```

---

### Task 2: Backend — update serializer + list view with filter params

**Files:**
- Modify: `backend/apps/notifications/serializers.py`
- Modify: `backend/apps/notifications/views.py`

- [ ] **Step 1: Update serializer**

Replace full content of `backend/apps/notifications/serializers.py`:

```python
from rest_framework import serializers

from apps.workspaces.serializers import WorkspaceMemberSerializer

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_detail = WorkspaceMemberSerializer(source="actor", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id", "type", "entity_type", "entity_id",
            "title", "message", "action_url",
            "is_read", "read_at", "is_archived",
            "actor", "actor_detail",
            "created_at",
        ]
        read_only_fields = [
            "id", "type", "entity_type", "entity_id",
            "title", "message", "action_url",
            "actor", "read_at", "created_at",
        ]
```

- [ ] **Step 2: Update NotificationListView**

Replace the `get_queryset` method in `NotificationListView` in `backend/apps/notifications/views.py`:

```python
    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)

        filter_param = self.request.query_params.get("filter")
        if filter_param == "mentions":
            qs = qs.filter(type__in=["issue_mentioned", "wiki_mentioned"])
        elif filter_param == "assigned":
            qs = qs.filter(type="issue_assigned")
        elif filter_param == "watching":
            qs = qs.filter(type="issue_commented")
        elif filter_param == "archived":
            qs = qs.filter(is_archived=True)
        else:
            qs = qs.filter(is_archived=False)

        project_id = self.request.query_params.get("project_id")
        if project_id:
            from apps.issues.models import Issue
            issue_ids = Issue.objects.filter(
                project_id=project_id
            ).values("id")
            qs = qs.filter(entity_type="issue", entity_id__in=issue_ids)

        unread_only = self.request.query_params.get("unread")
        if unread_only in ("1", "true", "True"):
            qs = qs.filter(is_read=False)

        return qs
```

- [ ] **Step 3: Verify list endpoint still works**

```bash
docker compose exec api python manage.py shell -c "
from apps.notifications.views import NotificationListView
print('OK')
"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/apps/notifications/serializers.py \
        backend/apps/notifications/views.py
git commit -m "feat(notifications): add filter/project_id/unread params to list view"
```

---

### Task 3: Backend — new endpoints (counts, archive, mark-unread)

**Files:**
- Modify: `backend/apps/notifications/views.py`
- Modify: `backend/apps/notifications/urls.py`

- [ ] **Step 1: Add three new views to views.py**

Append to the bottom of `backend/apps/notifications/views.py`:

```python
from django.db.models import Count, Q


class NotificationCountsView(APIView):
    """GET /notifications/counts/ — contagens por categoria para sidebar."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        base = Notification.objects.filter(recipient=user, is_archived=False)
        archived_qs = Notification.objects.filter(recipient=user, is_archived=True)

        from apps.issues.models import Issue

        counts = {
            "all": base.count(),
            "unread": base.filter(is_read=False).count(),
            "mentions": base.filter(
                type__in=["issue_mentioned", "wiki_mentioned"]
            ).count(),
            "assigned": base.filter(type="issue_assigned").count(),
            "watching": base.filter(type="issue_commented").count(),
            "archived": archived_qs.count(),
            "by_project": {},
        }

        # Unread counts per project (entity_type=issue only)
        project_unread = (
            base.filter(is_read=False, entity_type="issue")
            .values("entity_id")
        )
        if project_unread.exists():
            entity_ids = [r["entity_id"] for r in project_unread]
            issue_project_map = {
                str(i.id): str(i.project_id)
                for i in Issue.objects.filter(id__in=entity_ids).only("id", "project_id")
            }
            by_project: dict[str, int] = {}
            for r in project_unread:
                pid = issue_project_map.get(str(r["entity_id"]))
                if pid:
                    by_project[pid] = by_project.get(pid, 0) + 1
            counts["by_project"] = by_project

        return Response(counts)


class NotificationArchiveView(APIView):
    """POST /notifications/{pk}/archive/ — arquiva uma notificação."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        notification.is_archived = True
        notification.is_read = True
        if not notification.read_at:
            notification.read_at = timezone.now()
        notification.save(update_fields=["is_archived", "is_read", "read_at"])

        return Response(NotificationSerializer(notification).data)


class NotificationMarkUnreadView(APIView):
    """POST /notifications/{pk}/unread/ — marca uma notificação como não lida."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        notification.is_read = False
        notification.read_at = None
        notification.save(update_fields=["is_read", "read_at"])

        return Response(NotificationSerializer(notification).data)
```

- [ ] **Step 2: Update urls.py**

Replace full content of `backend/apps/notifications/urls.py`:

```python
from django.urls import path

from .views import (
    NotificationArchiveView,
    NotificationCountsView,
    NotificationDeleteView,
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    NotificationMarkUnreadView,
    NotificationUnreadCountView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
    path("counts/", NotificationCountsView.as_view(), name="notification-counts"),
    path("mark-all-read/", NotificationMarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("<uuid:pk>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
    path("<uuid:pk>/archive/", NotificationArchiveView.as_view(), name="notification-archive"),
    path("<uuid:pk>/unread/", NotificationMarkUnreadView.as_view(), name="notification-mark-unread"),
    path("<uuid:pk>/", NotificationDeleteView.as_view(), name="notification-delete"),
]
```

- [ ] **Step 3: Sync and restart backend**

```bash
make sync-backend
```

- [ ] **Step 4: Smoke-test counts endpoint**

```bash
# Replace <token> with a valid Bearer token from browser devtools
curl -s -H "Authorization: Bearer <token>" \
     -H "X-Workspace-ID: <workspace-id>" \
     http://localhost:8000/api/v1/notifications/counts/ | python -m json.tool
```

Expected: JSON with `all`, `unread`, `mentions`, `assigned`, `watching`, `archived`, `by_project` keys.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/notifications/views.py \
        backend/apps/notifications/urls.py
git commit -m "feat(notifications): add counts, archive, mark-unread endpoints"
```

---

### Task 4: Frontend — types + service

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/notification.service.ts`

- [ ] **Step 1: Update Notification interface and add NotificationCounts**

In `frontend/src/types/index.ts`, replace the `Notification` interface:

```typescript
export interface Notification {
  id: string
  type: string
  entityType: string
  entityId: string
  title: string
  message: string | null
  actionUrl: string | null
  isRead: boolean
  readAt: string | null
  isArchived: boolean
  actor: {
    id: string
    name: string
    avatarUrl: string | null
  } | null
  createdAt: string
}

export interface NotificationCounts {
  all: number
  unread: number
  mentions: number
  assigned: number
  watching: number
  archived: number
  by_project: Record<string, number>
}
```

- [ ] **Step 2: Update notification.service.ts**

Replace full content of `frontend/src/services/notification.service.ts`:

```typescript
import api from '@/lib/axios'
import type { Notification, NotificationCounts, PaginatedResponse } from '@/types'

export interface InboxParams {
  filter?: 'all' | 'unread' | 'mentions' | 'assigned' | 'watching' | 'archived'
  project_id?: string
  unread?: '1'
}

export const notificationService = {
  list: (unreadOnly = false) =>
    api.get<PaginatedResponse<Notification>>('/notifications/', {
      params: unreadOnly ? { unread: '1' } : {},
    }).then((r) => r.data),

  listFiltered: (params: InboxParams) =>
    api.get<PaginatedResponse<Notification>>('/notifications/', { params }).then((r) => r.data),

  unreadCount: () =>
    api.get<{ unread_count: number }>('/notifications/unread-count/').then((r) => r.data),

  counts: () =>
    api.get<NotificationCounts>('/notifications/counts/').then((r) => r.data),

  markRead: (id: string) =>
    api.post<Notification>(`/notifications/${id}/read/`).then((r) => r.data),

  markAllRead: () =>
    api.post<{ marked_read: number }>('/notifications/mark-all-read/').then((r) => r.data),

  archive: (id: string) =>
    api.post<Notification>(`/notifications/${id}/archive/`).then((r) => r.data),

  markUnread: (id: string) =>
    api.post<Notification>(`/notifications/${id}/unread/`).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/notifications/${id}/`),
}
```

- [ ] **Step 3: Also update mapNotification in useNotificationSocket.ts to include isArchived**

In `frontend/src/hooks/useNotificationSocket.ts`, update `mapNotification`:

```typescript
function mapNotification(raw: any): Notification {
  return {
    id: raw.id,
    type: raw.type,
    entityType: raw.entity_type,
    entityId: raw.entity_id,
    title: raw.title,
    message: raw.message ?? null,
    actionUrl: raw.action_url ?? null,
    isRead: raw.is_read ?? false,
    readAt: raw.read_at ?? null,
    isArchived: raw.is_archived ?? false,
    actor: raw.actor_detail
      ? { id: raw.actor_detail.id, name: raw.actor_detail.name, avatarUrl: raw.actor_detail.avatar_url ?? null }
      : null,
    createdAt: raw.created_at,
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts \
        frontend/src/services/notification.service.ts \
        frontend/src/hooks/useNotificationSocket.ts
git commit -m "feat(notifications): add isArchived type, NotificationCounts, service methods"
```

---

### Task 5: Frontend — useInbox.ts hook + socket invalidation

**Files:**
- Create: `frontend/src/hooks/useInbox.ts`
- Modify: `frontend/src/hooks/useNotificationSocket.ts`

- [ ] **Step 1: Create useInbox.ts**

Create `frontend/src/hooks/useInbox.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationService, type InboxParams } from '@/services/notification.service'

export function useInboxNotifications(
  filter: InboxParams['filter'] = 'all',
  projectId?: string,
  unreadOnly?: boolean,
) {
  const params: InboxParams = {}
  if (filter && filter !== 'all') params.filter = filter
  if (projectId) params.project_id = projectId
  if (unreadOnly) params.unread = '1'

  return useQuery({
    queryKey: ['inbox', filter, projectId ?? null, unreadOnly ?? false],
    queryFn: () => notificationService.listFiltered(params),
  })
}

export function useNotificationCounts() {
  return useQuery({
    queryKey: ['notification-counts'],
    queryFn: () => notificationService.counts(),
    refetchInterval: 60_000,
  })
}

export function useArchiveNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationService.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox'] })
      qc.invalidateQueries({ queryKey: ['notification-counts'] })
      qc.invalidateQueries({ queryKey: ['notification-unread-count'] })
    },
  })
}

export function useMarkUnread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationService.markUnread(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox'] })
      qc.invalidateQueries({ queryKey: ['notification-counts'] })
      qc.invalidateQueries({ queryKey: ['notification-unread-count'] })
    },
  })
}

export function useInboxMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox'] })
      qc.invalidateQueries({ queryKey: ['notification-counts'] })
      qc.invalidateQueries({ queryKey: ['notification-unread-count'] })
    },
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox'] })
      qc.invalidateQueries({ queryKey: ['notification-counts'] })
      qc.invalidateQueries({ queryKey: ['notification-unread-count'] })
    },
  })
}
```

- [ ] **Step 2: Update useNotificationSocket.ts to invalidate inbox cache on new notifications**

In `frontend/src/hooks/useNotificationSocket.ts`, add `useQueryClient` import and add invalidation inside the `ws.onmessage` handler:

```typescript
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import keycloak from '@/lib/keycloak'
import { useNotificationStore } from '@/stores/notificationStore'
import type { Notification } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotification(raw: any): Notification {
  return {
    id: raw.id,
    type: raw.type,
    entityType: raw.entity_type,
    entityId: raw.entity_id,
    title: raw.title,
    message: raw.message ?? null,
    actionUrl: raw.action_url ?? null,
    isRead: raw.is_read ?? false,
    readAt: raw.read_at ?? null,
    isArchived: raw.is_archived ?? false,
    actor: raw.actor_detail
      ? { id: raw.actor_detail.id, name: raw.actor_detail.name, avatarUrl: raw.actor_detail.avatar_url ?? null }
      : null,
    createdAt: raw.created_at,
  }
}

export function useNotificationSocket() {
  const { addNotification, showToast } = useNotificationStore()
  const qc = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const wsBase = import.meta.env.VITE_WS_URL || '/ws'
    const token = keycloak.token ?? ''

    function connect() {
      const ws = new WebSocket(`${wsBase}/notifications/?token=${token}`)
      wsRef.current = ws

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'notification.new' && msg.notification) {
            const n = mapNotification(msg.notification)
            addNotification(n)
            showToast({ id: n.id, title: n.title, message: n.message, actionUrl: n.actionUrl })
            qc.invalidateQueries({ queryKey: ['inbox'] })
            qc.invalidateQueries({ queryKey: ['notification-counts'] })
          }
        } catch {
          // ignore malformed
        }
      }

      ws.onclose = (e) => {
        if (e.code !== 1000) {
          setTimeout(connect, 5000)
        }
      }
    }

    if (token) connect()

    return () => {
      wsRef.current?.close(1000)
    }
  }, [addNotification, showToast, qc])
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useInbox.ts \
        frontend/src/hooks/useNotificationSocket.ts
git commit -m "feat(notifications): add useInbox hooks + realtime inbox invalidation"
```

---

### Task 6: Frontend — InboxEmptyState + InboxItem components

**Files:**
- Create: `frontend/src/features/notifications/InboxEmptyState.tsx`
- Create: `frontend/src/features/notifications/InboxItem.tsx`

- [ ] **Step 1: Create InboxEmptyState.tsx**

Create `frontend/src/features/notifications/InboxEmptyState.tsx`:

```tsx
import { Inbox, AtSign, UserCheck, Eye, Archive, FolderKanban } from 'lucide-react'

type FilterType = 'all' | 'unread' | 'mentions' | 'assigned' | 'watching' | 'archived' | 'project'

const CONFIG: Record<FilterType, { icon: React.ElementType; message: string }> = {
  all: { icon: Inbox, message: 'Você está em dia 👌' },
  unread: { icon: Inbox, message: 'Você está em dia 👌' },
  mentions: { icon: AtSign, message: 'Nenhuma menção recente' },
  assigned: { icon: UserCheck, message: 'Nenhuma atribuição nova' },
  watching: { icon: Eye, message: 'Nenhuma atividade nos itens que você observa' },
  archived: { icon: Archive, message: 'Nenhuma notificação arquivada' },
  project: { icon: FolderKanban, message: 'Sem notificações neste projeto' },
}

interface Props {
  filter: FilterType
}

export function InboxEmptyState({ filter }: Props) {
  const { icon: Icon, message } = CONFIG[filter] ?? CONFIG.all

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <Icon className="h-16 w-16 text-gray-300" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}
```

- [ ] **Step 2: Create InboxItem.tsx**

Create `frontend/src/features/notifications/InboxItem.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import {
  AtSign, UserCheck, CheckCircle, MessageSquare, Diamond, Bell,
  CheckCheck, RotateCcw, Archive,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

function typeChip(type: string) {
  switch (type) {
    case 'issue_mentioned':
    case 'wiki_mentioned':
      return { Icon: AtSign, label: '@' }
    case 'issue_assigned':
      return { Icon: UserCheck, label: '▸' }
    case 'issue_state_changed':
      return { Icon: CheckCircle, label: '✓' }
    case 'issue_commented':
      return { Icon: MessageSquare, label: '💬' }
    case 'cpm_critical_alert':
      return { Icon: Diamond, label: '◆' }
    default:
      return { Icon: Bell, label: '·' }
  }
}

interface Props {
  notification: Notification
  onMarkRead: (id: string) => void
  onMarkUnread: (id: string) => void
  onArchive: (id: string) => void
}

export function InboxItem({ notification, onMarkRead, onMarkUnread, onArchive }: Props) {
  const navigate = useNavigate()
  const { Icon } = typeChip(notification.type)

  function handleClick() {
    if (!notification.isRead) onMarkRead(notification.id)
    if (notification.actionUrl) navigate(notification.actionUrl)
  }

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-3 border-b border-dashed border-gray-200 px-6 py-2.5 hover:bg-gray-50 transition-colors',
        notification.isRead && 'opacity-65',
      )}
      onClick={handleClick}
    >
      {/* Type chip */}
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          notification.isRead
            ? 'bg-gray-100 text-gray-400'
            : 'bg-primary text-white',
        )}
      >
        <Icon className="h-3 w-3" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm', !notification.isRead && 'font-medium')}>
          {notification.title}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-gray-400">
          {notification.entityType === 'issue' ? `${notification.entityId.slice(0, 8)} · ` : ''}
          {new Date(notification.createdAt).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>

      {/* Hover actions */}
      <div
        className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {!notification.isRead && (
          <button
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            title="Marcar como lida"
            onClick={() => onMarkRead(notification.id)}
          >
            <CheckCheck className="h-3.5 w-3.5" />
          </button>
        )}
        {notification.isRead && !notification.isArchived && (
          <button
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            title="Marcar como não lida"
            onClick={() => onMarkUnread(notification.id)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
        {!notification.isArchived && (
          <button
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            title="Arquivar"
            onClick={() => onArchive(notification.id)}
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/notifications/InboxEmptyState.tsx \
        frontend/src/features/notifications/InboxItem.tsx
git commit -m "feat(inbox): add InboxEmptyState and InboxItem components"
```

---

### Task 7: Frontend — InboxList component

**Files:**
- Create: `frontend/src/features/notifications/InboxList.tsx`

- [ ] **Step 1: Create InboxList.tsx**

Create `frontend/src/features/notifications/InboxList.tsx`:

```tsx
import { useMemo } from 'react'
import type { Notification } from '@/types'
import { InboxItem } from './InboxItem'

interface DateGroup {
  label: string
  items: Notification[]
}

function groupByDate(notifications: Notification[]): DateGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const groups: Record<string, Notification[]> = {
    Hoje: [],
    Ontem: [],
    'Esta semana': [],
    'Mais antigas': [],
  }

  for (const n of notifications) {
    const d = new Date(n.createdAt)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if (day >= today) {
      groups['Hoje'].push(n)
    } else if (day >= yesterday) {
      groups['Ontem'].push(n)
    } else if (day >= weekAgo) {
      groups['Esta semana'].push(n)
    } else {
      groups['Mais antigas'].push(n)
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}

interface Props {
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onMarkUnread: (id: string) => void
  onArchive: (id: string) => void
}

export function InboxList({ notifications, onMarkRead, onMarkUnread, onArchive }: Props) {
  const groups = useMemo(() => groupByDate(notifications), [notifications])

  return (
    <div>
      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-6 py-2 text-[10px] font-mono uppercase tracking-widest text-gray-400">
            {group.label}
          </div>
          {group.items.map((n) => (
            <InboxItem
              key={n.id}
              notification={n}
              onMarkRead={onMarkRead}
              onMarkUnread={onMarkUnread}
              onArchive={onArchive}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/notifications/InboxList.tsx
git commit -m "feat(inbox): add InboxList with date-grouped notifications"
```

---

### Task 8: Frontend — InboxSidebar component

**Files:**
- Create: `frontend/src/features/notifications/InboxSidebar.tsx`

- [ ] **Step 1: Create InboxSidebar.tsx**

Create `frontend/src/features/notifications/InboxSidebar.tsx`:

```tsx
import { Inbox, Circle, AtSign, UserCheck, Eye, Archive, FolderKanban } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationCounts } from '@/types'
import type { Project } from '@/types'

type FilterValue = 'all' | 'unread' | 'mentions' | 'assigned' | 'watching' | 'archived'

interface FilterItem {
  value: FilterValue
  label: string
  icon: React.ElementType
}

const FILTERS: FilterItem[] = [
  { value: 'all', label: 'Tudo', icon: Inbox },
  { value: 'unread', label: 'Não lidas', icon: Circle },
  { value: 'mentions', label: '@ Menções', icon: AtSign },
  { value: 'assigned', label: 'Atribuídas', icon: UserCheck },
  { value: 'watching', label: 'Observando', icon: Eye },
]

interface Props {
  activeFilter: FilterValue | string   // string when it's a project UUID
  activeProjectId: string | undefined
  unreadOnly: boolean
  counts: NotificationCounts | undefined
  projects: Project[]
  onFilterChange: (filter: FilterValue) => void
  onProjectSelect: (projectId: string) => void
  onUnreadOnlyChange: (val: boolean) => void
}

export function InboxSidebar({
  activeFilter,
  activeProjectId,
  unreadOnly,
  counts,
  projects,
  onFilterChange,
  onProjectSelect,
  onUnreadOnlyChange,
}: Props) {
  function countFor(filter: FilterValue): number | undefined {
    if (!counts) return undefined
    return counts[filter] > 0 ? counts[filter] : undefined
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-white py-4">
      <div className="px-4 pb-3">
        <p className="text-sm font-semibold text-gray-800">🔔 Inbox</p>
      </div>

      {/* Main filters */}
      <nav className="flex flex-col gap-0.5 px-2">
        {FILTERS.map(({ value, label, icon: Icon }) => {
          const isActive = activeFilter === value && !activeProjectId
          const count = countFor(value)
          return (
            <button
              key={value}
              onClick={() => onFilterChange(value)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {count !== undefined && (
                <span className="ml-auto font-mono text-xs">{count}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Projects section */}
      {projects.length > 0 && (
        <div className="mt-4 flex flex-col">
          <div className="flex items-center px-5 py-2">
            <span className="flex-1 text-[10px] font-mono uppercase tracking-widest text-gray-400">
              Projetos
            </span>
            <label className="flex cursor-pointer items-center gap-1 text-[10px] text-gray-400">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={unreadOnly}
                onChange={(e) => onUnreadOnlyChange(e.target.checked)}
              />
              Não lidas
            </label>
          </div>
          <div className="flex flex-col gap-0.5 px-2">
            {projects.map((p) => {
              const isActive = activeProjectId === p.id
              const projCount = counts?.by_project?.[p.id]
              return (
                <button
                  key={p.id}
                  onClick={() => onProjectSelect(p.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-gray-600 hover:bg-gray-100',
                  )}
                >
                  <FolderKanban className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-left">{p.name}</span>
                  {projCount !== undefined && projCount > 0 && (
                    <span className="ml-auto font-mono text-xs">{projCount}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Archived — pushed to bottom */}
      <div className="mt-auto px-2 pt-2 border-t border-gray-100">
        <button
          onClick={() => onFilterChange('archived')}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
            activeFilter === 'archived' && !activeProjectId
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-gray-600 hover:bg-gray-100',
          )}
        >
          <Archive className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Arquivadas</span>
          {counts?.archived !== undefined && counts.archived > 0 && (
            <span className="ml-auto font-mono text-xs">{counts.archived}</span>
          )}
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/notifications/InboxSidebar.tsx
git commit -m "feat(inbox): add InboxSidebar with filter nav and project list"
```

---

### Task 9: Frontend — InboxPage (main layout)

**Files:**
- Create: `frontend/src/features/notifications/InboxPage.tsx`

- [ ] **Step 1: Create InboxPage.tsx**

Create `frontend/src/features/notifications/InboxPage.tsx`:

```tsx
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjects } from '@/hooks/useProjects'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import {
  useInboxNotifications,
  useNotificationCounts,
  useArchiveNotification,
  useMarkUnread,
  useInboxMarkRead,
  useMarkAllRead,
} from '@/hooks/useInbox'
import { InboxSidebar } from './InboxSidebar'
import { InboxList } from './InboxList'
import { InboxEmptyState } from './InboxEmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'

type FilterValue = 'all' | 'unread' | 'mentions' | 'assigned' | 'watching' | 'archived'

const FILTER_LABELS: Record<FilterValue, string> = {
  all: 'Tudo',
  unread: 'Não lidas',
  mentions: '@ Menções',
  assigned: 'Atribuídas',
  watching: 'Observando',
  archived: 'Arquivadas',
}

export function InboxPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const filter = (searchParams.get('filter') as FilterValue) || 'all'
  const projectId = searchParams.get('project') ?? undefined
  const unreadOnly = searchParams.get('unread') === '1'

  const { workspace } = useWorkspaceStore()
  const { data: projectsData = [] } = useProjects(workspace?.id ?? '')
  const { data: counts } = useNotificationCounts()

  const { data, isLoading } = useInboxNotifications(
    projectId ? 'all' : filter,
    projectId,
    unreadOnly,
  )
  const notifications = data?.results ?? []

  const archiveMutation = useArchiveNotification()
  const markUnreadMutation = useMarkUnread()
  const markReadMutation = useInboxMarkRead()
  const markAllReadMutation = useMarkAllRead()

  function setFilter(f: FilterValue) {
    setSearchParams({ filter: f })
  }

  function selectProject(id: string) {
    setSearchParams(unreadOnly ? { project: id, unread: '1' } : { project: id })
    setMobileSidebarOpen(false)
  }

  function toggleUnreadOnly(val: boolean) {
    const next = new URLSearchParams(searchParams)
    if (val) next.set('unread', '1')
    else next.delete('unread')
    setSearchParams(next)
  }

  const titleLabel = projectId
    ? projectsData.find((p) => p.id === projectId)?.name ?? 'Projeto'
    : FILTER_LABELS[filter] ?? 'Tudo'

  const emptyFilter = projectId ? 'project' : (filter as FilterValue)

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <InboxSidebar
          activeFilter={projectId ? 'all' : filter}
          activeProjectId={projectId}
          unreadOnly={unreadOnly}
          counts={counts}
          projects={projectsData}
          onFilterChange={setFilter}
          onProjectSelect={selectProject}
          onUnreadOnlyChange={toggleUnreadOnly}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute left-0 top-0 h-full" onClick={(e) => e.stopPropagation()}>
            <InboxSidebar
              activeFilter={projectId ? 'all' : filter}
              activeProjectId={projectId}
              unreadOnly={unreadOnly}
              counts={counts}
              projects={projectsData}
              onFilterChange={(f) => { setFilter(f); setMobileSidebarOpen(false) }}
              onProjectSelect={selectProject}
              onUnreadOnlyChange={toggleUnreadOnly}
            />
          </div>
        </div>
      )}

      {/* Main body */}
      <div className="flex flex-1 flex-col min-h-0">
        {/* Topbar */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
          <button
            className="lg:hidden rounded p-1 text-gray-500 hover:bg-gray-100"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Filter className="h-4 w-4" />
          </button>
          <h1 className="flex-1 text-sm font-semibold text-gray-800">{titleLabel}</h1>
          {notifications.length > 0 && filter !== 'archived' && (
            <Button
              variant="ghost"
              size="sm"
              loading={markAllReadMutation.isPending}
              onClick={() => markAllReadMutation.mutate()}
            >
              Marcar tudo como lido
            </Button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : notifications.length === 0 ? (
            <InboxEmptyState filter={emptyFilter} />
          ) : (
            <InboxList
              notifications={notifications}
              onMarkRead={(id) => markReadMutation.mutate(id)}
              onMarkUnread={(id) => markUnreadMutation.mutate(id)}
              onArchive={(id) => archiveMutation.mutate(id)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/notifications/InboxPage.tsx
git commit -m "feat(inbox): add InboxPage main layout with filter state and mutations"
```

---

### Task 10: Frontend — route + sidebar link

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add route to App.tsx**

In `frontend/src/App.tsx`:

Add import after the last import line:
```tsx
import { InboxPage } from './features/notifications/InboxPage'
```

Add route inside the `<Route element={<AppLayout />}>` block, after the `/settings` route (before the closing `</Route>`):
```tsx
<Route path="/inbox" element={<InboxPage />} />
```

- [ ] **Step 2: Add Bell nav item to Sidebar.tsx**

In `frontend/src/components/layout/Sidebar.tsx`:

Add `Bell` to the lucide-react import:
```tsx
import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  Settings,
  Plus,
  Users,
  BookOpen,
  Bell,
} from 'lucide-react'
```

Add the Inbox nav item after `<NavItem to="/wiki" .../>` in the main nav section:
```tsx
<NavItem to="/wiki" icon={BookOpen} label="Wiki" />
<NavItem to="/inbox" icon={Bell} label="Inbox" />
<NavItem to="/workspace/resources" icon={Users} label="Recursos" />
```

- [ ] **Step 3: Run typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Sync frontend to WSL/server**

```bash
make sync-frontend
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx \
        frontend/src/components/layout/Sidebar.tsx
git commit -m "feat(inbox): add /inbox route and Bell nav item in Sidebar"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|-----------------|------|
| `is_archived` field + DB column | Task 1 |
| `GET /notifications/?filter=&project_id=&unread=` | Task 2 |
| `GET /notifications/counts/` with `by_project` | Task 3 |
| `POST /notifications/<id>/archive/` | Task 3 |
| `POST /notifications/<id>/unread/` | Task 3 |
| `NotificationCounts` type + `isArchived` on `Notification` | Task 4 |
| Service methods: `listFiltered`, `counts`, `archive`, `markUnread` | Task 4 |
| `useInboxNotifications`, `useNotificationCounts`, mutations | Task 5 |
| Socket invalidates `['inbox']` + `['notification-counts']` on new notif | Task 5 |
| `InboxEmptyState` per filter | Task 6 |
| `InboxItem` with chip, content, hover actions | Task 6 |
| `InboxList` grouped by date (Hoje/Ontem/Esta semana/Mais antigas) | Task 7 |
| `InboxSidebar` with all filters + project list + unread checkbox + Arquivadas at bottom | Task 8 |
| `InboxPage` two-column layout, URL persistence, mobile overlay, mark-all-read | Task 9 |
| `/inbox` route + Bell icon in Sidebar | Task 10 |

All spec requirements are covered.

### Placeholder scan

No TBD, TODO, or "implement later" in any task. All steps include complete code.

### Type consistency

- `FilterValue` is `'all' | 'unread' | 'mentions' | 'assigned' | 'watching' | 'archived'` — used consistently in `InboxSidebar`, `InboxPage`, `InboxEmptyState`.
- `useInboxNotifications(filter, projectId, unreadOnly)` signature matches call in `InboxPage`.
- `onMarkRead`, `onMarkUnread`, `onArchive` prop signatures match between `InboxList` → `InboxItem`.
- `NotificationCounts.by_project` is `Record<string, number>` — matches backend response and usage in `InboxSidebar` (`counts?.by_project?.[p.id]`).
