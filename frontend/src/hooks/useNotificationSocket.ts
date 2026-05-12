import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import keycloak from '@/lib/keycloak'
import { useNotificationStore } from '@/stores/notificationStore'
import type { Notification } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotification(raw: any): Notification {
  return {
    id: raw.id,
    type: raw.type,
    entityType: raw.entity_type,
    entityId: raw.entity_id,
    title: raw.title,
    message: raw.message ?? null,
    actionUrl: raw.action_url ?? null,
    isRead: raw.is_read ?? false,
    readAt: raw.read_at ?? null,
    isArchived: raw.is_archived ?? false,
    actor: raw.actor_detail
      ? { id: raw.actor_detail.id, name: raw.actor_detail.name, avatarUrl: raw.actor_detail.avatar_url ?? null }
      : null,
    createdAt: raw.created_at,
  }
}

export function useNotificationSocket() {
  const { addNotification, showToast } = useNotificationStore()
  const qc = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const wsBase = import.meta.env.VITE_WS_URL || '/ws'
    const token = keycloak.token ?? ''

    function connect() {
      const ws = new WebSocket(`${wsBase}/notifications/?token=${token}`)
      wsRef.current = ws

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'notification.new' && msg.notification) {
            const n = mapNotification(msg.notification)
            addNotification(n)
            showToast({ id: n.id, title: n.title, message: n.message, actionUrl: n.actionUrl })
            qc.invalidateQueries({ queryKey: ['inbox'] })
            qc.invalidateQueries({ queryKey: ['notification-counts'] })
          }
        } catch {
          // ignore malformed
        }
      }

      ws.onclose = (e) => {
        // Reconnect on unexpected close (not normal closure)
        if (e.code !== 1000) {
          setTimeout(connect, 5000)
        }
      }
    }

    if (token) connect()

    return () => {
      wsRef.current?.close(1000)
    }
  }, [addNotification, showToast, qc])
}
