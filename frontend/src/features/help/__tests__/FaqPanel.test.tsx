import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FaqPanel } from '../FaqPanel'

describe('FaqPanel', () => {
  it('renders all FAQ questions', () => {
    render(<FaqPanel />)
    expect(screen.getByText('Por que não consigo excluir um projeto?')).toBeTruthy()
    expect(screen.getByText('Como uso a busca global?')).toBeTruthy()
  })

  it('answers are hidden by default', () => {
    render(<FaqPanel />)
    expect(screen.queryByText(/somente administradores/i)).toBeNull()
  })

  it('expands answer when question is clicked', () => {
    render(<FaqPanel />)
    fireEvent.click(screen.getByText('Por que não consigo excluir um projeto?'))
    expect(screen.getByText(/somente administradores/i)).toBeTruthy()
  })

  it('collapses answer when question is clicked again', () => {
    render(<FaqPanel />)
    const question = screen.getByText('Por que não consigo excluir um projeto?')
    fireEvent.click(question)
    expect(screen.getByText(/somente administradores/i)).toBeTruthy()
    fireEvent.click(question)
    expect(screen.queryByText(/somente administradores/i)).toBeNull()
  })

  it('only one answer is expanded at a time', () => {
    render(<FaqPanel />)
    fireEvent.click(screen.getByText('Por que não consigo excluir um projeto?'))
    fireEvent.click(screen.getByText('Como uso a busca global?'))
    expect(screen.queryByText(/somente administradores/i)).toBeNull()
    expect(screen.getByText(/clique no ícone de lupa/i)).toBeTruthy()
  })
})
