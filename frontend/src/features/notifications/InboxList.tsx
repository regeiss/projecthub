import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Notification } from '@/types'
import { InboxItem } from './InboxItem'

interface DateGroup {
  label: string
  items: Notification[]
}

function groupByDate(notifications: Notification[]): DateGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const groups: Record<string, Notification[]> = {
    Hoje: [],
    Ontem: [],
    'Esta semana': [],
    'Mais antigas': [],
  }

  for (const n of notifications) {
    const d = new Date(n.createdAt ?? (n as any).created_at)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if (day >= today) {
      groups['Hoje'].push(n)
    } else if (day >= yesterday) {
      groups['Ontem'].push(n)
    } else if (day >= weekAgo) {
      groups['Esta semana'].push(n)
    } else {
      groups['Mais antigas'].push(n)
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}

interface Props {
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onMarkUnread: (id: string) => void
  onArchive: (id: string) => void
}

export function InboxList({ notifications, onMarkRead, onMarkUnread, onArchive }: Props) {
  const groups = useMemo(() => groupByDate(notifications), [notifications])

  return (
    <div>
      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-6 py-2 text-[10px] font-mono uppercase tracking-widest text-gray-400">
            {group.label}
          </div>
          <AnimatePresence initial={false}>
            {group.items.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 1 }}
                exit={{
                  opacity: 0,
                  x: -20,
                  height: 0,
                  marginBottom: 0,
                  transition: { duration: 0.22, ease: 'easeOut' },
                }}
                layout
              >
                <InboxItem
                  notification={n}
                  onMarkRead={onMarkRead}
                  onMarkUnread={onMarkUnread}
                  onArchive={onArchive}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
