import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { OnboardingPage } from './OnboardingPage'

const createRequest = vi.fn()

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn((selector: (state: { user: { name: string; email: string } | null }) => unknown) =>
    selector({ user: { name: 'Roberto Geiss', email: 'roberto@example.com' } })),
}))

vi.mock('@/hooks/useAccessRequest', () => ({
  useMyAccessRequests: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useCreateAccessRequest: vi.fn(() => ({
    mutate: createRequest,
    isPending: false,
  })),
}))

import { useCreateAccessRequest, useMyAccessRequests } from '@/hooks/useAccessRequest'

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useMyAccessRequests).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useMyAccessRequests>)
    vi.mocked(useCreateAccessRequest).mockReturnValue({
      mutate: createRequest,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateAccessRequest>)
  })

  it('shows access request flow instead of workspace wizard', () => {
    renderPage()

    expect(screen.getByText(/solicitar acesso/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /você ainda não tem um workspace liberado/i })).toBeInTheDocument()
    expect(screen.queryByText(/passo 1 \/ 3/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /crie seu workspace/i })).not.toBeInTheDocument()
  })

  it('shows pending state when there is already an open access request', () => {
    vi.mocked(useMyAccessRequests).mockReturnValue({
      data: [
        {
          id: 'req-1',
          status: 'pending',
          workspaceName: 'Secretaria de TI',
          denialReason: null,
          requestedAt: '2026-06-11T10:00:00Z',
          resolvedAt: null,
          keycloakSub: 'kc-1',
          email: 'roberto@example.com',
          name: 'Roberto Geiss',
          workspace: 'ws-1',
          secretaria: 'CTIBD',
          reason: 'Preciso acompanhar projetos da secretaria.',
          resolvedBy: null,
          previousDenialCount: 0,
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useMyAccessRequests>)

    renderPage()

    expect(screen.getByText(/solicitação enviada/i)).toBeInTheDocument()
    expect(screen.getByText(/secretaria de ti/i)).toBeInTheDocument()
  })

  it('submits a new access request', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/secretaria/i), 'CTIBD')
    await user.type(screen.getByLabelText(/workspace desejado/i), 'Secretaria de TI')
    await user.type(screen.getByLabelText(/motivo do acesso/i), 'Preciso acompanhar projetos.')
    await user.click(screen.getByRole('button', { name: /enviar solicitação/i }))

    expect(createRequest).toHaveBeenCalledWith(
      {
        secretaria: 'CTIBD',
        workspaceName: 'Secretaria de TI',
        reason: 'Preciso acompanhar projetos.',
      },
      expect.any(Object),
    )
  })
})
