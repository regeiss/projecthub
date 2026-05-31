import { Outlet } from 'react-router-dom'

// AuthProvider already ensures the user is Keycloak-authenticated before
// rendering children (it shows PageSpinner until ready). No redirect needed here.
export function ProtectedRoute() {
  return <Outlet />
}
