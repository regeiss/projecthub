import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CycleDetail } from './CycleDetail'

const mockUpdateMutate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ projectId: 'project-1', cycleId: 'cycle-1' }),
  }
})

vi.mock('@/hooks/useCycles', () => ({
  useCycle: () => ({
    data: {
      id: 'cycle-1',
      projectId: 'project-1',
      name: 'Sprint 1',
      description: null,
      startDate: '2026-04-01',
      endDate: '2026-04-14',
      status: 'draft',
      issueCount: 0,
      completedCount: 0,
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-01T00:00:00Z',
    },
    isLoading: false,
  }),
  useCycleProgress: () => ({ data: undefined }),
  useUpdateCycle: () => ({ mutate: mockUpdateMutate, isPending: false }),
}))

vi.mock('@/hooks/useIssues', () => ({
  useIssues: () => ({ data: { results: [] } }),
}))

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils')
  return {
    ...actual,
    formatDate: (value: string) => value,
  }
})

describe('CycleDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates the cycle status to active from the detail page', async () => {
    render(<CycleDetail />)

    await userEvent.click(screen.getByRole('button', { name: 'Ativo' }))

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      projectId: 'project-1',
      cycleId: 'cycle-1',
      data: { status: 'active' },
    })
  })
})
