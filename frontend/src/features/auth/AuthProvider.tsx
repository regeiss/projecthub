import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import keycloak, { initKeycloak, IS_KC_CALLBACK } from '@/lib/keycloak'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { workspaceService } from '@/services/workspace.service'
import { PageSpinner } from '@/components/ui/Spinner'

// Retries workspaceService.me() up to maxAttempts times with a fixed delay
// between attempts. Keeps the spinner visible while the backend starts up
// (e.g. after a Docker restart) without flashing the sign-in page.
async function fetchMeWithRetry(
  maxAttempts: number,
  delayMs: number,
  cancelled: () => boolean,
) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await workspaceService.me()
    } catch {
      if (i === maxAttempts - 1) throw new Error('backend unavailable')
      await new Promise((r) => setTimeout(r, delayMs))
      if (cancelled()) throw new Error('cancelled')
    }
  }
  throw new Error('unreachable')
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)
  const setUser = useAuthStore((s) => s.setUser)
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    initKeycloak()
      .then(async (authenticated) => {
        if (cancelled) return

        if (!authenticated) {
          if (IS_KC_CALLBACK) {
            // Keycloak returned an error code — show message instead of looping.
            setBootError('Falha na autenticação. Recarregue e tente novamente.')
            setReady(true)
          } else {
            keycloak.login()
          }
          return
        }

        // Step 1 — resolve the current user, retrying while the backend warms up.
        let member
        try {
          member = await fetchMeWithRetry(4, 2500, () => cancelled)
          if (cancelled) return
          setUser(member)
        } catch (err: unknown) {
          if (cancelled) return
          const msg = err instanceof Error && err.message === 'cancelled'
            ? null
            : 'Serviço indisponível. Verifique a conectividade e recarregue a página.'
          if (msg) setBootError(msg)
          setReady(true)
          return
        }

        // Step 2 — resolve workspaces (separate boundary so failure here
        // never triggers the onboarding wizard).
        try {
          const workspaces = await workspaceService.list()
          if (cancelled) return
          if (workspaces.length > 0) {
            setWorkspace(workspaces[0])
          } else {
            navigate('/onboarding', { replace: true })
          }
        } catch (err: unknown) {
          console.error('[AuthProvider] workspace list failed:', err)
        } finally {
          if (!cancelled) setReady(true)
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[AuthProvider] keycloak init error:', err)
        setReady(true)
      })

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

  if (bootError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-sm text-gray-500">{bootError}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          Recarregar
        </button>
      </div>
    )
  }

  return <>{children}</>
}
