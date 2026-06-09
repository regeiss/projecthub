import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNotificationStore } from '@/stores/notificationStore'

export function NotificationToast() {
  const { toast, clearToast } = useNotificationStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(clearToast, 5000)
    return () => clearTimeout(timer)
  }, [toast, clearToast])

  function handleClick() {
    if (toast?.actionUrl) navigate(toast.actionUrl)
    clearToast()
  }

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.title}
          initial={{ opacity: 0, x: 340, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 35 } }}
          exit={{ opacity: 0, x: 340, scale: 0.95, transition: { duration: 0.2, ease: 'easeIn' } }}
          className="fixed bottom-5 right-5 z-50 flex max-w-sm cursor-pointer items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-lg ring-1 ring-black/5 dark:ring-white/5"
          onClick={handleClick}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
            <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{toast.title}</p>
            {toast.message && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{toast.message}</p>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); clearToast() }}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
