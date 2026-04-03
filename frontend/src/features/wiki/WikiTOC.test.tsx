import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WikiTOC } from './WikiTOC'
import type { Editor } from '@tiptap/react'

beforeAll(() => {
  class MockIntersectionObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
  }
  ;(globalThis as any).IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
})

function makeEditor(headings: { level: number; text: string }[]): Partial<Editor> {
  const doc = {
    type: 'doc',
    content: headings.map(({ level, text }) => ({
      type: 'heading',
      attrs: { level, id: `heading-${text.toLowerCase().replace(/\s+/g, '-')}` },
      content: [{ type: 'text', text }],
    })),
  }
  return {
    getJSON: () => doc as any,
    on: vi.fn(),
    off: vi.fn(),
    isDestroyed: false,
  } as Partial<Editor>
}

describe('WikiTOC', () => {
  it('renders headings extracted from editor JSON', () => {
    const editor = makeEditor([
      { level: 1, text: 'Overview' },
      { level: 2, text: 'Details' },
      { level: 3, text: 'Sub-detail' },
    ])
    render(<WikiTOC editor={editor as Editor} />)
    expect(screen.getByText('Overview')).toBeDefined()
    expect(screen.getByText('Details')).toBeDefined()
    expect(screen.getByText('Sub-detail')).toBeDefined()
  })

  it('returns null when fewer than 3 headings', () => {
    const editor = makeEditor([
      { level: 1, text: 'Only One' },
    ])
    const { container } = render(<WikiTOC editor={editor as Editor} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when editor is null', () => {
    const { container } = render(<WikiTOC editor={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('clicking an entry calls scrollIntoView on target element', () => {
    const editor = makeEditor([
      { level: 1, text: 'Overview' },
      { level: 2, text: 'Setup' },
      { level: 3, text: 'Config' },
    ])
    render(<WikiTOC editor={editor as Editor} />)

    const mockEl = { scrollIntoView: vi.fn() }
    vi.spyOn(document, 'getElementById').mockReturnValue(mockEl as any)

    fireEvent.click(screen.getByText('Overview'))
    expect(mockEl.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
  })
})
