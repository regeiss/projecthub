import { LayoutGrid, List, Lightbulb, GitBranch } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { PageSpinner } from '@/components/ui/Spinner'
import { useIdeas } from '@/hooks/useDiscovery'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import type { Idea } from '@/types'

import { IdeaBoardView } from './IdeaBoardView'
import { IdeaDrawer } from './IdeaDrawer'
import { IdeaForm } from './IdeaForm'
import { IdeaRoadmapView } from './IdeaRoadmapView'
import { IdeaTableView } from './IdeaTableView'

type ViewMode = 'table' | 'board' | 'roadmap'

export function DiscoveryPage() {
  const { workspace } = useWorkspaceStore()
  const { data: ideas = [], isLoading } = useIdeas(workspace?.id)
  const [viewType, setViewType] = useState<ViewMode>('table')
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)

  if (isLoading) return <PageSpinner />

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* Page header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Descoberta de Produto</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {ideas.length} {ideas.length === 1 ? 'ideia' : 'ideias'} no workspace
            {workspace?.name ? ` ${workspace.name}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-0.5">
            <button
              type="button"
              onClick={() => setViewType('table')}
              aria-label="Visão de tabela"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                viewType === 'table'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              )}
            >
              <List className="h-3.5 w-3.5" />
              tabela
            </button>
            <button
              type="button"
              onClick={() => setViewType('board')}
              aria-label="Visão de quadro"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                viewType === 'board'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              quadro
            </button>
            <button
              type="button"
              onClick={() => setViewType('roadmap')}
              aria-label="Visão de roteiro"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                viewType === 'roadmap'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              )}
            >
              <GitBranch className="h-3.5 w-3.5" />
              roteiro
            </button>
          </div>
        </div>
      </div>

      {/* Create bar */}
      <IdeaForm />

      {/* Idea list */}
      <div className="mt-5">
        {ideas.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-6 text-center">
            <Lightbulb className="h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">Nenhuma ideia ainda</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Clique em "Criar ideia" para registrar a primeira.
            </p>
          </div>
        ) : viewType === 'table' ? (
          <IdeaTableView ideas={ideas} onSelect={setSelectedIdea} />
        ) : viewType === 'board' ? (
          <IdeaBoardView ideas={ideas} onSelect={setSelectedIdea} />
        ) : (
          <IdeaRoadmapView ideas={ideas} onSelect={setSelectedIdea} />
        )}
      </div>

      <IdeaDrawer idea={selectedIdea} onClose={() => setSelectedIdea(null)} />
    </div>
  )
}
