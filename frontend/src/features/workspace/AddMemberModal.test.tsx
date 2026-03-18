import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddMemberModal } from './AddMemberModal'

const mockMutate = vi.fn()

vi.mock('@/hooks/useWorkspace', () => ({
  useKeycloakUsers: vi.fn(() => ({ data: [], isLoading: false })),
  useAddWorkspaceMember: vi.fn(() => ({ mutate: mockMutate, isPending: false, error: null })),
}))

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}))

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ open, children, title }: { open: boolean; children: React.ReactNode; title: string }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  ModalFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'al' } })
    expect(screen.getByText('Nenhum usuário encontrado')).toBeInTheDocument()
  })

  it('shows users from hook and allows selection', async () => {
    vi.mocked(useKeycloakUsers).mockReturnValue({
      data: [{ sub: 'sub-1', email: 'alice@test.com', name: 'Alice' }],
      isLoading: false,
    } as ReturnType<typeof useKeycloakUsers>)
    render(<AddMemberModal open={true} onClose={vi.fn()} workspaceSlug="my-ws" />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'al' } })
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('listitem'))
    expect(screen.getByRole('button', { name: /adicionar/i })).not.toBeDisabled()
  })
})
