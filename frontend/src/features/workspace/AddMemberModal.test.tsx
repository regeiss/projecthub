import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddMemberModal } from './AddMemberModal'

const mockMutate = vi.fn()

vi.mock('@/hooks/useWorkspace', () => ({
  useKeycloakUsers: vi.fn(() => ({ data: [], isLoading: false, error: null })),
  useAddWorkspaceMember: vi.fn(() => ({ mutate: mockMutate, isPending: false, error: null })),
}))

import { useKeycloakUsers } from '@/hooks/useWorkspace'

describe('AddMemberModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the modal title when open', () => {
    render(<AddMemberModal open={true} onClose={vi.fn()} workspaceSlug="my-ws" />)
    expect(screen.getByText('Adicionar membro')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<AddMemberModal open={false} onClose={vi.fn()} workspaceSlug="my-ws" />)
    expect(screen.queryByText('Adicionar membro')).not.toBeInTheDocument()
  })

  it('shows empty state when no results', () => {
    render(<AddMemberModal open={true} onClose={vi.fn()} workspaceSlug="my-ws" />)
    // type="search" gives role="searchbox"
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'al' } })
    expect(screen.getByText('Nenhum usuário encontrado')).toBeInTheDocument()
  })

  it('shows users from hook and allows selection', async () => {
    vi.mocked(useKeycloakUsers).mockReturnValue({
      data: [{ sub: 'sub-1', email: 'alice@test.com', name: 'Alice' }],
      isLoading: false,
      error: null,
    } as ReturnType<typeof useKeycloakUsers>)
    render(<AddMemberModal open={true} onClose={vi.fn()} workspaceSlug="my-ws" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Alice'))
    expect(screen.getByRole('button', { name: /adicionar/i })).not.toBeDisabled()
  })

  it('shows a lookup error instead of the empty state when ldap search fails', () => {
    vi.mocked(useKeycloakUsers).mockReturnValue({
      data: [],
      isLoading: false,
      error: {
        response: {
          data: {
            detail: 'keycloak_unavailable',
          },
        },
      },
    } as unknown as ReturnType<typeof useKeycloakUsers>)

    render(<AddMemberModal open={true} onClose={vi.fn()} workspaceSlug="my-ws" />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'al' } })

    expect(screen.getByRole('alert')).toHaveTextContent('Nao foi possivel consultar os usuarios do LDAP.')
    expect(screen.queryByText('Nenhum usuÃ¡rio encontrado')).not.toBeInTheDocument()
  })
})
