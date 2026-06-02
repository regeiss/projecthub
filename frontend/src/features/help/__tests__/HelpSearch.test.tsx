import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HelpSearch } from '../HelpSearch'

const mockOnSelect = vi.fn()

describe('HelpSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockOnSelect.mockClear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the search input', () => {
    render(<HelpSearch query="" onQueryChange={() => {}} debouncedQuery="" onSelectArticle={mockOnSelect} />)
    expect(screen.getByRole('searchbox')).toBeTruthy()
  })

  it('shows results matching title when query is provided', () => {
    render(
      <HelpSearch
        query="kanban"
        onQueryChange={() => {}}
        debouncedQuery="kanban"
        onSelectArticle={mockOnSelect}
      />,
    )
    expect(screen.getByText('Usando o quadro Kanban')).toBeTruthy()
  })

  it('shows FAQ results when query matches a FAQ question', () => {
    render(
      <HelpSearch
        query="RAG"
        onQueryChange={() => {}}
        debouncedQuery="RAG"
        onSelectArticle={mockOnSelect}
      />,
    )
    expect(screen.getByText(/RAG/i)).toBeTruthy()
  })

  it('shows empty state when no results match', () => {
    render(
      <HelpSearch
        query="xyznonexistentterm"
        onQueryChange={() => {}}
        debouncedQuery="xyznonexistentterm"
        onSelectArticle={mockOnSelect}
      />,
    )
    expect(screen.getByText(/nenhum resultado/i)).toBeTruthy()
  })

  it('calls onSelectArticle when an article result is clicked', () => {
    render(
      <HelpSearch
        query="kanban"
        onQueryChange={() => {}}
        debouncedQuery="kanban"
        onSelectArticle={mockOnSelect}
      />,
    )
    fireEvent.click(screen.getByText('Usando o quadro Kanban'))
    expect(mockOnSelect).toHaveBeenCalledWith('kanban-board')
  })

  it('shows nothing when debouncedQuery is empty', () => {
    render(
      <HelpSearch
        query="kanban"
        onQueryChange={() => {}}
        debouncedQuery=""
        onSelectArticle={mockOnSelect}
      />,
    )
    expect(screen.queryByText('Usando o quadro Kanban')).toBeNull()
  })

  it('does not render results when inputOnly is true', () => {
    render(
      <HelpSearch
        query="kanban"
        onQueryChange={() => {}}
        debouncedQuery="kanban"
        onSelectArticle={mockOnSelect}
        inputOnly
      />,
    )
    expect(screen.getByRole('searchbox')).toBeTruthy()
    expect(screen.queryByText('Usando o quadro Kanban')).toBeNull()
  })
})
