// frontend/src/features/wiki/extensions/SlashCommand.ts
import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'
import {
  SlashCommandList,
  SLASH_COMMANDS,
  type SlashCommandListHandle,
} from '../SlashCommandList'

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

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        startOfLine: false,

        items: ({ query }) =>
          SLASH_COMMANDS.filter(
            cmd =>
              cmd.label.toLowerCase().includes(query.toLowerCase()) ||
              cmd.panelType.toLowerCase().includes(query.toLowerCase()),
          ),

        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: 'panel',
              attrs: { type: props.panelType },
              content: [{ type: 'paragraph' }],
            })
            .run()
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
