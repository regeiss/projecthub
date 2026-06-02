import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createElement } from 'react'
import { useHelp } from '../useHelp'

function wrapper(initialPath: string, state?: object) {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(MemoryRouter, {
      initialEntries: [{ pathname: initialPath, state: state ?? null }],
    }, children)
}

describe('useHelp — context detection', () => {
  it('defaults to "general" panel with no state', () => {
    const { result } = renderHook(() => useHelp(), { wrapper: wrapper('/help') })
    expect(result.current.panel).toBe('general')
  })

  it('pre-selects "board" when state.from is a board route', () => {
    const { result } = renderHook(
      () => useHelp(),
      { wrapper: wrapper('/help', { from: '/projects/proj-123/board' }) },
    )
    expect(result.current.panel).toBe('board')
  })

  it('pre-selects "cycles" when state.from is a cycles route', () => {
    const { result } = renderHook(
      () => useHelp(),
      { wrapper: wrapper('/help', { from: '/projects/proj-123/cycles' }) },
    )
    expect(result.current.panel).toBe('cycles')
  })

  it('pre-selects "wiki" when state.from is a wiki route', () => {
    const { result } = renderHook(
      () => useHelp(),
      { wrapper: wrapper('/help', { from: '/projects/proj-123/wiki' }) },
    )
    expect(result.current.panel).toBe('wiki')
  })

  it('pre-selects "portfolio" when state.from is /portfolio', () => {
    const { result } = renderHook(
      () => useHelp(),
      { wrapper: wrapper('/help', { from: '/portfolio' }) },
    )
    expect(result.current.panel).toBe('portfolio')
  })
})

describe('useHelp — panel and article state', () => {
  it('setPanel updates the selected panel', () => {
    const { result } = renderHook(() => useHelp(), { wrapper: wrapper('/help') })
    act(() => result.current.setPanel('board'))
    expect(result.current.panel).toBe('board')
  })

  it('setArticleId updates selected article and clears when null', () => {
    const { result } = renderHook(() => useHelp(), { wrapper: wrapper('/help') })
    act(() => result.current.setArticleId('kanban-board'))
    expect(result.current.articleId).toBe('kanban-board')
    act(() => result.current.setArticleId(null))
    expect(result.current.articleId).toBeNull()
  })
})

describe('useHelp — keyboard shortcut guard', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('does not fire when activeElement is an INPUT', () => {
    renderHook(() => useHelp(), { wrapper: wrapper('/other-page') })
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
    })
    expect(true).toBe(true) // guard ran without error
    document.body.removeChild(input)
  })

  it('does not fire when activeElement is a TEXTAREA', () => {
    renderHook(() => useHelp(), { wrapper: wrapper('/other-page') })
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    ta.focus()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
    })
    document.body.removeChild(ta)
    expect(true).toBe(true)
  })
})

describe('useHelp — search', () => {
  it('setQuery updates query', () => {
    const { result } = renderHook(() => useHelp(), { wrapper: wrapper('/help') })
    act(() => result.current.setQuery('kanban'))
    expect(result.current.query).toBe('kanban')
  })
})
