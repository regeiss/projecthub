import { useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, FileText, Plus } from 'lucide-react'
import { useWikiPages, useCreateWikiPage } from '@/hooks/useWiki'
import type { WikiPageListItem } from '@/types'
import { cn } from '@/lib/utils'

interface PageTreeNodeProps {
  page: WikiPageListItem
  spaceId: string
  depth?: number
}

function PageTreeNode({ page, spaceId, depth = 0 }: PageTreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const { pageId } = useParams()
  const { data: children = [] } = useWikiPages(spaceId, page.id)

  return (
    <div>
      <div
        className="group flex items-center gap-1"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <button
          className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 dark:text-gray-500"
          onClick={() => setExpanded(!expanded)}
        >
          {children.length > 0 ? (
            expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : (
            <FileText className="h-3 w-3" />
          )}
        </button>
        <NavLink
          to={page.id}
          className={({ isActive }) =>
            cn(
              'flex-1 truncate rounded py-0.5 px-1 text-sm transition-colors',
              isActive
                ? 'bg-indigo-50 dark:bg-indigo-900/30 font-medium text-indigo-700 dark:text-indigo-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
            )
          }
        >
          {page.title}
        </NavLink>
      </div>

      {expanded &&
        children.map((child) => (
          <PageTreeNode
            key={child.id}
            page={child}
            spaceId={spaceId}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}

interface PageTreeProps {
  spaceId: string
}

export function PageTree({ spaceId }: PageTreeProps) {
  const { data: rootPages = [] } = useWikiPages(spaceId, null)
  const createPage = useCreateWikiPage()
  const { projectId } = useParams()

  function handleCreate() {
    createPage.mutate({
      spaceId,
      data: { title: 'Nova página', content: {} },
    })
  }

  return (
    <div className="p-2">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Páginas
        </span>
        <button
          onClick={handleCreate}
          className="flex h-5 w-5 items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-400"
          aria-label="Nova página"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {rootPages.map((page) => (
        <PageTreeNode key={page.id} page={page} spaceId={spaceId} />
      ))}
    </div>
  )
}
