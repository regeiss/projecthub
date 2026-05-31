import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ButtonHTMLAttributes, ComponentProps, ReactNode, ChangeEvent } from 'react'
import { IssueForm } from './IssueForm'

const mockLabelHook = vi.fn()
const createMutate = vi.fn()
const updateMutate = vi.fn()
const createSubtaskMutate = vi.fn()

vi.mock('@/hooks/useProjects', () => ({
  useProjectStates: vi.fn(() => ({
    data: [
      { id: 'state-1', name: 'Backlog', category: 'backlog', color: '#94a3b8' },
    ],
  })),
  useProjectLabels: () => mockLabelHook(),
  useProjectMembers: vi.fn(() => ({ data: [] })),
}))

vi.mock('@/hooks/useIssues', () => ({
  useCreateIssue: vi.fn(() => ({ mutate: createMutate, isPending: false })),
  useUpdateIssue: vi.fn(() => ({ mutate: updateMutate, isPending: false })),
  useCreateSubtask: vi.fn(() => ({ mutate: createSubtaskMutate, isPending: false })),
  useEpics: vi.fn(() => ({ data: [] })),
}))

vi.mock('@/hooks/useCycles', () => ({
  useCycles: vi.fn(() => ({ data: [] })),
}))

vi.mock('@/hooks/useMilestones', () => ({
  useMilestones: vi.fn(() => ({ data: [] })),
}))

vi.mock('@/services/cycle.service', () => ({
  cycleService: {
    removeIssue: vi.fn(),
    addIssue: vi.fn(),
  },
}))

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({
    open,
    children,
  }: {
    open: boolean
    children: ReactNode
  }) => (open ? <div>{children}</div> : null),
  ModalFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/Input', () => ({
  Input: ({
    label,
    value,
    onChange,
    type = 'text',
  }: {
    label: string
    value: string
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void
    type?: string
  }) => (
    <label>
      <span>{label}</span>
      <input aria-label={label} type={type} value={value} onChange={onChange} />
    </label>
  ),
}))

vi.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/editor/MiniEditor', () => ({
  MiniEditor: () => <div data-testid="mini-editor" />,
}))

vi.mock('@/features/epics/EpicColorPicker', () => ({
  EpicColorPicker: () => <div data-testid="epic-color-picker" />,
}))

function renderForm(props: Partial<ComponentProps<typeof IssueForm>> = {}) {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <IssueForm
        projectId="proj-1"
        open
        onClose={() => {}}
        {...props}
      />
    </QueryClientProvider>,
  )
}

describe('IssueForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the labels section visible while labels are loading', () => {
    mockLabelHook.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    })

    renderForm()

    expect(screen.getByText('Etiquetas')).toBeInTheDocument()
    expect(screen.getByText(/Carregando etiquetas/i)).toBeInTheDocument()
  })

  it('renders label chips when project labels are available', () => {
    mockLabelHook.mockReturnValue({
      data: [
        { id: 'l1', name: 'bug', color: '#ef4444' },
        { id: 'l2', name: 'funcionalidade', color: '#3b82f6' },
      ],
      isLoading: false,
      isError: false,
    })

    renderForm()

    expect(screen.getByRole('button', { name: 'bug' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'funcionalidade' })).toBeInTheDocument()
  })

  it('shows a labels error message instead of hiding the section', () => {
    mockLabelHook.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
    })

    renderForm()

    expect(screen.getByText('Etiquetas')).toBeInTheDocument()
    expect(screen.getByText(/carregar as etiquetas/i)).toBeInTheDocument()
  })

  it('allows setting start and due dates when creating an issue', () => {
    mockLabelHook.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    })

    renderForm()

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Nova issue com data' },
    })
    fireEvent.change(screen.getByLabelText('Data de início'), {
      target: { value: '2026-04-30' },
    })
    fireEvent.change(screen.getByLabelText('Data de entrega'), {
      target: { value: '2026-05-05' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }))

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj-1',
        data: expect.objectContaining({
          title: 'Nova issue com data',
          startDate: '2026-04-30',
          dueDate: '2026-05-05',
        }),
      }),
      expect.any(Object),
    )
  })

  it('prefills the start and due dates when editing an issue', () => {
    mockLabelHook.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    })

    renderForm({
      issue: {
        id: 'issue-1',
        sequenceId: 1,
        projectId: 'proj-1',
        title: 'Issue existente',
        description: null,
        stateId: 'state-1',
        priority: 'none',
        type: 'task',
        assigneeId: null,
        assignee: null,
        reporterId: 'member-1',
        parentId: null,
        epicId: null,
        estimatePoints: null,
        size: null,
        estimateDays: null,
        cycleId: null,
        cycleName: null,
        startDate: '2026-05-02',
        dueDate: '2026-05-09',
        completedAt: null,
        sortOrder: 0,
        labels: [],
        createdAt: '2026-04-30T00:00:00Z',
        updatedAt: '2026-04-30T00:00:00Z',
        cpmSlack: null,
        isCritical: false,
        milestoneId: null,
        milestoneName: null,
        projectName: 'Projeto',
        subtaskCount: 0,
        completedSubtaskCount: 0,
        color: null,
        childCount: 0,
        completedCount: 0,
        epic: null,
      },
    })

    expect(screen.getByLabelText('Data de início')).toHaveValue('2026-05-02')
    expect(screen.getByLabelText('Data de entrega')).toHaveValue('2026-05-09')
  })
})
