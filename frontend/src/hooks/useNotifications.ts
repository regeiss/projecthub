import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '@/services/notification.service'
import { useNotificationStore } from '@/stores/notificationStore'

export function useNotifications(unreadOnly = false) {
  const setNotifications = useNotificationStore((s) => s.setNotifications)
  return useQuery({
    queryKey: ['notifications', { unreadOnly }],
    queryFn: async () => {
      const data = await notificationService.list(unreadOnly)
      setNotifications(data.results)
      return data
    },
  })
}

export function useUnreadCount() {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)
  return useQuery({
    queryKey: ['notification-unread-count'],
    queryFn: async () => {
      const data = await notificationService.unreadCount()
      setUnreadCount(data.unread_count)
      return data
    },
    refetchInterval: 30_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  const markRead = useNotificationStore((s) => s.markRead)
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: (_, id) => {
      markRead(id)
      qc.invalidateQueries({ queryKey: ['notification-unread-count'] })
    },
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notification-unread-count'] })
    },
  })
}
