import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useKeycloakUsers } from './useWorkspace'

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    keycloakUsers: vi.fn().mockResolvedValue([{ sub: 'a', email: 'a@b.com', name: 'Alice' }]),
    addMember: vi.fn().mockResolvedValue({ id: '1', email: 'a@b.com', name: 'Alice', role: 'member' }),
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue({}),
    members: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    updateMemberRole: vi.fn().mockResolvedValue({}),
    me: vi.fn().mockResolvedValue({}),
  },
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client: qc }, children)
}

describe('useKeycloakUsers', () => {
  it('is disabled when search length < 2', () => {
    const { result } = renderHook(() => useKeycloakUsers('my-ws', 'a'), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('is enabled when search length >= 2', async () => {
    const { result } = renderHook(() => useKeycloakUsers('my-ws', 'al'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })
})
