import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { RequestAccessPage } from './RequestAccessPage'

// ── Mock hooks ────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useAccessRequest', () => ({
  useMyAccessRequest: vi.fn(() => ({ data: undefined, isLoading: true })),
  useSubmitAccessRequest: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    list: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn((selector: (s: { user: { name: string; email: string } | null }) => unknown) =>
    selector({ user: { name: 'Test User', email: 'test@example.com' } }),
  ),
}))

vi.mock('@/stores/workspaceStore', () => ({
  useWorkspaceStore: vi.fn((selector: (s: { setWorkspace: () => void }) => unknown) =>
    selector({ setWorkspace: vi.fn() }),
  ),
}))

// Import after mocks
import { useMyAccessRequest } from '@/hooks/useAccessRequest'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function renderPage(locationState?: object) {
  const qc = makeQueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter
        initialEntries={[{ pathname: '/request-access', state: locationState ?? null }]}
      >
        <RequestAccessPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RequestAccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: not loading, no existing request (404 scenario)
    vi.mocked(useMyAccessRequest).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useMyAccessRequest>)
  })

  it('renders form when no prior request (404)', async () => {
    renderPage()

    // The secretaria input is labelled via htmlFor="req-secretaria"
    await waitFor(() => {
      expect(screen.getByLabelText(/secretaria/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /solicitar acesso/i })).toBeInTheDocument()
  })

  it('shows pending state when request is pending', async () => {
    vi.mocked(useMyAccessRequest).mockReturnValue({
      data: {
        id: 'req-1',
        status: 'pending',
        workspaceName: 'TI',
        denialReason: null,
        requestedAt: '2026-06-01T10:00:00Z',
        resolvedAt: null,
      },
      isLoading: false,
    } as ReturnType<typeof useMyAccessRequest>)

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    expect(screen.getByText('Aguardando aprovação')).toBeInTheDocument()
  })

  it('shows denial banner when request was denied', async () => {
    vi.mocked(useMyAccessRequest).mockReturnValue({
      data: {
        id: 'req-2',
        status: 'denied',
        workspaceName: 'TI',
        denialReason: 'Sem vagas no momento.',
        requestedAt: '2026-06-01T10:00:00Z',
        resolvedAt: '2026-06-02T08:00:00Z',
      },
      isLoading: false,
    } as ReturnType<typeof useMyAccessRequest>)

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    expect(screen.getByRole('alert')).toHaveTextContent(/sem vagas no momento/i)
  })

  it('submit button is disabled when required fields are empty', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /solicitar acesso/i })).toBeInTheDocument()
    })

    // Both workspaceName and secretaria start empty → button must be disabled
    expect(screen.getByRole('button', { name: /solicitar acesso/i })).toBeDisabled()
  })
})
