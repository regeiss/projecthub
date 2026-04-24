import { useEffect, useState } from 'react'
import keycloak, { initKeycloak } from '@/lib/keycloak'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { workspaceService } from '@/services/workspace.service'
import { PageSpinner } from '@/components/ui/Spinner'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)

  useEffect(() => {
    // Snapshot whether this page load is a redirect callback from Keycloak
    // (KC sets ?code=&session_state= before init() has a chance to clean them).
    // If init() still returns authenticated=false on a callback load, the PKCE
    // exchange failed — calling login() again would create an infinite loop.
    const isKcCallback =
      new URLSearchParams(window.location.search).has('code') ||
      new URLSearchParams(window.location.search).has('session_state')

    initKeycloak()
      .then(async (authenticated) => {
        if (!authenticated) {
          if (isKcCallback) {
            // Code exchange failed on a callback — break the potential loop.
            // Clear any stale KC state and let the user retry manually.
            keycloak.clearToken()
            setReady(true)
          } else {
            keycloak.login()
          }
          return
        }
        try {
          const member = await workspaceService.me()
          setUser(member)

          const workspaces = await workspaceService.list()
          if (workspaces.length > 0) {
            setWorkspace(workspaces[0])
          }
        } catch {
          // workspace not yet created — user will be redirected to onboarding
        } finally {
          setReady(true)
        }
      })
      .catch(() => {
        // If init() threw on a callback load, the session is broken — don't loop.
        if (isKcCallback) {
          keycloak.clearToken()
          setReady(true)
        } else {
          keycloak.login()
        }
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