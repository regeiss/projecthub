import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SubtaskList } from './SubtaskList'

const mockMutate = vi.fn()

vi.mock('@/hooks/useIssues', () => ({
  useSubtasks: vi.fn(),
  useCreateSubtask: vi.fn(() => ({ mutate: mockMutate, isPending: false })),
}))

vi.mock('./IssueForm', () => ({
  IssueForm: ({
    projectId,
    parentIssueId,
    typeOverride,
    open,
    onClose,
  }: {
    projectId: string
    parentIssueId: string
    typeOverride: string
    open: boolean
    onClose: () => void
  }) =>
    open ? (
      <div
        data-testid="issue-form"
        data-project-id={projectId}
        data-parent-issue-id={parentIssueId}
        data-type-override={typeOverride}
      >
        <button onClick={onClose}>Fechar</button>
      </div>
    ) : null,
}))

import { useSubtasks } from '@/hooks/useIssues'

const renderComponent = (props = { projectId: 'proj-1', issueId: 'issue-1' }) =>
  render(
    <MemoryRouter>
      <SubtaskList {...props} />
    </MemoryRouter>,
  )

describe('SubtaskList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state when isLoading is true', () => {
    vi.mocked(useSubtasks).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useSubtasks>)

    renderComponent()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('renders error message when query errors', () => {
    vi.mocked(useSubtasks).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useSubtasks>)

    renderComponent()
    expect(screen.getByText('Não foi possível carregar subtarefas.')).toBeInTheDocument()
  })

  it('renders empty state when subtasks list is empty', () => {
    vi.mocked(useSubtasks).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSubtasks>)

    renderComponent()
    expect(screen.getByText('Sem subtarefas.')).toBeInTheDocument()
    expect(screen.getByText('Subtarefas (0)')).toBeInTheDocument()
  })

  it('renders subtask rows when data is populated', () => {
    vi.mocked(useSubtasks).mockReturnValue({
      data: [
        {
          id: 'sub-1',
          sequenceId: 42,
          title: 'Fix the bug',
          stateColor: '#22c55e',
          stateCategory: 'started',
          priority: 'high',
          projectId: 'proj-1',
          description: null,
          stateId: 'state-1',
          type: 'subtask',
          assigneeId: null,
          assignee: null,
          reporterId: 'member-1',
          parentId: 'issue-1',
          epicId: null,
          estimatePoints: null,
          size: null,
          estimateDays: null,
          cycleId: null,
          cycleName: null,
          startDate: null,
          dueDate: null,
          completedAt: null,
          sortOrder: 1,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
          cpmSlack: null,
          isCritical: false,
          milestoneId: null,
          milestoneName: null,
          subtaskCount: 0,
          completedSubtaskCount: 0,
        },
      ],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSubtasks>)

    renderComponent()
    expect(screen.getByText('Subtarefas (1)')).toBeInTheDocument()
    expect(screen.getByText('#42 Fix the bug')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByLabelText('Subtarefa #42: Fix the bug')).toBeInTheDocument()
    expect(screen.getByLabelText('Estado: started')).toBeInTheDocument()
  })

  it('opens IssueForm with correct props when "+ Adicionar" is clicked', () => {
    vi.mocked(useSubtasks).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSubtasks>)

    renderComponent({ projectId: 'proj-1', issueId: 'issue-1' })

    expect(screen.queryByTestId('issue-form')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar subtarefa' }))

    const form = screen.getByTestId('issue-form')
    expect(form).toBeInTheDocument()
    expect(form).toHaveAttribute('data-project-id', 'proj-1')
    expect(form).toHaveAttribute('data-parent-issue-id', 'issue-1')
    expect(form).toHaveAttribute('data-type-override', 'subtask')
  })
})
