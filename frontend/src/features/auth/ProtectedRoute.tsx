import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { PageSpinner } from '@/components/ui/Spinner'

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  // AuthProvider guarantees user is set before rendering children.
  // The spinner here is a safety net for any edge-case race.
  if (!user) return <PageSpinner />
  return <Outlet />
}
