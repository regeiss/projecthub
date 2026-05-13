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
