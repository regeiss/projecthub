import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'
import { FileText } from 'lucide-react'
import type { WikiPageListItem } from '@/types'

export interface WikiPageLinkListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

interface WikiPageLinkListProps {
  items: WikiPageListItem[]
  command: (page: WikiPageListItem) => void
}

export const WikiPageLinkList = forwardRef<WikiPageLinkListHandle, WikiPageLinkListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => setSelectedIndex(0), [items])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          const item = items[selectedIndex]
          if (item) command(item)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className="min-w-[220px] overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-lg">
          <p className="text-xs text-gray-400 dark:text-gray-500">Nenhuma página encontrada</p>
        </div>
      )
    }

    return (
      <div className="min-w-[220px] max-h-60 overflow-y-auto overflow-x-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg">
        {items.slice(0, 12).map((page, index) => (
          <button
            key={page.id}
            type="button"
            // onMouseDown preventDefault keeps editor focused (no blur → suggestion stays active).
            // onClick fires after mousedown and runs the command.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(page)}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
              index === selectedIndex
                ? 'bg-primary/10 text-primary-text dark:text-primary'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span className="shrink-0 text-base leading-none">
              {page.emoji ?? <FileText className="h-3.5 w-3.5 text-gray-400" />}
            </span>
            <span className="truncate">{page.title}</span>
          </button>
        ))}
      </div>
    )
  },
)
WikiPageLinkList.displayName = 'WikiPageLinkList'
