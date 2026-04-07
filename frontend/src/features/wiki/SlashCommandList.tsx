// frontend/src/features/wiki/SlashCommandList.tsx
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SlashCommandAction =
  | { type: 'panel'; panelType: string }
  | { type: 'date' }
  | { type: 'status'; status: string; label: string }
  | { type: 'image' }
  | { type: 'video' }
  | { type: 'file' }

export interface SlashCommandItem {
  type: 'item'
  label: string
  subtitle: string
  filterKey: string
  icon: string
  action: SlashCommandAction
}

export interface SlashCommandHeader {
  type: 'header'
  label: string
}

export type SlashCommandEntry = SlashCommandItem | SlashCommandHeader

export interface SlashCommandListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

// ─── SLASH_COMMANDS master list ───────────────────────────────────────────────

export const SLASH_COMMANDS: SlashCommandEntry[] = [
  { type: 'header', label: 'Painéis' },
  { type: 'item', label: 'Painel Info',    subtitle: 'Nota informativa em azul',     filterKey: 'info',         icon: 'ℹ️',  action: { type: 'panel', panelType: 'info'    } },
  { type: 'item', label: 'Painel Nota',    subtitle: 'Anotação em amarelo',           filterKey: 'note',         icon: '📝',  action: { type: 'panel', panelType: 'note'    } },
  { type: 'item', label: 'Painel Aviso',   subtitle: 'Alerta em vermelho',            filterKey: 'warning',      icon: '⚠️',  action: { type: 'panel', panelType: 'warning' } },
  { type: 'item', label: 'Painel Sucesso', subtitle: 'Confirmação em verde',          filterKey: 'success',      icon: '✅',  action: { type: 'panel', panelType: 'success' } },
  { type: 'item', label: 'Painel Dica',    subtitle: 'Dica em roxo',                  filterKey: 'tip',          icon: '💡',  action: { type: 'panel', panelType: 'tip'     } },
  { type: 'header', label: 'Conteúdo' },
  { type: 'item', label: 'Data',           subtitle: 'Insere uma data clicável',      filterKey: 'data',         icon: '📅',  action: { type: 'date' }                               },
  { type: 'item', label: 'Em andamento',   subtitle: 'Marcador de status azul',       filterKey: 'em-andamento', icon: '🔵',  action: { type: 'status', status: 'in-progress', label: 'Em andamento' } },
  { type: 'item', label: 'Concluído',      subtitle: 'Marcador de status verde',      filterKey: 'concluido',    icon: '✅',  action: { type: 'status', status: 'done',        label: 'Concluído'    } },
  { type: 'item', label: 'Bloqueado',      subtitle: 'Marcador de status vermelho',   filterKey: 'bloqueado',    icon: '🔴',  action: { type: 'status', status: 'blocked',     label: 'Bloqueado'    } },
  { type: 'item', label: 'Em revisão',     subtitle: 'Marcador de status amarelo',    filterKey: 'em-revisao',   icon: '🟡',  action: { type: 'status', status: 'in-review',   label: 'Em revisão'   } },
  { type: 'item', label: 'Pendente',       subtitle: 'Marcador de status cinza',      filterKey: 'pendente',     icon: '⚪',  action: { type: 'status', status: 'pending',     label: 'Pendente'     } },
  { type: 'header', label: 'Mídia' },
  { type: 'item', label: 'Imagem',         subtitle: 'Insere imagem por URL',         filterKey: 'imagem',       icon: '🖼️',  action: { type: 'image' }                              },
  { type: 'item', label: 'Vídeo',          subtitle: 'YouTube, Vimeo ou URL direta',  filterKey: 'video',        icon: '🎬',  action: { type: 'video' }                              },
  { type: 'item', label: 'Arquivo',        subtitle: 'Link para arquivo externo',     filterKey: 'arquivo',      icon: '📎',  action: { type: 'file' }                               },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface SlashCommandListProps {
  items: SlashCommandItem[]   // filtered selectable items only (no headers)
  command: (action: SlashCommandAction) => void
}

export const SlashCommandList = forwardRef<SlashCommandListHandle, SlashCommandListProps>(
  ({ items, command }, ref) => {
    const [selectedPointer, setSelectedPointer] = useState(0)
    // Keep a ref in sync so useImperativeHandle always reads the latest value
    // without needing to be recreated on every render.
    const selectedPointerRef = useRef(0)

    // Build display entries by walking SLASH_COMMANDS and including a header
    // only if at least one of its group's items appears in the filtered set.
    const { entries, selectableIndices } = useMemo(() => {
      const itemSet = new Set(items.map(i => i.filterKey))
      const result: SlashCommandEntry[] = []
      let currentGroupItems: SlashCommandItem[] = []
      let pendingHeader: SlashCommandHeader | null = null

      for (const entry of SLASH_COMMANDS) {
        if (entry.type === 'header') {
          // Flush previous group
          if (pendingHeader && currentGroupItems.length > 0) {
            result.push(pendingHeader, ...currentGroupItems)
          }
          pendingHeader = entry
          currentGroupItems = []
        } else {
          if (itemSet.has(entry.filterKey)) {
            currentGroupItems.push(entry)
          }
        }
      }
      // Flush last group
      if (pendingHeader && currentGroupItems.length > 0) {
        result.push(pendingHeader, ...currentGroupItems)
      }

      const selectable = result
        .map((e, i) => (e.type === 'item' ? i : -1))
        .filter(i => i !== -1)

      return { entries: result, selectableIndices: selectable }
    }, [items])

    // Reset pointer when items change
    useEffect(() => {
      selectedPointerRef.current = 0
      setSelectedPointer(0)
    }, [items])

    const selectItem = useCallback((pointer: number) => {
      const idx = selectableIndices[pointer]
      const item = idx !== undefined ? entries[idx] : undefined
      if (item?.type === 'item') command(item.action)
    }, [selectableIndices, entries, command])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (selectableIndices.length === 0) return false
        if (event.key === 'ArrowUp') {
          const next = (selectedPointerRef.current + selectableIndices.length - 1) % selectableIndices.length
          selectedPointerRef.current = next
          setSelectedPointer(next)
          return true
        }
        if (event.key === 'ArrowDown') {
          const next = (selectedPointerRef.current + 1) % selectableIndices.length
          selectedPointerRef.current = next
          setSelectedPointer(next)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedPointerRef.current)
          return true
        }
        return false
      },
    }), [selectableIndices, selectItem])

    if (items.length === 0) return null

    return (
      <div className="min-w-[260px] overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-md">
        {entries.map((entry, displayIndex) => {
          if (entry.type === 'header') {
            return (
              <div
                key={`header-${entry.label}`}
                className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 select-none"
              >
                {entry.label}
              </div>
            )
          }
          // Find which pointer this selectable item corresponds to
          const pointerForThis = selectableIndices.indexOf(displayIndex)
          const isSelected = pointerForThis === selectedPointer
          return (
            <button
              key={entry.filterKey}
              type="button"
              className={`flex w-full items-start gap-2.5 px-3 py-2 text-sm text-left ${
                isSelected
                  ? 'bg-gray-100 dark:bg-gray-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
              onClick={() => selectItem(pointerForThis)}
            >
              <span className="shrink-0 text-base leading-tight mt-0.5">{entry.icon}</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{entry.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{entry.subtitle}</div>
              </div>
            </button>
          )
        })}
      </div>
    )
  },
)
SlashCommandList.displayName = 'SlashCommandList'
