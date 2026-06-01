import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectWizard } from './ProjectWizard'

const mockNavigate = vi.fn()
const mockCreate = { mutate: vi.fn(), isPending: false }
const mockUpdate = { mutate: vi.fn(), isPending: false }
const mockAddMember = { mutateAsync: vi.fn().mockResolvedValue(undefined) }
const mockCreateState = { mutateAsync: vi.fn().mockResolvedValue(undefined) }
const mockUpdateState = { mutateAsync: vi.fn().mockResolvedValue(undefined) }
const mockDeleteState = { mutateAsync: vi.fn().mockResolvedValue(undefined) }

const mockProject = {
  id: 'proj-1',
  workspaceId: 'ws-1',
  name: 'Test Project',
  identifier: 'TEST',
  description: null,
  icon: null,
  color: '#6366f1',
  status: 'active' as const,
  isPrivate: false,
  start_date: null,
  target_date: null,
  createdById: 'member-1',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

const mockStates = [
  { id: 'state-1', projectId: 'proj-1', name: 'Backlog', color: '#6B7280', category: 'backlog' as const, sequence: 0, isDefault: false },
  { id: 'state-2', projectId: 'proj-1', name: 'A fazer', color: '#3B82F6', category: 'unstarted' as const, sequence: 1, isDefault: true },
  { id: 'state-3', projectId: 'proj-1', name: 'Em andamento', color: '#F59E0B', category: 'started' as const, sequence: 2, isDefault: false },
]

const mockWsMembers = [
  { id: 'member-2', name: 'Alice Santos', email: 'alice@example.com', avatarUrl: null, role: 'member' as const, isActive: true, lastLoginAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'member-3', name: 'Bob Lima', email: 'bob@example.com', avatarUrl: null, role: 'member' as const, isActive: true, lastLoginAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
]

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/stores/workspaceStore', () => ({
  useWorkspaceStore: () => ({ workspace: { id: 'ws-1', slug: 'my-workspace' } }),
}))

vi.mock('@/hooks/useProjects', () => ({
  useCreateProject: () => mockCreate,
  useUpdateProject: () => mockUpdate,
  useAddProjectMember: () => mockAddMember,
  useProjectStates: () => ({ data: mockStates, isLoading: false }),
  useCreateProjectState: () => mockCreateState,
  useUpdateProjectState: () => mockUpdateState,
  useDeleteProjectState: () => mockDeleteState,
}))

vi.mock('@/hooks/useWorkspace', () => ({
  useWorkspaceMembers: () => ({ data: mockWsMembers }),
  useMe: () => ({ data: { id: 'member-1' } }),
}))

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <span data-testid="avatar">{name}</span>,
}))

// Helper: submit a form by pressing Enter or finding its submit button
async function submitFormByButton(label: RegExp) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: label }))
}

// Helper: advance to step 2 by creating a project
async function advanceToStep2() {
  const user = userEvent.setup()
  mockCreate.mutate.mockImplementation((_args: unknown, cbs: { onSuccess: (p: typeof mockProject) => void }) => {
    cbs.onSuccess(mockProject)
  })
  await user.type(screen.getByLabelText(/nome do projeto/i), 'Test')
  await user.click(screen.getByRole('button', { name: /próximo/i }))
  await waitFor(() => screen.getByRole('heading', { name: 'Convide o time' }))
}

// Helper: advance to step 3 by skipping step 2
async function advanceToStep3() {
  await advanceToStep2()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /pular/i }))
  await waitFor(() => screen.getByRole('heading', { name: 'Estados do fluxo' }))
}

// Helper: advance to step 4 by skipping steps 2 and 3
async function advanceToStep4() {
  await advanceToStep3()
  const user = userEvent.setup()
  const pulars = screen.getAllByRole('button', { name: /pular/i })
  await user.click(pulars[0])
  await waitFor(() => screen.getByRole('heading', { name: 'Datas do projeto' }))
}

describe('ProjectWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Step 1 ──────────────────────────────────────────────────────────────────

  describe('Step 1: Detalhes', () => {
    it('renders step 1 fields and progress indicator', () => {
      render(<ProjectWizard />)
      expect(screen.getByRole('heading', { name: 'Detalhes do projeto' })).toBeInTheDocument()
      expect(screen.getByLabelText(/nome do projeto/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/identificador/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('shows validation error when name is empty', () => {
      render(<ProjectWizard />)
      fireEvent.submit(screen.getByRole('form', { name: /detalhes do projeto/i }))
      expect(screen.getByText(/informe o nome do projeto/i)).toBeInTheDocument()
      expect(mockCreate.mutate).not.toHaveBeenCalled()
    })

    it('auto-derives identifier from name', async () => {
      const user = userEvent.setup()
      render(<ProjectWizard />)
      await user.type(screen.getByLabelText(/nome do projeto/i), 'Sistema de Contratos')
      const identifierInput = screen.getByLabelText(/identificador/i) as HTMLInputElement
      expect(identifierInput.value).toBe('SDC')
    })

    it('calls useCreateProject on valid submit', async () => {
      const user = userEvent.setup()
      render(<ProjectWizard />)
      await user.type(screen.getByLabelText(/nome do projeto/i), 'Meu Projeto')
      await user.click(screen.getByRole('button', { name: /próximo/i }))
      expect(mockCreate.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Meu Projeto' }) }),
        expect.any(Object),
      )
    })

    it('toggles private switch', async () => {
      const user = userEvent.setup()
      render(<ProjectWizard />)
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-checked', 'false')
      await user.click(toggle)
      expect(toggle).toHaveAttribute('aria-checked', 'true')
    })

    it('shows color palette with 10 options', () => {
      render(<ProjectWizard />)
      const colorButtons = screen.getAllByRole('button', { name: /^Cor #/i })
      expect(colorButtons).toHaveLength(10)
    })
  })

  // ── Step 2 ──────────────────────────────────────────────────────────────────

  describe('Step 2: Time', () => {
    it('renders member search on step 2', async () => {
      render(<ProjectWizard />)
      await advanceToStep2()
      expect(screen.getByLabelText(/buscar membros/i)).toBeInTheDocument()
    })

    it('shows workspace members in dropdown when typing', async () => {
      const user = userEvent.setup()
      render(<ProjectWizard />)
      await advanceToStep2()
      const searchInput = screen.getByLabelText(/buscar membros/i)
      await user.type(searchInput, 'Alice')
      // focus stays on input after type — check via unique email text in dropdown
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    })

    it('"Pular" advances to step 3 without adding members', async () => {
      render(<ProjectWizard />)
      await advanceToStep3()
      expect(screen.getByRole('heading', { name: 'Estados do fluxo' })).toBeInTheDocument()
      expect(mockAddMember.mutateAsync).not.toHaveBeenCalled()
    })

    it('"Voltar" from step 2 returns to step 1', async () => {
      const user = userEvent.setup()
      render(<ProjectWizard />)
      await advanceToStep2()
      await user.click(screen.getByRole('button', { name: /voltar/i }))
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Detalhes do projeto' })).toBeInTheDocument(),
      )
    })
  })

  // ── Step 3 ──────────────────────────────────────────────────────────────────

  describe('Step 3: Estados', () => {
    it('shows auto-seeded states', async () => {
      render(<ProjectWizard />)
      await advanceToStep3()
      expect(screen.getByDisplayValue('Backlog')).toBeInTheDocument()
      expect(screen.getByDisplayValue('A fazer')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Em andamento')).toBeInTheDocument()
    })

    it('can add a new state row', async () => {
      const user = userEvent.setup()
      render(<ProjectWizard />)
      await advanceToStep3()
      const addBtn = screen.getByRole('button', { name: /adicionar estado/i })
      await user.click(addBtn)
      const inputs = screen.getAllByPlaceholderText(/nome do estado/i)
      expect(inputs.length).toBeGreaterThan(mockStates.length)
    })

    it('can edit an existing state name', async () => {
      const user = userEvent.setup()
      render(<ProjectWizard />)
      await advanceToStep3()
      const backlogInput = screen.getByDisplayValue('Backlog')
      await user.clear(backlogInput)
      await user.type(backlogInput, 'Pendente')
      expect((backlogInput as HTMLInputElement).value).toBe('Pendente')
    })

    it('"Pular" advances to step 4 without saving', async () => {
      render(<ProjectWizard />)
      await advanceToStep4()
      expect(screen.getByRole('heading', { name: 'Datas do projeto' })).toBeInTheDocument()
    })
  })

  // ── Step 4 ──────────────────────────────────────────────────────────────────

  describe('Step 4: Datas', () => {
    it('renders start and target date inputs', async () => {
      render(<ProjectWizard />)
      await advanceToStep4()
      expect(screen.getByLabelText(/data de início/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/data alvo/i)).toBeInTheDocument()
    })

    it('"Pular" navigates to project board', async () => {
      const user = userEvent.setup()
      render(<ProjectWizard />)
      await advanceToStep4()
      await user.click(screen.getByRole('button', { name: /pular/i }))
      expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-1/board')
    })

    it('"Concluído" with no dates navigates to board without patching', async () => {
      const user = userEvent.setup()
      render(<ProjectWizard />)
      await advanceToStep4()
      await user.click(screen.getByRole('button', { name: /concluído/i }))
      expect(mockUpdate.mutate).not.toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-1/board')
    })

    it('"Concluído" with dates patches project', async () => {
      const user = userEvent.setup()
      render(<ProjectWizard />)
      await advanceToStep4()
      fireEvent.change(screen.getByLabelText(/data de início/i), { target: { value: '2026-06-01' } })
      fireEvent.change(screen.getByLabelText(/data alvo/i), { target: { value: '2026-12-31' } })
      await user.click(screen.getByRole('button', { name: /concluído/i }))
      expect(mockUpdate.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'proj-1',
          data: { start_date: '2026-06-01', target_date: '2026-12-31' },
        }),
        expect.any(Object),
      )
    })
  })
})
