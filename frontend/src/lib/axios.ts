import axios from 'axios'
import keycloak from './keycloak'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use((config) => {
  if (keycloak.token) {
    config.headers.Authorization = `Bearer ${keycloak.token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true
      try {
        await keycloak.updateToken(30)
        error.config.headers.Authorization = `Bearer ${keycloak.token}`
        return api(error.config)
      } catch {
        keycloak.logout({ redirectUri: window.location.origin + '/' })
      }
    }
    return Promise.reject(error)
  },
)

export default api
