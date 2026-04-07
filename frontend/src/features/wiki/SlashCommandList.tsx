// frontend/src/features/wiki/SlashCommandList.tsx
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'

export interface SlashCommandItem {
  label: string
  subtitle: string
  panelType: string
  icon: string
}

export interface SlashCommandListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

interface SlashCommandListProps {
  items: SlashCommandItem[]
  command: (props: { panelType: string }) => void
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  { label: 'Painel Info',    subtitle: 'Nota informativa em azul', panelType: 'info',    icon: 'ℹ️' },
  { label: 'Painel Nota',    subtitle: 'Anotação em amarelo',      panelType: 'note',    icon: '📝' },
  { label: 'Painel Aviso',   subtitle: 'Alerta em vermelho',       panelType: 'warning', icon: '⚠️' },
  { label: 'Painel Sucesso', subtitle: 'Confirmação em verde',     panelType: 'success', icon: '✅' },
  { label: 'Painel Dica',    subtitle: 'Dica em roxo',             panelType: 'tip',     icon: '💡' },
]

export const SlashCommandList = forwardRef<SlashCommandListHandle, SlashCommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => setSelectedIndex(0), [items])

    function selectItem(index: number) {
      const item = items[index]
      if (item) command({ panelType: item.panelType })
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex(i => (i + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex(i => (i + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) return null

    return (
      <div className="min-w-[240px] overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-md">
        {items.map((item, index) => (
          <button
            key={item.panelType}
            type="button"
            className={`flex w-full items-start gap-2.5 px-3 py-2 text-sm text-left ${
              index === selectedIndex
                ? 'bg-gray-100 dark:bg-gray-800'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
            onClick={() => selectItem(index)}
          >
            <span className="shrink-0 text-base leading-tight mt-0.5">{item.icon}</span>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{item.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</div>
            </div>
          </button>
        ))}
      </div>
    )
  },
)
SlashCommandList.displayName = 'SlashCommandList'
