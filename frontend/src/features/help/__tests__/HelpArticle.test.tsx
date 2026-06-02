import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HelpArticle } from '../HelpArticle'

const mockOnBack = vi.fn()

describe('HelpArticle', () => {
  it('renders the article title', () => {
    render(<HelpArticle articleId="getting-started" onBack={mockOnBack} />)
    expect(screen.getByText('Primeiros passos')).toBeTruthy()
  })

  it('renders article body content', () => {
    render(<HelpArticle articleId="getting-started" onBack={mockOnBack} />)
    expect(screen.getByText(/ProjectHub/i)).toBeTruthy()
  })

  it('renders "Usando o quadro Kanban" article', () => {
    render(<HelpArticle articleId="kanban-board" onBack={mockOnBack} />)
    expect(screen.getByText('Usando o quadro Kanban')).toBeTruthy()
  })

  it('calls onBack when back button is clicked', () => {
    mockOnBack.mockClear()
    render(<HelpArticle articleId="getting-started" onBack={mockOnBack} />)
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(mockOnBack).toHaveBeenCalledOnce()
  })

  it('shows not-found message for unknown articleId', () => {
    render(<HelpArticle articleId="nonexistent-id" onBack={mockOnBack} />)
    expect(screen.getByText(/artigo não encontrado/i)).toBeTruthy()
  })
})
