import { useNotifications, useMarkNotificationRead, useMarkAllRead } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { relativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function NotificationPanel() {
  const { data } = useNotifications()
  const notifications = data?.results ?? []
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllRead()

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificações</h2>
        {notifications.some((n) => !n.isRead) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAll.mutate()}
            loading={markAll.isPending}
          >
            Marcar todas como lidas
          </Button>
        )}
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400 dark:text-gray-500">
            Sem notificações
          </p>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              className={cn(
                'flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800',
                !n.isRead && 'bg-blue-50/40 dark:bg-blue-900/20',
              )}
              onClick={() => {
                if (!n.isRead) markRead.mutate(n.id)
                if (n.actionUrl) window.location.href = n.actionUrl
              }}
            >
              {n.actor ? (
                <Avatar
                  src={n.actor.avatarUrl}
                  name={n.actor.name}
                  size="sm"
                  className="mt-0.5 shrink-0"
                />
              ) : (
                <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/30" />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm', !n.isRead && 'font-medium text-gray-900 dark:text-gray-100')}>
                  {n.title}
                </p>
                {n.message && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  {relativeTime(n.createdAt)}
                </p>
              </div>
              {!n.isRead && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
