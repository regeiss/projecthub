import { createElement, type ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { useWorkload } from './useResources'

let currentWorkspaceId = 'ws-1'

const { getWorkload } = vi.hoisted(() => ({
  getWorkload: vi.fn(async () => [
    {
      memberId: currentWorkspaceId,
      memberName: `Workspace ${currentWorkspaceId}`,
      memberAvatar: null,
      availableDays: 20,
      plannedDays: 5,
      actualDays: 2,
      utilizationPct: 25,
      dailyRateBrl: null,
      plannedCost: null,
      actualCost: null,
    },
  ]),
}))

vi.mock('@/services/resource.service', () => ({
  resourceService: {
    getWorkload,
  },
}))

vi.mock('@/stores/workspaceStore', () => ({
  useWorkspaceStore: (selector: (state: { workspace: { id: string } | null }) => unknown) =>
    selector({ workspace: currentWorkspaceId ? { id: currentWorkspaceId } : null }),
}))

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children)
  }
}

describe('useWorkload', () => {
  it('refetches when the active workspace changes', async () => {
    currentWorkspaceId = 'ws-1'
    getWorkload.mockClear()

    const { result, rerender } = renderHook(() => useWorkload({ period: '2026-06' }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data?.[0]?.memberId).toBe('ws-1')
    })

    currentWorkspaceId = 'ws-2'
    rerender()

    await waitFor(() => {
      expect(result.current.data?.[0]?.memberId).toBe('ws-2')
    })

    expect(getWorkload).toHaveBeenCalledTimes(2)
  })
})
