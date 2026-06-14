import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUnreadCount } from '@/hooks/useNotifications'
import { NotificationPanel } from './NotificationPanel'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { unreadCount } = useNotificationStore()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useUnreadCount()

  const [badgeKey, setBadgeKey] = useState(0)
  const prevCount = useRef(unreadCount)
  useEffect(() => {
    if (unreadCount > prevCount.current) setBadgeKey((k) => k + 1)
    prevCount.current = unreadCount
  }, [unreadCount])

  // Close when pointer lands outside both the trigger and the panel
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  function getPanelStyle(): React.CSSProperties {
    if (!triggerRef.current) return {}
    const rect = triggerRef.current.getBoundingClientRect()
    return { position: 'fixed', top: rect.bottom + 8, right: window.innerWidth - rect.right }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex h-7 w-7 items-center justify-center rounded-md text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300',
          open && 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
        )}
        aria-label="Notificações"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            key={badgeKey}
            className="animate-badge-pop absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div ref={panelRef} style={getPanelStyle()} className="z-50">
            <div className="w-80 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-900/50 animate-in fade-in-0 zoom-in-95">
              <NotificationPanel onClose={() => setOpen(false)} />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
