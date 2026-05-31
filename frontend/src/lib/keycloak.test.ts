import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildLogoutUrl } from './keycloak'

describe('buildLogoutUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_KEYCLOAK_URL', 'https://qa-keycloak.novohamburgo.rs.gov.br')
    vi.stubEnv('VITE_KEYCLOAK_REALM', 'PMNH')
    vi.stubEnv('VITE_KEYCLOAK_CLIENT_ID', 'projecthub_frontend')
  })

  it('includes id_token_hint with the exact post-logout redirect URI', () => {
    const url = new URL(
      buildLogoutUrl({
        origin: 'https://dev-projecthub.novohamburgo.rs.gov.br',
        idToken: 'test-id-token',
      }),
    )

    expect(url.origin).toBe('https://qa-keycloak.novohamburgo.rs.gov.br')
    expect(url.pathname).toBe('/realms/PMNH/protocol/openid-connect/logout')
    expect(url.searchParams.get('client_id')).toBe('projecthub_frontend')
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(
      'https://dev-projecthub.novohamburgo.rs.gov.br/',
    )
    expect(url.searchParams.get('id_token_hint')).toBe('test-id-token')
  })
})
