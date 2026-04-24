import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectReportsPage } from './ProjectReportsPage'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ projectId: 'project-1' }),
  }
})

vi.mock('@/hooks/useCycles', () => ({
  useCycles: () => ({ data: [], isLoading: false }),
}))

vi.mock('@/hooks/useIssues', () => ({
  useIssues: () => ({ data: { results: [] }, isLoading: false }),
}))

vi.mock('@/lib/utils', () => ({
  formatDate: (value: string) => value,
}))

describe('ProjectReportsPage', () => {
  it('renders inside a centered page container with outer spacing', () => {
    const { container } = render(<ProjectReportsPage />)

    expect(screen.getByRole('heading', { name: 'Burndown e Velocity' })).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('mx-auto', 'max-w-6xl', 'space-y-6', 'p-6')
  })
})
