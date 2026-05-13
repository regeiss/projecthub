import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useNotifications, useMarkNotificationRead, useMarkAllRead, useDeleteNotification } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { relativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  issue_assigned: 'Atribuição',
  issue_commented: 'Comentário',
  issue_state_changed: 'Estado',
  issue_mentioned: 'Menção',
  issue_updated: 'Atualização',
  wiki_mentioned: 'Menção Wiki',
  wiki_updated: 'Wiki',
  cpm_critical_alert: 'CPM',
  portfolio_rag_changed: 'Portfolio',
}

export function NotificationPanel({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate()
  const { data } = useNotifications()
  const notifications = data?.results ?? []
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllRead()
  const deleteNotif = useDeleteNotification()

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

      <div className="divide-y divide-gray-100 dark:divide-gray-800 overflow-y-auto max-h-[480px]">
        {notifications.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400 dark:text-gray-500">
            Sem notificações
          </p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                'group flex items-start gap-3 px-4 py-3',
                !n.isRead && 'bg-blue-50/40 dark:bg-blue-900/20',
              )}
            >
              <button
                className="flex flex-1 items-start gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 rounded-md transition-colors min-w-0"
                onClick={() => {
                  if (!n.isRead) markRead.mutate(n.id)
                  if (n.actionUrl) navigate(n.actionUrl)
                }}
              >
                {n.actor ? (
                  <Avatar src={n.actor.avatarUrl} name={n.actor.name} size="sm" className="mt-0.5 shrink-0" />
                ) : (
                  <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/30" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {TYPE_LABELS[n.type] && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-400 flex-shrink-0">
                        {TYPE_LABELS[n.type]}
                      </span>
                    )}
                    {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                  </div>
                  <p className={cn('text-sm leading-snug mt-0.5', !n.isRead && 'font-medium text-gray-900 dark:text-gray-100')}>
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{relativeTime(n.createdAt)}</p>
                </div>
              </button>
              <button
                onClick={() => deleteNotif.mutate(n.id)}
                className="mt-1 flex-shrink-0 rounded p-0.5 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remover"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <button
          onClick={() => { onClose?.(); navigate('/inbox') }}
          className="w-full text-center text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium py-1 transition-colors"
        >
          Ver todas as notificações →
        </button>
      </div>
    </div>
  )
}
