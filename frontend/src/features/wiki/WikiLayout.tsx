import { useParams, Outlet } from 'react-router-dom'
import { useWikiSpaces, useCreateWikiPage } from '@/hooks/useWiki'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { PageTree } from './PageTree'
import { PageSpinner } from '@/components/ui/Spinner'

export function WikiLayout() {
  const { projectId = '' } = useParams()
  const { workspace } = useWorkspaceStore()
  const { data: spaces = [], isLoading } = useWikiSpaces()

  // Find the space associated with this project (or first space)
  const space = spaces.find((s) => s.projectId === projectId) ?? spaces[0]

  if (isLoading) return <PageSpinner />

  if (!space) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Nenhum espaço wiki criado para este projeto
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Page tree sidebar */}
      <aside className="w-56 shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{space.name}</p>
        </div>
        <PageTree spaceId={space.id} />
      </aside>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
        <Outlet />
      </main>
    </div>
  )
}
