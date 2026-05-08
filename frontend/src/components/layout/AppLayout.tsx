import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useNotificationSocket } from '@/hooks/useNotificationSocket'
import { NotificationToast } from '@/features/notifications/NotificationToast'

function NotificationSocketMount() {
  useNotificationSocket()
  return null
}

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-space dark:bg-gray-950">
      <NotificationSocketMount />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <NotificationToast />
    </div>
  )
}
