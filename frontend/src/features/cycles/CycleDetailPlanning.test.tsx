import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CycleDetail } from './CycleDetail'

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
  useUpdateCycle: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/useIssues', () => ({
  useIssues: () => ({ data: { results: [] } }),
}))

vi.mock('@/hooks/useCyclePlanning', () => ({
  useCyclePlanning: () => ({
    data: {
      id: 'plan-1',
      cycle: 'cycle-1',
      status: 'draft',
      appliedAt: null,
      memberCapacities: [
        {
          id: 'capacity-1',
          member: 'member-1',
          memberName: 'Dev',
          memberAvatar: null,
          defaultDays: '8.00',
          overrideDays: null,
          note: null,
        },
      ],
      allocations: [],
    },
    isLoading: false,
  }),
  useApplySprintPlan: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useCreateSprintPlanAllocation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUpdateSprintPlanAllocation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteSprintPlanAllocation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUpdateSprintPlanMemberCapacities: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('@/hooks/useProjects', () => ({
  useProjectMembers: () => ({
    data: [{ id: 'pm-1', memberId: 'member-1', memberName: 'Dev', memberAvatar: null }],
  }),
}))

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils')
  return {
    ...actual,
    formatDate: (value: string) => value,
  }
})

describe('CycleDetail planning shell', () => {
  it('shows the planning board when the planning tab is selected', async () => {
    render(<CycleDetail />)

    await userEvent.click(screen.getByRole('button', { name: 'Planejamento' }))

    expect(screen.getByRole('heading', { name: 'Planejamento da sprint' })).toBeInTheDocument()
    expect(screen.getByText('Capacidade')).toBeInTheDocument()
  })
})
