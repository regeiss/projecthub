import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelpPage } from '../HelpPage'

function renderPage(state?: object) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/help', state: state ?? null }]}>
      <HelpPage />
    </MemoryRouter>,
  )
}

describe('HelpPage', () => {
  it('renders the page title', () => {
    renderPage()
    expect(screen.getByText('Central de Ajuda')).toBeTruthy()
  })

  it('renders the category navigation', () => {
    renderPage()
    expect(screen.getByRole('navigation', { name: 'Categorias de ajuda' })).toBeTruthy()
  })

  it('shows article list when a category is active', () => {
    renderPage()
    expect(screen.getByText('Primeiros passos')).toBeTruthy()
  })

  it('navigates to an article when title is clicked', () => {
    renderPage()
    fireEvent.click(screen.getByText('Primeiros passos'))
    expect(screen.getByText(/O ProjectHub é o sistema interno/i)).toBeTruthy()
  })

  it('shows shortcuts panel when Atalhos is selected', () => {
    renderPage()
    fireEvent.click(screen.getByText('Atalhos'))
    expect(screen.getByText('Atalhos de teclado')).toBeTruthy()
  })

  it('shows FAQ panel when FAQ is selected', () => {
    renderPage()
    fireEvent.click(screen.getByText('FAQ'))
    expect(screen.getByText('Perguntas frequentes')).toBeTruthy()
  })

  it('pre-selects board category when state.from is a board route', () => {
    renderPage({ from: '/projects/proj-1/board' })
    expect(screen.getByText('Usando o quadro Kanban')).toBeTruthy()
  })

  it('renders exactly one search input in header', () => {
    renderPage()
    expect(screen.getAllByRole('searchbox')).toHaveLength(1)
  })
})
