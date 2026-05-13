// frontend/src/features/wiki/extensions/Panel.tsx
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

export type PanelType = 'info' | 'note' | 'warning' | 'success' | 'tip'

interface PanelConfig {
  icon: string
  borderColor: string
  bgColor: string
  darkBorderClass: string
  darkBgClass: string
}

export const PANEL_CONFIG: Record<PanelType, PanelConfig> = {
  info:    { icon: 'ℹ️', borderColor: '#0052CC', bgColor: '#DEEBFF', darkBorderClass: 'dark:border-blue-500',   darkBgClass: 'dark:bg-blue-900/20'   },
  note:    { icon: '📝', borderColor: '#FF991F', bgColor: '#FFFAE6', darkBorderClass: 'dark:border-yellow-500', darkBgClass: 'dark:bg-yellow-900/20' },
  warning: { icon: '⚠️', borderColor: '#DE350B', bgColor: '#FFEBE6', darkBorderClass: 'dark:border-red-500',    darkBgClass: 'dark:bg-red-900/20'    },
  success: { icon: '✅', borderColor: '#00875A', bgColor: '#E3FCEF', darkBorderClass: 'dark:border-green-500',  darkBgClass: 'dark:bg-green-900/20'  },
  tip:     { icon: '💡', borderColor: '#6554C0', bgColor: '#EAE6FF', darkBorderClass: 'dark:border-purple-500', darkBgClass: 'dark:bg-purple-900/20' },
}

function PanelNodeView({ node }: NodeViewProps) {
  const panelType = (node.attrs.type ?? 'info') as PanelType
  const config = PANEL_CONFIG[panelType] ?? PANEL_CONFIG.info

  return (
    <NodeViewWrapper>
      <div
        className={`not-prose flex gap-3 rounded-r-md p-4 my-2 border-l-4 ${config.darkBorderClass} ${config.darkBgClass}`}
        style={{ borderLeftColor: config.borderColor, backgroundColor: config.bgColor }}
      >
        <span
          className="shrink-0 text-lg leading-tight mt-0.5 select-none"
          contentEditable={false}
        >
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export const PanelExtension = Node.create({
  name: 'panel',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-panel-type'),
        renderHTML: attributes => ({ 'data-panel-type': attributes.type }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-panel-type]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PanelNodeView)
  },
})
