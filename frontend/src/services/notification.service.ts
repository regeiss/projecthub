import api from '@/lib/axios'
import type { Notification, NotificationCounts, PaginatedResponse } from '@/types'

export interface InboxParams {
  filter?: 'all' | 'unread' | 'mentions' | 'assigned' | 'watching' | 'archived'
  project_id?: string
  unread?: '1'
}

function mapNotification(raw: any): Notification {
  return {
    id: raw.id,
    type: raw.type,
    entityType: raw.entity_type,
    entityId: raw.entity_id,
    title: raw.title,
    message: raw.message ?? null,
    actionUrl: raw.action_url ?? null,
    isRead: raw.is_read,
    readAt: raw.read_at ?? null,
    isArchived: raw.is_archived,
    actor: raw.actor
      ? { id: raw.actor.id, name: raw.actor.name, avatarUrl: raw.actor.avatar_url ?? null }
      : null,
    createdAt: raw.created_at,
  }
}

function mapPage(raw: any): PaginatedResponse<Notification> {
  return { ...raw, results: (raw.results as unknown[]).map(mapNotification) }
}

export const notificationService = {
  list: (unreadOnly = false) =>
    api.get<any>('/notifications/', {
      params: unreadOnly ? { unread: '1' } : {},
    }).then((r) => mapPage(r.data)),

  listFiltered: (params: InboxParams) =>
    api.get<any>('/notifications/', { params }).then((r) => mapPage(r.data)),

  unreadCount: () =>
    api.get<{ unread_count: number }>('/notifications/unread-count/').then((r) => r.data),

  counts: () =>
    api.get<NotificationCounts>('/notifications/counts/').then((r) => r.data),

  markRead: (id: string) =>
    api.post<any>(`/notifications/${id}/read/`).then((r) => mapNotification(r.data)),

  markAllRead: () =>
    api.post<{ marked_read: number }>('/notifications/mark-all-read/').then((r) => r.data),

  archive: (id: string) =>
    api.post<any>(`/notifications/${id}/archive/`).then((r) => mapNotification(r.data)),

  markUnread: (id: string) =>
    api.post<any>(`/notifications/${id}/unread/`).then((r) => mapNotification(r.data)),

  delete: (id: string) =>
    api.delete(`/notifications/${id}/`),
}
