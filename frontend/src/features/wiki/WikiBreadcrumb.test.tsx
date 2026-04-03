import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WikiBreadcrumb } from './WikiBreadcrumb'

function renderBreadcrumb(props: Parameters<typeof WikiBreadcrumb>[0]) {
  return render(
    <MemoryRouter>
      <WikiBreadcrumb {...props} />
    </MemoryRouter>
  )
}

describe('WikiBreadcrumb', () => {
  it('renders space name and current page title', () => {
    renderBreadcrumb({
      spaceName: 'Engineering',
      ancestors: [],
      currentTitle: 'Auth Flow',
    })
    expect(screen.getByText('Engineering')).toBeDefined()
    expect(screen.getByText('Auth Flow')).toBeDefined()
  })

  it('renders ancestors in order between space and current page', () => {
    renderBreadcrumb({
      spaceName: 'Engineering',
      ancestors: [
        { id: 'a1', title: 'Backend' },
        { id: 'a2', title: 'Auth' },
      ],
      currentTitle: 'JWT Setup',
    })
    expect(screen.getByText('Backend')).toBeDefined()
    expect(screen.getByText('Auth')).toBeDefined()
    expect(screen.getByText('JWT Setup')).toBeDefined()
  })

  it('current page title has aria-current="page"', () => {
    renderBreadcrumb({
      spaceName: 'Docs',
      ancestors: [],
      currentTitle: 'Setup',
    })
    const current = screen.getByText('Setup')
    expect(current.getAttribute('aria-current')).toBe('page')
  })

  it('renders without ancestors (root page)', () => {
    renderBreadcrumb({
      spaceName: 'Wiki',
      ancestors: [],
      currentTitle: 'Home',
    })
    expect(screen.getByText('Wiki')).toBeDefined()
    expect(screen.getByText('Home')).toBeDefined()
  })
})
