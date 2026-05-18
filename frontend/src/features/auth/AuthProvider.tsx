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
    initKeycloak()
      .then(async (authenticated) => {
        if (!authenticated) {
          if (IS_KC_CALLBACK) {
            // Code exchange failed — clear stale KC state and show sign-in.
            keycloak.clearToken()
          }
          navigate('/sign-in', { replace: true })
          setReady(true)
          return
        }
        try {
          const member = await workspaceService.me()
          setUser(member)

          const workspaces = await workspaceService.list()
          if (workspaces.length > 0) {
            setWorkspace(workspaces[0])
          } else {
            navigate('/onboarding', { replace: true })
          }
        } catch {
          navigate('/onboarding', { replace: true })
        } finally {
          setReady(true)
        }
      })
      .catch(() => {
        // init() threw — clear stale state and show sign-in.
        if (IS_KC_CALLBACK) keycloak.clearToken()
        navigate('/sign-in', { replace: true })
        setReady(true)
      })

    // Token refresh — 60 s before expiry
    const interval = setInterval(() => {
      keycloak.updateToken(60).catch(() => keycloak.login())
    }, 30_000)

    return () => clearInterval(interval)
  }, [setUser, setWorkspace])

  if (!ready) return <PageSpinner />

  return <>{children}</>
}