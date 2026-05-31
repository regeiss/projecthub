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
