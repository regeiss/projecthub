import { useState } from 'react'
import { useParams, Outlet } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { useWikiSpaces, useCreateWikiSpace } from '@/hooks/useWiki'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Button } from '@/components/ui/Button'
import { PageTree } from './PageTree'
import { WikiTOC } from './WikiTOC'
import { PageSpinner } from '@/components/ui/Spinner'

export interface WikiOutletContext {
  setEditor: (editor: Editor | null) => void
}

export function WikiLayout() {
  const { projectId = '' } = useParams()
  const { currentProject } = useWorkspaceStore()
  const { data: spaces = [], isLoading } = useWikiSpaces()
  const createSpace = useCreateWikiSpace()
  const [editor, setEditor] = useState<Editor | null>(null)

  const space = spaces.find((s) => s.projectId === projectId)

  if (isLoading) return <PageSpinner />

  if (!space) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30">
          <BookOpen className="h-6 w-6 text-indigo-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Nenhuma wiki ainda
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Crie uma wiki para documentar este projeto
          </p>
        </div>
        {createSpace.isError && (
          <p className="text-xs text-red-500" role="alert">
            Erro ao criar wiki. Tente novamente.
          </p>
        )}
        <Button
          loading={createSpace.isPending}
          onClick={() =>
            createSpace.mutate({
              projectId,
              name: currentProject?.name ?? 'Wiki',
            })
          }
          aria-label="Criar wiki para este projeto"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Criar wiki
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: page tree sidebar */}
      <aside
        className="w-56 shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
        aria-label="Páginas da wiki"
      >
        <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{space.name}</p>
        </div>
        <PageTree spaceId={space.id} />
      </aside>

      {/* Centre: page content */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 min-w-0">
        <Outlet context={{ setEditor } satisfies WikiOutletContext} />
      </main>

      {/* Right: TOC sidebar — hidden below xl breakpoint */}
      <aside
        className="hidden xl:flex w-44 shrink-0 flex-col overflow-y-auto border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-5"
        aria-label="Índice da página"
      >
        <WikiTOC editor={editor} />
      </aside>
    </div>
  )
}
