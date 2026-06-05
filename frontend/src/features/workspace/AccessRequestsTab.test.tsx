import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AccessRequestsTab } from './AccessRequestsTab'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/stores/workspaceStore', () => ({
  useWorkspaceStore: vi.fn(() => ({
    workspace: { id: 'ws-1', slug: 'my-workspace', name: 'My Workspace' },
  })),
}))

vi.mock('@/hooks/useAccessRequest', () => ({
  useWorkspaceAccessRequests: vi.fn(() => ({
    data: { results: [], count: 0 },
    isLoading: false,
  })),
  useResolveAccessRequest: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    list: vi.fn().mockResolvedValue([]),
  },
}))

// Import after mocks
import { useWorkspaceAccessRequests, useResolveAccessRequest } from '@/hooks/useAccessRequest'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function renderTab() {
  const qc = makeQueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AccessRequestsTab />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const baseRequest = {
  id: 'req-1',
  status: 'pending' as const,
  workspaceName: 'TI',
  denialReason: null,
  requestedAt: '2026-06-01T10:00:00Z',
  resolvedAt: null,
  keycloakSub: 'kc-sub-1',
  email: 'joao@example.com',
  name: 'João Silva',
  workspace: 'ws-1',
  secretaria: 'Secretaria de TI',
  reason: 'Preciso acessar o sistema.',
  resolvedBy: null,
  previousDenialCount: 0,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AccessRequestsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: empty list
    vi.mocked(useWorkspaceAccessRequests).mockReturnValue({
      data: { results: [], count: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useWorkspaceAccessRequests>)
  })

  it('shows empty state when no pending requests', () => {
    renderTab()
    expect(screen.getByText(/nenhuma solicitação pendente/i)).toBeInTheDocument()
  })

  it('renders request list with requester info', () => {
    vi.mocked(useWorkspaceAccessRequests).mockReturnValue({
      data: { results: [baseRequest], count: 1 },
      isLoading: false,
    } as unknown as ReturnType<typeof useWorkspaceAccessRequests>)

    renderTab()

    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('joao@example.com')).toBeInTheDocument()
  })

  it('deny button requires non-empty reason before confirm is enabled', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    vi.mocked(useResolveAccessRequest).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useResolveAccessRequest>)

    vi.mocked(useWorkspaceAccessRequests).mockReturnValue({
      data: { results: [baseRequest], count: 1 },
      isLoading: false,
    } as unknown as ReturnType<typeof useWorkspaceAccessRequests>)

    renderTab()

    const denyBtn = screen.getByRole('button', { name: /negar solicitação de joão silva/i })
    await user.click(denyBtn)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirmar negação para joão silva/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /confirmar negação para joão silva/i })).toBeDisabled()

    const textarea = screen.getByPlaceholderText(/explique o motivo/i)
    await user.type(textarea, 'Sem vagas disponíveis.')

    expect(screen.getByRole('button', { name: /confirmar negação para joão silva/i })).not.toBeDisabled()

    await user.click(screen.getByRole('button', { name: /confirmar negação para joão silva/i }))

    expect(mutate).toHaveBeenCalledWith({
      requestId: 'req-1',
      payload: { action: 'deny', denialReason: 'Sem vagas disponíveis.' },
    })
  })
})
