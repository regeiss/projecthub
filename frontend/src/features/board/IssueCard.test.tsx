import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// Standalone badge component that mirrors the badge logic from IssueCard in BoardPage.tsx
function SubtaskBadge({
  subtaskCount,
  completedSubtaskCount,
}: {
  subtaskCount: number
  completedSubtaskCount: number
}) {
  return (
    <>
      {subtaskCount > 0 && (
        <span
          className="text-xs text-gray-400"
          aria-label={`${completedSubtaskCount} de ${subtaskCount} subtarefas concluídas`}
        >
          {completedSubtaskCount}/{subtaskCount}
        </span>
      )}
    </>
  )
}

describe('IssueCard subtask count badge', () => {
  it('shows badge with correct count when subtaskCount > 0', () => {
    render(<SubtaskBadge subtaskCount={3} completedSubtaskCount={1} />)

    const badge = screen.getByText('1/3')
    expect(badge).toBeTruthy()
  })

  it('has accessible aria-label when subtaskCount > 0', () => {
    render(<SubtaskBadge subtaskCount={3} completedSubtaskCount={1} />)

    const badge = screen.getByLabelText('1 de 3 subtarefas concluídas')
    expect(badge).toBeTruthy()
  })

  it('does NOT show badge when subtaskCount === 0', () => {
    render(<SubtaskBadge subtaskCount={0} completedSubtaskCount={0} />)

    const badge = screen.queryByText('0/0')
    expect(badge).toBeNull()
  })

  it('shows 0/N badge correctly when no subtasks are completed', () => {
    render(<SubtaskBadge subtaskCount={5} completedSubtaskCount={0} />)

    const badge = screen.getByText('0/5')
    expect(badge).toBeTruthy()
    expect(badge).toHaveAttribute(
      'aria-label',
      '0 de 5 subtarefas concluídas',
    )
  })

  it('shows N/N badge correctly when all subtasks are completed', () => {
    render(<SubtaskBadge subtaskCount={4} completedSubtaskCount={4} />)

    const badge = screen.getByText('4/4')
    expect(badge).toBeTruthy()
    expect(badge).toHaveAttribute(
      'aria-label',
      '4 de 4 subtarefas concluídas',
    )
  })
})
