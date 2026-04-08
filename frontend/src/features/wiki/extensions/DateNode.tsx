// frontend/src/features/wiki/extensions/DateNode.tsx
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { format, parseISO } from 'date-fns'

// ─── NodeView ─────────────────────────────────────────────────────────────────

function DateNodeView({ node, getPos, editor }: NodeViewProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const dateStr: string = node.attrs.date ?? ''

  // Format for display: ISO string → dd/MM/yyyy
  let displayDate = dateStr
  try {
    if (dateStr) displayDate = format(parseISO(dateStr), 'dd/MM/yyyy')
  } catch {
    displayDate = dateStr
  }

  function handleConfirm(isoDate: string) {
    const pos = getPos()
    if (pos === undefined || editor.isDestroyed) return
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
    if (e.key === 'Enter') { e.preventDefault(); onConfirm(selected) }
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
