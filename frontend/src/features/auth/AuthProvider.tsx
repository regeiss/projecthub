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
    initKeycloak()
      .then(async (authenticated) => {
        if (!authenticated) {
          keycloak.login()
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
        keycloak.login()
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