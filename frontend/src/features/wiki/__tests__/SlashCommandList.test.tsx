// frontend/src/features/wiki/__tests__/SlashCommandList.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { SlashCommandList, SLASH_COMMANDS, type SlashCommandListHandle } from '../SlashCommandList'

describe('SlashCommandList', () => {
  it('renders all 5 panel commands', () => {
    render(<SlashCommandList items={SLASH_COMMANDS} command={vi.fn()} />)
    expect(screen.getByText('Painel Info')).toBeInTheDocument()
    expect(screen.getByText('Painel Nota')).toBeInTheDocument()
    expect(screen.getByText('Painel Aviso')).toBeInTheDocument()
    expect(screen.getByText('Painel Sucesso')).toBeInTheDocument()
    expect(screen.getByText('Painel Dica')).toBeInTheDocument()
  })

  it('returns null when items is empty', () => {
    const { container } = render(<SlashCommandList items={[]} command={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('calls command with panelType on click', async () => {
    const command = vi.fn()
    render(<SlashCommandList items={SLASH_COMMANDS} command={command} />)
    await userEvent.click(screen.getByText('Painel Aviso'))
    expect(command).toHaveBeenCalledWith({ panelType: 'warning' })
  })

  it('navigates with ArrowDown and selects with Enter via ref', () => {
    const command = vi.fn()
    const ref = createRef<SlashCommandListHandle>()
    render(<SlashCommandList ref={ref} items={SLASH_COMMANDS} command={command} />)
    ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'ArrowDown' }) })
    ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'Enter' }) })
    // ArrowDown moves from index 0 (info) → 1 (note)
    expect(command).toHaveBeenCalledWith({ panelType: 'note' })
  })
})
