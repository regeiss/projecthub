// frontend/src/features/wiki/MentionList.tsx
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'
import type { ProjectMember } from '@/types'

export interface MentionListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

interface MentionListProps {
  items: ProjectMember[]
  command: (props: { id: string; label: string }) => void
}

export const MentionList = forwardRef<MentionListHandle, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => setSelectedIndex(0), [items])

    function selectItem(index: number) {
      const item = items[index]
      if (item) command({ id: item.memberId, label: item.memberName })
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex(i => (i + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex(i => (i + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) return null

    return (
      <div className="min-w-[200px] overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-md">
        {items.slice(0, 8).map((item, index) => (
          <button
            key={item.memberId}
            type="button"
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left ${
              index === selectedIndex
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => selectItem(index)}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {item.memberName[0]?.toUpperCase() ?? '?'}
            </span>
            <span className="truncate">{item.memberName}</span>
          </button>
        ))}
      </div>
    )
  },
)
MentionList.displayName = 'MentionList'
