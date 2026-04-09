import Keycloak from 'keycloak-js'

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
    onLoad: 'login-required',
    checkLoginIframe: false,
    pkceMethod: 'S256',
    redirectUri: window.location.origin + '/',
  })
  return _initPromise
}

export default keycloak
