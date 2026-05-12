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
