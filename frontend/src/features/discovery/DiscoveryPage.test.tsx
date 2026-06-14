import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import App from '@/App'

vi.mock('@/features/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/features/auth/ProtectedRoute', async () => {
  const { Outlet } = await import('react-router-dom')
  return { ProtectedRoute: () => <Outlet /> }
})

vi.mock('@/components/layout/AppLayout', async () => {
  const { Outlet } = await import('react-router-dom')
  return { AppLayout: () => <Outlet /> }
})

vi.mock('@/hooks/useDiscovery', () => ({
  useIdeas: () => ({ data: [], isLoading: false }),
}))

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/discovery']}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DiscoveryPage route', () => {
  it('renders the discovery page route', async () => {
    renderApp()

    expect(await screen.findByText('Product Discovery')).toBeInTheDocument()
  })
})
