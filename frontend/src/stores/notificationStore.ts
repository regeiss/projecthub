import { create } from 'zustand'
import type { Notification } from '@/types'

interface NotificationState {
  unreadCount: number
  notifications: Notification[]
  addNotification: (n: Notification) => void
  markRead: (id: string) => void
  setUnreadCount: (n: number) => void
  setNotifications: (notifications: Notification[]) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  notifications: [],
  addNotification: (n) =>
    set((state) => ({
      notifications: [n, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setNotifications: (notifications) => set({ notifications }),
}))
