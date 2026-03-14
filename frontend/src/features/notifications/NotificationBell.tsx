import { useState } from 'react'
import { Bell } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUnreadCount } from '@/hooks/useNotifications'
import { NotificationPanel } from './NotificationPanel'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { unreadCount } = useNotificationStore()
  useUnreadCount() // keeps count refreshed

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={cn(
            'relative flex h-7 w-7 items-center justify-center rounded-md text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300',
            open && 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
          )}
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-900/50 animate-in fade-in-0 zoom-in-95"
        >
          <NotificationPanel />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
