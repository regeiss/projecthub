import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApplySprintPlanModal } from './ApplySprintPlanModal'

describe('ApplySprintPlanModal', () => {
  it('shows the apply summary and confirms the mutation', async () => {
    const onConfirm = vi.fn()
    render(
      <ApplySprintPlanModal
        open
        onClose={vi.fn()}
        onConfirm={onConfirm}
        summary={{
          issuesAddedToCycle: 2,
          assigneeChanges: 3,
          estimateDayChanges: 1,
          estimatePointChanges: 2,
        }}
      />,
    )

    expect(screen.getByText('2 issues serao adicionadas ao ciclo')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar plano' }))
    expect(onConfirm).toHaveBeenCalled()
  })
})
