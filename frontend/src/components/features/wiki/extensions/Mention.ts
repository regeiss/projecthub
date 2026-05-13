// frontend/src/features/wiki/extensions/Mention.ts
import TiptapMention from '@tiptap/extension-mention'
import { ReactRenderer } from '@tiptap/react'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'
import { MentionList, type MentionListHandle } from '../MentionList'
import type { ProjectMember } from '@/types'

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

export function buildMentionExtension(getMembers: () => ProjectMember[]) {
  return TiptapMention.configure({
    HTMLAttributes: {
      class:
        'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded px-1 text-sm font-medium not-italic',
    },
    renderLabel({ options, node }) {
      return `${options.suggestion.char}${node.attrs.label}`
    },
    suggestion: {
      items: ({ query }) =>
        getMembers().filter(m =>
          m.memberName.toLowerCase().includes(query.toLowerCase()),
        ),

      render: () => {
        let component: ReactRenderer<MentionListHandle>
        let container: HTMLDivElement

        return {
          onStart(props) {
            container = document.createElement('div')
            container.style.position = 'fixed'
            container.style.zIndex = '9999'
            document.body.appendChild(container)

            component = new ReactRenderer(MentionList, {
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
    },
  })
}
