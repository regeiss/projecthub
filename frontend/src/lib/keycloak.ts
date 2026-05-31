import Keycloak from 'keycloak-js'

// Captured at module load time — before React mounts and before keycloak-js
// calls history.replaceState() to strip ?code=&session_state= from the URL.
// React StrictMode re-runs effects after cleanup, by which point the URL is
// already clean, so computing this inside an effect gives the wrong answer.
export const IS_KC_CALLBACK =
  new URLSearchParams(window.location.search).has('code') ||
  new URLSearchParams(window.location.search).has('session_state')

// Singleton — created once at module level so React StrictMode double-invocation
// does not create two instances or call init() twice.
const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
})

let _initPromise: Promise<boolean> | null = null

export function buildLogoutUrl({
  origin,
  idToken,
}: {
  origin?: string
  idToken?: string
}) {
  const base = `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}/protocol/openid-connect/logout`
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  })

  if (origin) {
    params.set('post_logout_redirect_uri', `${origin}/`)
  }

  if (idToken) {
    params.set('id_token_hint', idToken)
  }

  return `${base}?${params}`
}

export function initKeycloak(): Promise<boolean> {
  if (_initPromise) return _initPromise

  const raw = keycloak.init({
    checkLoginIframe: false,
    pkceMethod: 'S256',
    redirectUri: window.location.origin + '/',
    scope: 'openid profile email',
  })

  // Guard against keycloak.init() hanging indefinitely (e.g. when stored tokens
  // exist in localStorage and the Keycloak server is slow to respond). If the
  // promise doesn't settle within 8 s we reject so AuthProvider can show the
  // sign-in page instead of leaving the user staring at a spinner forever.
  _initPromise = new Promise<boolean>((resolve, reject) => {
    const timer = setTimeout(() => {
      _initPromise = null // allow a fresh attempt next navigation
      reject(new Error('Keycloak init timed out'))
    }, 8000)

    raw.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) },
    )
  })

  return _initPromise
}

export default keycloak
