import api from '@/lib/axios'
import type { Notification, PaginatedResponse } from '@/types'

export const notificationService = {
  list: (unreadOnly = false) =>
    api.get<PaginatedResponse<Notification>>('/notifications/', {
      params: unreadOnly ? { unread: '1' } : {},
    }).then((r) => r.data),

  unreadCount: () =>
    api.get<{ unread_count: number }>('/notifications/unread-count/').then((r) => r.data),

  markRead: (id: string) =>
    api.post<Notification>(`/notifications/${id}/read/`).then((r) => r.data),

  markAllRead: () =>
    api.post<{ marked_read: number }>('/notifications/mark-all-read/').then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/notifications/${id}/`),
}
