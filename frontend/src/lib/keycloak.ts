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

export function initKeycloak(): Promise<boolean> {
  if (_initPromise) return _initPromise
  _initPromise = keycloak.init({
    onLoad: 'check-sso',
    silentCheckSsoFallback: false,
    checkLoginIframe: false,
    pkceMethod: 'S256',
    redirectUri: window.location.origin + '/',
  })
  return _initPromise
}

export default keycloak
