import { create } from 'zustand'
import type { Notification } from '@/types'

interface ToastNotification {
  id: string
  title: string
  message: string | null
  actionUrl: string | null
}

interface NotificationState {
  unreadCount: number
  notifications: Notification[]
  toast: ToastNotification | null
  addNotification: (n: Notification) => void
  markRead: (id: string) => void
  setUnreadCount: (n: number) => void
  setNotifications: (notifications: Notification[]) => void
  showToast: (t: ToastNotification) => void
  clearToast: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  notifications: [],
  toast: null,
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
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
}))
