# Wiki Extended Slash Commands Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the TipTap wiki editor's `/` slash command menu with Date, Status, Image, Video, and File commands and add section headers to the menu.

**Architecture:** Refactor `SlashCommandList` and `SlashCommand.ts` to use a discriminated-union `SlashCommandAction` instead of the panel-only `panelType` string. Four new TipTap nodes (DateNode, StatusNode, VideoNode, FileNode) are added as self-contained extension files. The Suggestion plugin's `items` callback strips `SlashCommandHeader` sentinels before passing to TipTap; `SlashCommandList` re-interleaves them for display. The `command` callback in `SlashCommand.ts` dispatches on `action.type` and handles each command's insertion flow.

**Tech Stack:** TipTap v2, `@tiptap/react` (ReactRenderer, ReactNodeViewRenderer, NodeViewWrapper), `date-fns` v4 (already installed), `react-dom` createPortal, Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-04-07-wiki-slash-commands-extended-design.md`

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `frontend/src/features/wiki/SlashCommandList.tsx` | Modify | New types, 14-item + 3-header SLASH_COMMANDS, header display, diacritic-aware keys, pointer-based keyboard nav |
| `frontend/src/features/wiki/extensions/SlashCommand.ts` | Modify | Strip headers from `items()`, diacritic filter, dispatch on `action.type` in `command()` |
| `frontend/src/features/wiki/extensions/DateNode.tsx` | Create | Inline atom `date` node + portal-based date picker (slash insert + click-to-edit) |
| `frontend/src/features/wiki/extensions/StatusNode.tsx` | Create | Inline atom `status` node + STATUS_STYLES color map |
| `frontend/src/features/wiki/extensions/VideoNode.tsx` | Create | Block atom `video` node + YouTube/Vimeo embed URL detection |
| `frontend/src/features/wiki/extensions/FileNode.tsx` | Create | Inline atom `fileLink` node + URL filename extraction |
| `frontend/src/features/wiki/WikiEditor.tsx` | Modify | Add DateExtension, StatusExtension, VideoExtension, FileExtension |
| `frontend/src/features/wiki/__tests__/SlashCommandList.test.tsx` | Modify | Update for new types + test header display + action dispatch |
| `frontend/src/features/wiki/__tests__/VideoNode.test.ts` | Create | Unit-test `getEmbedUrl` pure function |

---

## Chunk 1: SlashCommandList Refactoring

### Task 1: Rewrite SlashCommandList types and component

**Files:**
- Modify: `frontend/src/features/wiki/SlashCommandList.tsx`
- Modify: `frontend/src/features/wiki/__tests__/SlashCommandList.test.tsx`

The current `SlashCommandItem.panelType: string` and `command: (props: { panelType: string }) => void` must be replaced with the discriminated-union design from the spec. `SLASH_COMMANDS` grows from 5 items to 14 items + 3 `SlashCommandHeader` sentinels. `SlashCommandList` re-interleaves headers for display while `selectedIndex` tracks a pointer into the selectable-only indices.

#### Step 1a: Write the updated failing tests

- [ ] **Step 1: Replace `SlashCommandList.test.tsx` entirely**

```tsx
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
  type SlashCommandAction,
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

  it('calls command with panel action on click', async () => {
    const command = vi.fn()
    render(<SlashCommandList items={ALL_ITEMS} command={command} />)
    await userEvent.click(screen.getByText('Painel Aviso'))
    expect(command).toHaveBeenCalledWith({ type: 'panel', panelType: 'warning' } satisfies SlashCommandAction)
  })

  it('calls command with date action on click', async () => {
    const command = vi.fn()
    render(<SlashCommandList items={ALL_ITEMS} command={command} />)
    await userEvent.click(screen.getByText('Data'))
    expect(command).toHaveBeenCalledWith({ type: 'date' } satisfies SlashCommandAction)
  })

  it('keyboard ArrowDown skips headers and Enter dispatches action', () => {
    const command = vi.fn()
    const ref = createRef<SlashCommandListHandle>()
    render(<SlashCommandList ref={ref} items={ALL_ITEMS} command={command} />)
    // starts at pointer=0 (Painel Info); ArrowDown → pointer=1 (Painel Nota)
    ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'ArrowDown' }) })
    ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'Enter' }) })
    expect(command).toHaveBeenCalledWith({ type: 'panel', panelType: 'note' })
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (type mismatch on old interface)**

```bash
cd ~/projecthub/frontend && npx vitest run src/features/wiki/__tests__/SlashCommandList.test.tsx 2>&1
```

Expected: errors about missing types / wrong `command` prop type.

- [ ] **Step 3: Rewrite `SlashCommandList.tsx`**

```tsx
// frontend/src/features/wiki/SlashCommandList.tsx
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
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
    useEffect(() => setSelectedPointer(0), [items])

    function selectItem(pointer: number) {
      const idx = selectableIndices[pointer]
      const item = idx !== undefined ? entries[idx] : undefined
      if (item?.type === 'item') command(item.action)
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (selectableIndices.length === 0) return false
        if (event.key === 'ArrowUp') {
          setSelectedPointer(p => (p + selectableIndices.length - 1) % selectableIndices.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedPointer(p => (p + 1) % selectableIndices.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedPointer)
          return true
        }
        return false
      },
    }))

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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd ~/projecthub/frontend && npx vitest run src/features/wiki/__tests__/SlashCommandList.test.tsx 2>&1
```

Expected: `7 passed`

- [ ] **Step 5: Typecheck**

```bash
cd ~/projecthub/frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors on the modified files (SlashCommand.ts will have errors until Task 4 — that's OK, ignore for now).

- [ ] **Step 6: Commit**

```bash
cd /mnt/d/projecthub && git add frontend/src/features/wiki/SlashCommandList.tsx \
  frontend/src/features/wiki/__tests__/SlashCommandList.test.tsx
git commit -m "feat(wiki): refactor SlashCommandList with discriminated-union actions and section headers"
```

---

## Chunk 2: New TipTap Nodes

### Task 2: DateNode

**Files:**
- Create: `frontend/src/features/wiki/extensions/DateNode.tsx`

Inline atom node that renders a clickable date chip. On click, a portal-based `<input type="date">` appears anchored to the chip. On slash-command insertion the picker is shown via a portal anchored to `coordsAtPos(insertPos)` (the SlashCommand.ts dispatch handles this separately in Task 4).

- [ ] **Step 1: Create `DateNode.tsx`**

```tsx
// frontend/src/features/wiki/extensions/DateNode.tsx
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'

// ─── NodeView ─────────────────────────────────────────────────────────────────

function DateNodeView({ node, getPos, editor }: NodeViewProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const dateStr: string = node.attrs.date ?? ''

  // Format for display: ISO string → dd/MM/yyyy
  let displayDate = dateStr
  try {
    if (dateStr) displayDate = format(new Date(dateStr + 'T00:00:00'), 'dd/MM/yyyy')
  } catch {
    displayDate = dateStr
  }

  function handleConfirm(isoDate: string) {
    const pos = getPos()
    if (pos === undefined) return
    editor.chain().command(({ tr }) => {
      tr.setNodeMarkup(pos, undefined, { date: isoDate })
      return true
    }).run()
    setPickerOpen(false)
  }

  return (
    <NodeViewWrapper as="span">
      <span
        className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded px-1.5 py-0.5 text-sm font-medium cursor-pointer select-none"
        onClick={() => setPickerOpen(true)}
        contentEditable={false}
      >
        📅 {displayDate || '—'}
      </span>
      {pickerOpen &&
        createPortal(
          <DatePickerOverlay
            value={dateStr}
            onConfirm={handleConfirm}
            onClose={() => setPickerOpen(false)}
          />,
          document.body,
        )}
    </NodeViewWrapper>
  )
}

// ─── DatePickerOverlay ────────────────────────────────────────────────────────

interface DatePickerOverlayProps {
  value: string
  onConfirm: (isoDate: string) => void
  onClose: () => void
  style?: React.CSSProperties
}

export function DatePickerOverlay({ value, onConfirm, onClose, style }: DatePickerOverlayProps) {
  const [selected, setSelected] = useState(value || new Date().toISOString().split('T')[0])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter') onConfirm(selected)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Picker */}
      <div
        className="fixed z-[9999] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-3 flex flex-col gap-2"
        style={style ?? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <input
          type="date"
          value={selected}
          onChange={e => setSelected(e.target.value)}
          onKeyDown={handleKeyDown}
          className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Confirmar
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Extension ────────────────────────────────────────────────────────────────

export const DateExtension = Node.create({
  name: 'date',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      date: {
        default: null,
        parseHTML: element => element.getAttribute('data-date'),
        renderHTML: attributes => ({ 'data-date': attributes.date }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="date"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'date' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DateNodeView)
  },
})
```

- [ ] **Step 2: Typecheck DateNode**

```bash
cd ~/projecthub/frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /mnt/d/projecthub && git add frontend/src/features/wiki/extensions/DateNode.tsx
git commit -m "feat(wiki): add DateNode inline atom with portal-based date picker"
```

---

### Task 3: StatusNode

**Files:**
- Create: `frontend/src/features/wiki/extensions/StatusNode.tsx`

Inline atom node. Colors are derived at render time from a `STATUS_STYLES` record — they are not stored as document attributes.

- [ ] **Step 1: Create `StatusNode.tsx`**

```tsx
// frontend/src/features/wiki/extensions/StatusNode.tsx
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

// ─── Color map ────────────────────────────────────────────────────────────────
// Colors derived at render time — not stored as document attributes.

const STATUS_STYLES: Record<string, string> = {
  'in-progress': 'border-blue-400   bg-blue-50   text-blue-700   dark:border-blue-500   dark:bg-blue-900/20   dark:text-blue-300',
  'done':        'border-green-400  bg-green-50  text-green-700  dark:border-green-500  dark:bg-green-900/20  dark:text-green-300',
  'blocked':     'border-red-400    bg-red-50    text-red-700    dark:border-red-500    dark:bg-red-900/20    dark:text-red-300',
  'in-review':   'border-yellow-400 bg-yellow-50 text-yellow-700 dark:border-yellow-500 dark:bg-yellow-900/20 dark:text-yellow-300',
  'pending':     'border-gray-300   bg-gray-50   text-gray-500   dark:border-gray-600   dark:bg-gray-800      dark:text-gray-400',
}

const FALLBACK_STYLE = STATUS_STYLES['pending']

// ─── NodeView ─────────────────────────────────────────────────────────────────

function StatusNodeView({ node }: NodeViewProps) {
  const status: string = node.attrs.status ?? 'pending'
  const label: string = node.attrs.label ?? status
  const styleClass = STATUS_STYLES[status] ?? FALLBACK_STYLE

  return (
    <NodeViewWrapper as="span">
      <span
        className={`inline-flex items-center rounded border-l-2 px-2 py-0.5 text-xs font-medium select-none ${styleClass}`}
        contentEditable={false}
      >
        {label}
      </span>
    </NodeViewWrapper>
  )
}

// ─── Extension ────────────────────────────────────────────────────────────────

export const StatusExtension = Node.create({
  name: 'status',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      status: {
        default: 'pending',
        parseHTML: element => element.getAttribute('data-status'),
        renderHTML: attributes => ({ 'data-status': attributes.status }),
      },
      label: {
        default: '',
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => ({ 'data-label': attributes.label }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="status"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'status' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(StatusNodeView)
  },
})
```

- [ ] **Step 2: Commit**

```bash
cd /mnt/d/projecthub && git add frontend/src/features/wiki/extensions/StatusNode.tsx
git commit -m "feat(wiki): add StatusNode inline atom with STATUS_STYLES color map"
```

---

### Task 4: VideoNode

**Files:**
- Create: `frontend/src/features/wiki/extensions/VideoNode.tsx`
- Create: `frontend/src/features/wiki/__tests__/VideoNode.test.ts`

Block atom node with YouTube/Vimeo embed detection. The `getEmbedUrl` helper is a pure function — test it in isolation.

- [ ] **Step 1: Write the failing test for `getEmbedUrl`**

```typescript
// frontend/src/features/wiki/__tests__/VideoNode.test.ts
import { describe, it, expect } from 'vitest'
import { getEmbedUrl } from '../extensions/VideoNode'

describe('getEmbedUrl', () => {
  it('converts youtube.com/watch URL to embed', () => {
    const result = getEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result).toEqual({ kind: 'iframe', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' })
  })

  it('converts youtu.be short URL to embed', () => {
    const result = getEmbedUrl('https://youtu.be/dQw4w9WgXcQ')
    expect(result).toEqual({ kind: 'iframe', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' })
  })

  it('converts vimeo.com URL to embed', () => {
    const result = getEmbedUrl('https://vimeo.com/123456789')
    expect(result).toEqual({ kind: 'iframe', url: 'https://player.vimeo.com/video/123456789' })
  })

  it('returns video kind for direct video URL', () => {
    const result = getEmbedUrl('https://example.com/video.mp4')
    expect(result).toEqual({ kind: 'video', url: 'https://example.com/video.mp4' })
  })
})
```

- [ ] **Step 2: Run test — expect FAIL (module not found)**

```bash
cd ~/projecthub/frontend && npx vitest run src/features/wiki/__tests__/VideoNode.test.ts 2>&1
```

Expected: `Cannot find module '../extensions/VideoNode'`

- [ ] **Step 3: Create `VideoNode.tsx`**

```tsx
// frontend/src/features/wiki/extensions/VideoNode.tsx
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

// ─── Embed URL helper — exported for testing ──────────────────────────────────

export function getEmbedUrl(src: string): { kind: 'iframe' | 'video'; url: string } {
  const ytMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return { kind: 'iframe', url: `https://www.youtube.com/embed/${ytMatch[1]}` }

  const vimeoMatch = src.match(/vimeo\.com\/(?:.*\/)?(\d+)/)
  if (vimeoMatch) return { kind: 'iframe', url: `https://player.vimeo.com/video/${vimeoMatch[1]}` }

  return { kind: 'video', url: src }
}

// ─── NodeView ─────────────────────────────────────────────────────────────────

function VideoNodeView({ node }: NodeViewProps) {
  const src: string = node.attrs.src ?? ''
  const embed = getEmbedUrl(src)

  return (
    <NodeViewWrapper>
      <div className="my-2 aspect-video w-full overflow-hidden rounded-md" contentEditable={false}>
        {embed.kind === 'iframe' ? (
          <iframe
            src={embed.url}
            className="w-full h-full"
            allowFullScreen
            title="Vídeo incorporado"
          />
        ) : (
          <video src={embed.url} controls className="w-full h-full" />
        )}
      </div>
    </NodeViewWrapper>
  )
}

// ─── Extension ────────────────────────────────────────────────────────────────

export const VideoExtension = Node.create({
  name: 'video',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: '',
        parseHTML: element => element.getAttribute('data-src'),
        renderHTML: attributes => ({ 'data-src': attributes.src }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="video"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'video' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView)
  },
})
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd ~/projecthub/frontend && npx vitest run src/features/wiki/__tests__/VideoNode.test.ts 2>&1
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
cd /mnt/d/projecthub && git add frontend/src/features/wiki/extensions/VideoNode.tsx \
  frontend/src/features/wiki/__tests__/VideoNode.test.ts
git commit -m "feat(wiki): add VideoNode block atom with YouTube/Vimeo embed detection"
```

---

### Task 5: FileNode

**Files:**
- Create: `frontend/src/features/wiki/extensions/FileNode.tsx`

Inline atom node. Renders a clickable file chip that opens `href` in a new tab.

- [ ] **Step 1: Create `FileNode.tsx`**

```tsx
// frontend/src/features/wiki/extensions/FileNode.tsx
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

// ─── NodeView ─────────────────────────────────────────────────────────────────

function FileNodeView({ node }: NodeViewProps) {
  const href: string = node.attrs.href ?? ''
  const filename: string = node.attrs.filename ?? 'arquivo'

  return (
    <NodeViewWrapper as="span">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded px-1.5 py-0.5 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer select-none"
        contentEditable={false}
        onClick={e => e.stopPropagation()}
      >
        📎 {filename}
      </a>
    </NodeViewWrapper>
  )
}

// ─── Extension ────────────────────────────────────────────────────────────────

export const FileExtension = Node.create({
  name: 'fileLink',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      href: {
        default: '',
        parseHTML: element => element.getAttribute('data-href'),
        renderHTML: attributes => ({ 'data-href': attributes.href }),
      },
      filename: {
        default: 'arquivo',
        parseHTML: element => element.getAttribute('data-filename'),
        renderHTML: attributes => ({ 'data-filename': attributes.filename }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="file-link"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'file-link' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileNodeView)
  },
})
```

- [ ] **Step 2: Commit**

```bash
cd /mnt/d/projecthub && git add frontend/src/features/wiki/extensions/FileNode.tsx
git commit -m "feat(wiki): add FileNode inline atom file link chip"
```

---

## Chunk 3: SlashCommand.ts Refactoring

### Task 6: Rewrite SlashCommand.ts

**Files:**
- Modify: `frontend/src/features/wiki/extensions/SlashCommand.ts`

Key changes:
1. `items()` callback: normalizes diacritics, strips `SlashCommandHeader` entries, filters by both `filterKey` and `label`.
2. `command()` callback: captures `insertPos = range.from` **first**, then dispatches on `action.type`.
3. Date command: uses `ReactRenderer` to mount `DatePickerOverlay` in a fixed container.
4. Video/File commands: use `window.prompt` (safe — insertPos captured before the call).
5. Image command: uses `window.prompt`, inserts existing `image` node type.
6. Status command: inserts the status node immediately, no picker.

The `props` that the Suggestion plugin passes to `command` is now `SlashCommandItem` (the full item object, not just `{ panelType }`). The `items()` callback returns `SlashCommandItem[]` (no headers).

- [ ] **Step 1: Rewrite `SlashCommand.ts`**

```typescript
// frontend/src/features/wiki/extensions/SlashCommand.ts
import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'
import {
  SlashCommandList,
  SLASH_COMMANDS,
  type SlashCommandItem,
  type SlashCommandListHandle,
} from '../SlashCommandList'
import { DatePickerOverlay } from './DateNode'

// ─── Diacritic normalizer ─────────────────────────────────────────────────────

function normalize(str: string): string {
  return str.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase()
}

// ─── Position helper ──────────────────────────────────────────────────────────

function updatePosition(
  container: HTMLDivElement,
  clientRect: (() => DOMRect | null) | null | undefined,
) {
  if (!clientRect) return
  const rect = clientRect()
  if (!rect) return
  container.style.top = `${rect.bottom + 4}px`
  container.style.left = `${rect.left}px`
}

// ─── Extension ────────────────────────────────────────────────────────────────

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        startOfLine: false,

        // Strip headers; filter selectable items by filterKey + label (diacritic-aware)
        items: ({ query }): SlashCommandItem[] => {
          const q = normalize(query)
          return SLASH_COMMANDS.filter(
            (e): e is SlashCommandItem =>
              e.type === 'item' &&
              (normalize(e.filterKey).includes(q) || normalize(e.label).includes(q)),
          )
        },

        command: ({ editor, range, props }) => {
          const item = props as SlashCommandItem
          // IMPORTANT: capture position BEFORE deleting range
          const insertPos = range.from
          editor.chain().deleteRange(range).run()

          switch (item.action.type) {
            case 'panel': {
              editor.chain().focus().insertContentAt(insertPos, {
                type: 'panel',
                attrs: { type: item.action.panelType },
                content: [{ type: 'paragraph' }],
              }).run()
              break
            }

            case 'date': {
              // Render a portal-based date picker anchored near the cursor
              const coords = editor.view.coordsAtPos(insertPos)
              const container = document.createElement('div')
              document.body.appendChild(container)

              const cleanup = () => {
                component.destroy()
                container.remove()
              }

              const component = new ReactRenderer(DatePickerOverlay, {
                props: {
                  value: new Date().toISOString().split('T')[0],
                  style: {
                    top: `${coords.bottom + 4}px`,
                    left: `${coords.left}px`,
                    transform: 'none',
                  },
                  onConfirm: (isoDate: string) => {
                    editor.chain().focus().insertContentAt(insertPos, {
                      type: 'date',
                      attrs: { date: isoDate },
                    }).run()
                    cleanup()
                  },
                  onClose: cleanup,
                },
                editor,
              })
              container.appendChild(component.element)
              break
            }

            case 'status': {
              editor.chain().focus().insertContentAt(insertPos, {
                type: 'status',
                attrs: { status: item.action.status, label: item.action.label },
              }).run()
              break
            }

            case 'image': {
              const src = window.prompt('URL da imagem:')
              if (src?.trim()) {
                editor.chain().focus().insertContentAt(insertPos, {
                  type: 'image',
                  attrs: { src: src.trim() },
                }).run()
              }
              break
            }

            case 'video': {
              const src = window.prompt('URL do vídeo:')
              if (src?.trim()) {
                editor.chain().focus().insertContentAt(insertPos, {
                  type: 'video',
                  attrs: { src: src.trim() },
                }).run()
              }
              break
            }

            case 'file': {
              const href = window.prompt('URL do arquivo:')
              if (href?.trim()) {
                let filename = 'arquivo'
                try {
                  filename = decodeURIComponent(
                    new URL(href.trim()).pathname.split('/').pop() || 'arquivo',
                  )
                } catch { /* invalid URL — keep default */ }
                editor.chain().focus().insertContentAt(insertPos, {
                  type: 'fileLink',
                  attrs: { href: href.trim(), filename },
                }).run()
              }
              break
            }
          }
        },

        render: () => {
          let component: ReactRenderer<SlashCommandListHandle>
          let container: HTMLDivElement

          return {
            onStart(props) {
              container = document.createElement('div')
              container.style.position = 'fixed'
              container.style.zIndex = '9999'
              document.body.appendChild(container)

              component = new ReactRenderer(SlashCommandList, {
                props: { items: props.items, command: props.command },
                editor: props.editor,
              })
              container.appendChild(component.element)
              updatePosition(container, props.clientRect)
            },

            onUpdate(props) {
              component.updateProps({ items: props.items, command: props.command })
              updatePosition(container, props.clientRect)
            },

            onKeyDown(props: SuggestionKeyDownProps) {
              if (props.event.key === 'Escape') {
                container.remove()
                return true
              }
              return component.ref?.onKeyDown(props) ?? false
            },

            onExit() {
              container.remove()
              component.destroy()
            },
          }
        },
      }),
    ]
  },
})
```

- [ ] **Step 2: Typecheck**

```bash
cd ~/projecthub/frontend && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors (possibly one warning if `WikiEditor.tsx` hasn't been updated yet — that's OK, fix in next task).

- [ ] **Step 3: Run all wiki tests**

```bash
cd ~/projecthub/frontend && npx vitest run src/features/wiki/ 2>&1
```

Expected: all tests pass (SlashCommandList × 7, MentionList × 4, VideoNode × 4).

- [ ] **Step 4: Commit**

```bash
cd /mnt/d/projecthub && git add frontend/src/features/wiki/extensions/SlashCommand.ts
git commit -m "feat(wiki): rewrite SlashCommand.ts with discriminated-union dispatch and diacritic-aware filter"
```

---

## Chunk 4: WikiEditor Integration

### Task 7: Add new extensions to WikiEditor

**Files:**
- Modify: `frontend/src/features/wiki/WikiEditor.tsx` (lines 4–6 imports + lines 102–119 extensions array)

- [ ] **Step 1: Add imports to WikiEditor.tsx**

After the existing extension imports (after line importing `SlashCommandExtension`), add:

```typescript
import { DateExtension } from './extensions/DateNode'
import { StatusExtension } from './extensions/StatusNode'
import { VideoExtension } from './extensions/VideoNode'
import { FileExtension } from './extensions/FileNode'
```

- [ ] **Step 2: Add extensions to `useEditor` array**

In `WikiEditor.tsx`, find the `extensions` array in `useEditor`. After `SlashCommandExtension`, append:

```typescript
      DateExtension,
      StatusExtension,
      VideoExtension,
      FileExtension,
```

The full extensions array should now end with:
```typescript
      PanelExtension,
      buildMentionExtension(() => membersRef.current),
      SlashCommandExtension,
      DateExtension,
      StatusExtension,
      VideoExtension,
      FileExtension,
```

- [ ] **Step 3: Typecheck**

```bash
cd ~/projecthub/frontend && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 4: Run all wiki tests**

```bash
cd ~/projecthub/frontend && npx vitest run src/features/wiki/ 2>&1
```

Expected: all 15 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /mnt/d/projecthub && git add frontend/src/features/wiki/WikiEditor.tsx
git commit -m "feat(wiki): wire DateExtension, StatusExtension, VideoExtension, FileExtension into WikiEditor"
```

---

### Task 8: Sync and smoke test

- [ ] **Step 1: Sync Windows edits to WSL and restart Vite**

```bash
rsync -av /mnt/d/projecthub/frontend/src/ ~/projecthub/frontend/src/
```

If using Docker for the frontend, also rebuild:
```bash
cd ~/projecthub && docker compose build frontend && docker compose up -d frontend
```

- [ ] **Step 2: Smoke test — slash command menu**

1. Open a wiki page in any project
2. Click in the editor, type `/`
3. Verify the popup shows three section headers: **Painéis**, **Conteúdo**, **Mídia**
4. Verify 14 selectable items appear under their correct headers
5. Type `av` → only "Painel Aviso" remains, "Painéis" header still shown, "Conteúdo" and "Mídia" headers disappear
6. Press Escape to close

- [ ] **Step 3: Smoke test — Date command**

1. Type `/data` → "Data" item appears
2. Press Enter → date picker appears near the cursor
3. Select a date and click Confirmar → a date chip appears: `📅 DD/MM/YYYY`
4. Click the chip → picker reappears; change date → chip updates
5. Save (Ctrl+S) and refresh → chip reloads with correct date

- [ ] **Step 4: Smoke test — Status commands**

1. Type `/and` → "Em andamento" appears
2. Press Enter → blue status chip inserted immediately: `Em andamento`
3. Repeat for `/blo` → red "Bloqueado" chip
4. Save and refresh → chips persist with correct style

- [ ] **Step 5: Smoke test — Media commands**

1. Type `/ima` → "Imagem" appears; press Enter → prompt for URL → paste any image URL → image embedded
2. Type `/vid` → "Vídeo" appears; press Enter → prompt for URL → paste a YouTube URL → video iframe embedded
3. Type `/arq` → "Arquivo" appears; press Enter → prompt for URL → paste a file URL → 📎 filename chip appears; click it → opens in new tab
4. Save and refresh → all media nodes persist

- [ ] **Step 6: Smoke test — keyboard nav skips headers**

1. Type `/`
2. Press ArrowDown repeatedly → cursor skips "Painéis" / "Conteúdo" / "Mídia" headers and lands only on item rows
3. Press ArrowUp to go back — same behavior
