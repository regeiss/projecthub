import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { BoardFilters } from './BoardFilters'

const issueFormSpy = vi.fn()

vi.mock('@/hooks/useProjects', () => ({
  useProjectMembers: vi.fn(() => ({ data: [] })),
}))

vi.mock('@/hooks/useCycles', () => ({
  useCycles: vi.fn(() => ({ data: [] })),
}))

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: () => <div data-testid="avatar" />,
}))

vi.mock('@/components/ui/Dropdown', () => ({
  Dropdown: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownItem: ({
    children,
    onSelect,
  }: {
    children: ReactNode
    onSelect?: () => void
  }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
}))

vi.mock('@/features/issues/IssueForm', () => ({
  IssueForm: (props: { open: boolean; projectId: string; onClose: () => void }) => {
    issueFormSpy(props)
    return props.open ? <div data-testid="issue-form" /> : null
  },
}))

describe('BoardFilters', () => {
  it('opens the shared issue form from the toolbar create button', () => {
    render(
      <BoardFilters
        projectId="proj-1"
        filters={{}}
        onFiltersChange={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /issue/i }))

    expect(screen.getByTestId('issue-form')).toBeInTheDocument()
    expect(issueFormSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        projectId: 'proj-1',
      }),
    )
  })
})
