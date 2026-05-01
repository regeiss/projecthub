import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'
import type { WikiPageListItem } from '@/types'
import type { WikiPageLinkListHandle } from '../WikiPageLinkList'

export interface PageLinkSuggestionState {
  active: boolean
  items: WikiPageListItem[]
  /** The suggestion plugin's lazy rect getter — call it at render time for the current cursor rect */
  getClientRect: (() => DOMRect | null) | null
  /** Document range covering the trigger text ([[…query]) so MiniEditor can delete it directly */
  range: { from: number; to: number } | null
}

export const PAGE_LINK_SUGGESTION_INACTIVE: PageLinkSuggestionState = {
  active: false,
  items: [],
  getClientRect: null,
  range: null,
}

/**
 * Triggered by `[[`.
 *
 * Instead of using ReactRenderer + document.body (which breaks inside Radix
 * Dialog because Radix treats any pointer event on nodes outside the dialog
 * DOM subtree as "click outside"), this extension just updates external React
 * state. MiniEditor renders the dropdown as regular JSX inside its own tree —
 * which IS inside the dialog — so Radix never interferes.
 *
 * @param getPages     Stable callback returning the current page list
 * @param projectId    Used to build href: /projects/{id}/wiki/{pageId}
 * @param onStateChange Called by TipTap suggestion lifecycle events
 * @param getHandle    Returns the WikiPageLinkList ref (for keyboard nav)
 */
export function buildPageLinkExtension(
  getPages: () => WikiPageListItem[],
  projectId: string,
  onStateChange: (state: PageLinkSuggestionState) => void,
  getHandle: () => WikiPageLinkListHandle | null,
) {
  return Extension.create({
    name: 'pageLink',

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: '[[',
          allowSpaces: true,

          items: ({ query }): WikiPageListItem[] => {
            const q = query.toLowerCase()
            return getPages().filter((p) => p.title.toLowerCase().includes(q))
          },

          // command is now unused — MiniEditor handles insertion directly using
          // the stored range, bypassing the suggestion plugin's command wrapper.
          command: () => { /* handled by MiniEditor */ },

          render: () => ({
            onStart(props) {
              onStateChange({
                active: true,
                items: props.items,
                getClientRect: props.clientRect ?? null,
                range: props.range,
              })
            },

            onUpdate(props) {
              onStateChange({
                active: true,
                items: props.items,
                getClientRect: props.clientRect ?? null,
                range: props.range,
              })
            },

            onExit() {
              onStateChange(PAGE_LINK_SUGGESTION_INACTIVE)
            },

            onKeyDown(props: SuggestionKeyDownProps) {
              if (props.event.key === 'Escape') {
                onStateChange(PAGE_LINK_SUGGESTION_INACTIVE)
                return true
              }
              return getHandle()?.onKeyDown(props) ?? false
            },
          }),
        }),
      ]
    },
  })
}
