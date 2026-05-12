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
