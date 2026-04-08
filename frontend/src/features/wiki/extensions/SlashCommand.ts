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
