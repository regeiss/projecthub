import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import keycloak, { initKeycloak, IS_KC_CALLBACK } from '@/lib/keycloak'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { workspaceService } from '@/services/workspace.service'
import { PageSpinner } from '@/components/ui/Spinner'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)
  const navigate = useNavigate()

  useEffect(() => {
    // Cancellation flag prevents StrictMode's double-invocation from running
    // two parallel bootstraps. The first effect's cleanup sets this to true,
    // so only the second (surviving) invocation actually acts on the result.
    let cancelled = false

    initKeycloak()
      .then(async (authenticated) => {
        if (cancelled) return
        if (!authenticated) {
          if (IS_KC_CALLBACK) {
            // Returned from Keycloak with an error — show sign-in as fallback.
            keycloak.clearToken()
            setReady(true)
          } else {
            // First visit: skip the app sign-in page and go straight to Keycloak.
            keycloak.login()
          }
          return
        }
        try {
          const member = await workspaceService.me()
          if (cancelled) return
          setUser(member)

          const workspaces = await workspaceService.list()
          if (cancelled) return
          if (workspaces.length > 0) {
            setWorkspace(workspaces[0])
          } else {
            navigate('/request-access', { replace: true })
          }
        } catch (err: unknown) {
          console.error('[AuthProvider] bootstrap error:', err)
          // Authenticated but API failed (wrong issuer, 5xx, network down).
          // Send to onboarding — the user has a valid session and just needs
          // to land somewhere useful. ProtectedRoute → /sign-in would loop
          // because AuthProvider would redirect to Keycloak again.
          if (!cancelled) navigate('/request-access', { replace: true })
        } finally {
          if (!cancelled) setReady(true)
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[AuthProvider] keycloak init error:', err)
        if (IS_KC_CALLBACK) keycloak.clearToken()
        setReady(true)
      })

    // Token refresh — only when authenticated, 60 s before expiry
    const interval = setInterval(() => {
      if (keycloak.authenticated) {
        keycloak.updateToken(60).catch(() => keycloak.login())
      }
    }, 30_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [setUser, setWorkspace])

  if (!ready) return <PageSpinner />

  return <>{children}</>
}