// frontend/src/features/wiki/__tests__/SlashCommandList.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import {
  SlashCommandList,
  SLASH_COMMANDS,
  type SlashCommandListHandle,
  type SlashCommandItem,
} from '../SlashCommandList'

// All 14 selectable items (no headers)
const ALL_ITEMS = SLASH_COMMANDS.filter(
  (e): e is SlashCommandItem => e.type === 'item',
)

// Only panel items (5)
const PANEL_ITEMS = ALL_ITEMS.filter(
  (e) => e.action.type === 'panel',
)

describe('SlashCommandList', () => {
  it('renders all 14 item labels when given all selectable items', () => {
    render(<SlashCommandList items={ALL_ITEMS} command={vi.fn()} />)
    expect(screen.getByText('Painel Info')).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
    expect(screen.getByText('Em andamento')).toBeInTheDocument()
    expect(screen.getByText('Vídeo')).toBeInTheDocument()
    expect(screen.getByText('Arquivo')).toBeInTheDocument()
  })

  it('renders section headers for each visible group', () => {
    render(<SlashCommandList items={ALL_ITEMS} command={vi.fn()} />)
    expect(screen.getByText('Painéis')).toBeInTheDocument()
    expect(screen.getByText('Conteúdo')).toBeInTheDocument()
    expect(screen.getByText('Mídia')).toBeInTheDocument()
  })

  it('only shows headers whose group has at least one item in the filtered set', () => {
    render(<SlashCommandList items={PANEL_ITEMS} command={vi.fn()} />)
    expect(screen.getByText('Painéis')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument()
    expect(screen.queryByText('Mídia')).not.toBeInTheDocument()
  })

  it('returns null when items is empty', () => {
    const { container } = render(<SlashCommandList items={[]} command={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('calls command with the full item on click', async () => {
    const command = vi.fn()
    render(<SlashCommandList items={ALL_ITEMS} command={command} />)
    await userEvent.click(screen.getByText('Painel Aviso'))
    const calledWith = command.mock.calls[0][0] as SlashCommandItem
    expect(calledWith.type).toBe('item')
    expect(calledWith.filterKey).toBe('warning')
    expect(calledWith.action).toEqual({ type: 'panel', panelType: 'warning' })
  })

  it('calls command with the full item on click (date)', async () => {
    const command = vi.fn()
    render(<SlashCommandList items={ALL_ITEMS} command={command} />)
    await userEvent.click(screen.getByText('Data'))
    const calledWith = command.mock.calls[0][0] as SlashCommandItem
    expect(calledWith.type).toBe('item')
    expect(calledWith.filterKey).toBe('data')
    expect(calledWith.action).toEqual({ type: 'date' })
  })

  it('keyboard ArrowDown skips headers and Enter dispatches full item', () => {
    const command = vi.fn()
    const ref = createRef<SlashCommandListHandle>()
    render(<SlashCommandList ref={ref} items={ALL_ITEMS} command={command} />)
    // starts at pointer=0 (Painel Info); ArrowDown → pointer=1 (Painel Nota)
    ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'ArrowDown' }) })
    ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'Enter' }) })
    const calledWith = command.mock.calls[0][0] as SlashCommandItem
    expect(calledWith.type).toBe('item')
    expect(calledWith.filterKey).toBe('note')
    expect(calledWith.action).toEqual({ type: 'panel', panelType: 'note' })
  })
})
