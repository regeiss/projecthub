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
