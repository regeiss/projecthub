import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CyclePlanningBoard } from './CyclePlanningBoard'

function buildPlanData() {
  return {
    id: 'plan-1',
    cycle: 'cycle-1',
    status: 'draft' as const,
    appliedAt: null,
    memberCapacities: [
      {
        id: 'cap-1',
        member: 'member-1',
        memberName: 'Ana',
        memberAvatar: null,
        defaultDays: '10.0',
        overrideDays: null,
        note: null,
      },
    ],
    allocations: [
      {
        id: 'alloc-1',
        issue: 'issue-1',
        issueTitle: 'Login',
        issueSequenceId: 12,
        plannedMember: 'member-1',
        plannedDays: '12.0',
        plannedStoryPoints: 13,
        rank: 0,
        note: null,
      },
    ],
  }
}

let planData = buildPlanData()
let planningQueryState: { data: ReturnType<typeof buildPlanData> | undefined; isLoading: boolean; isError?: boolean } =
  {
    data: planData,
    isLoading: false,
    isError: false,
  }

vi.mock('@/hooks/useCyclePlanning', () => ({
  useCyclePlanning: () => ({
    ...planningQueryState,
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
    data: [{ id: 'pm-1', memberId: 'member-1', memberName: 'Ana', memberAvatar: null }],
  }),
}))

vi.mock('@/hooks/useIssues', () => ({
  useIssues: () => ({
    data: {
      results: [
        {
          id: 'issue-2',
          sequenceId: 14,
          title: 'Backlog item',
          estimateDays: 5,
          estimatePoints: 8,
        },
      ],
    },
  }),
}))

describe('CyclePlanningBoard', () => {
  it('shows overloaded member totals', () => {
    planData = buildPlanData()
    planningQueryState = { data: planData, isLoading: false, isError: false }

    render(
      <CyclePlanningBoard
        projectId="project-1"
        cycleId="cycle-1"
        cycle={{ id: 'cycle-1', name: 'Sprint 1', startDate: '2026-04-01', endDate: '2026-04-14' }}
      />,
    )

    expect(screen.getByText('13')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aplicar plano' })).toBeInTheDocument()
  })

  it('renders unassigned planned work in its own lane instead of mixing it into backlog', () => {
    planData = buildPlanData()
    planningQueryState = { data: planData, isLoading: false, isError: false }
    planData.allocations = [
      ...planData.allocations,
      {
        id: 'alloc-2',
        issue: 'issue-3',
        issueTitle: 'Planned without owner',
        issueSequenceId: 15,
        plannedMember: null,
        plannedDays: '3.0',
        plannedStoryPoints: 5,
        rank: 0,
        note: null,
      },
    ]

    render(
      <CyclePlanningBoard
        projectId="project-1"
        cycleId="cycle-1"
        cycle={{ id: 'cycle-1', name: 'Sprint 1', startDate: '2026-04-01', endDate: '2026-04-14' }}
      />,
    )

    expect(screen.getByRole('region', { name: 'Nao atribuidas' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Backlog' })).toHaveTextContent('Backlog item')
    expect(screen.getByRole('region', { name: 'Backlog' })).not.toHaveTextContent('Planned without owner')
    expect(screen.getByRole('region', { name: 'Nao atribuidas' })).toHaveTextContent(
      'Planned without owner',
    )
  })

  it('shows an error message when loading the sprint plan fails', () => {
    planningQueryState = { data: undefined, isLoading: false, isError: true }

    render(
      <CyclePlanningBoard
        projectId="project-1"
        cycleId="cycle-1"
        cycle={{ id: 'cycle-1', name: 'Sprint 1', startDate: '2026-04-01', endDate: '2026-04-14' }}
      />,
    )

    expect(screen.getByText('Nao foi possivel carregar o planejamento da sprint.')).toBeInTheDocument()
  })
})
