import axios from 'axios'
import keycloak, { buildLogoutUrl } from './keycloak'
import { useWorkspaceStore } from '@/stores/workspaceStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use((config) => {
  if (keycloak.token) {
    config.headers.Authorization = `Bearer ${keycloak.token}`
  }
  const workspaceId = useWorkspaceStore.getState().workspace?.id
  if (workspaceId) {
    config.headers['X-Workspace-ID'] = workspaceId
  }
  return config
})

// Singleton refresh promise — prevents N concurrent 401s from each calling updateToken.
// _loggedOut flag ensures window.location.replace is called at most once per session.
let _refreshPromise: Promise<void> | null = null
let _loggedOut = false

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true
      try {
        if (!_refreshPromise) {
          _refreshPromise = keycloak.updateToken(30).then(() => undefined).finally(() => {
            _refreshPromise = null
          })
        }
        await _refreshPromise
        error.config.headers.Authorization = `Bearer ${keycloak.token}`
        return api(error.config)
      } catch {
        if (!_loggedOut) {
          _loggedOut = true
          window.location.replace(
            buildLogoutUrl({ origin: window.location.origin, idToken: keycloak.idToken }),
          )
        }
      }
    }
    return Promise.reject(error)
  },
)

export default api
