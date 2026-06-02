import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShortcutsPanel } from '../ShortcutsPanel'
import { SHORTCUTS } from '../content/shortcuts'

describe('ShortcutsPanel', () => {
  it('renders group headings', () => {
    render(<ShortcutsPanel />)
    expect(screen.getByText('Navegação')).toBeTruthy()
    expect(screen.getByText('Issues')).toBeTruthy()
    expect(screen.getByText('Editor (Wiki)')).toBeTruthy()
  })

  it('renders all shortcut descriptions', () => {
    render(<ShortcutsPanel />)
    SHORTCUTS.forEach((s) => {
      expect(screen.getByText(s.description)).toBeTruthy()
    })
  })

  it('renders key badges for each shortcut', () => {
    render(<ShortcutsPanel />)
    expect(screen.getAllByText('?').length).toBeGreaterThan(0)
  })
})
