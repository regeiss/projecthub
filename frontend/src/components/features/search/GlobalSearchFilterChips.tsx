import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { useWorkspaceMembers } from '@/hooks/useWorkspace'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import type { GlobalSearchFilters } from '@/types/search'
import type { Project, WorkspaceMember } from '@/types'

const DATE_PRESETS = [
  { label: 'Hoje', days: 0 },
  { label: 'Últimos 7 dias', days: 7 },
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Últimos 3 meses', days: 90 },
]

function toIsoDate(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

interface Props {
  filters: GlobalSearchFilters
  onChange: (filters: GlobalSearchFilters) => void
}

type ActiveDropdown = 'project' | 'author' | 'date' | null

export function GlobalSearchFilterChips({ filters, onChange }: Props) {
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const workspace = useWorkspaceStore((s) => s.workspace)

  // useProjects accepts optional workspaceId; service already resolves .results into an array
  const { data: projects = [] } = useProjects(workspace?.id ?? '')
  // useWorkspaceMembers accepts slug; service already resolves .results into an array
  const { data: members = [] } = useWorkspaceMembers(workspace?.slug ?? '')

  useEffect(() => {
    if (!activeDropdown) return
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [activeDropdown])

  const selectedProject = (projects as Project[]).find((p) => p.id === filters.projectId)
  const selectedMember = (members as WorkspaceMember[]).find((m) => m.id === filters.authorId)
  const hasDate = !!filters.dateFrom

  function removeProject() {
    onChange({ ...filters, projectId: undefined })
  }
  function removeAuthor() {
    onChange({ ...filters, authorId: undefined })
  }
  function removeDate() {
    onChange({ ...filters, dateFrom: undefined, dateTo: undefined })
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-1.5 flex-wrap relative"
      role="group"
      aria-label="Filtros de busca ativos"
    >
      {selectedProject && (
        <span className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
          {selectedProject.name}
          <button
            onClick={removeProject}
            aria-label={`Remover filtro de projeto: ${selectedProject.name}`}
            className="hover:text-indigo-900 dark:hover:text-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-full"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      )}

      {selectedMember && (
        <span className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
          {selectedMember.name}
          <button
            onClick={removeAuthor}
            aria-label={`Remover filtro de autor: ${selectedMember.name}`}
            className="hover:text-green-900 dark:hover:text-green-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-full"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      )}

      {hasDate && (
        <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
          Data filtrada
          <button
            onClick={removeDate}
            aria-label="Remover filtro de data"
            className="hover:text-amber-900 dark:hover:text-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-full"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      )}

      {!selectedProject && (
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(activeDropdown === 'project' ? null : 'project')}
            aria-label="Filtrar por projeto"
            aria-expanded={activeDropdown === 'project'}
            aria-haspopup="menu"
            className="text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded-full px-2.5 py-0.5 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            + Projeto
          </button>
          {activeDropdown === 'project' && (
            <div
              role="menu"
              aria-label="Selecionar projeto"
              className="absolute top-full left-0 mt-1 z-[60] min-w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1"
            >
              {(projects as Project[]).map((p) => (
                <button
                  key={p.id}
                  role="menuitem"
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-gray-700"
                  onClick={() => {
                    onChange({ ...filters, projectId: p.id })
                    setActiveDropdown(null)
                  }}
                >
                  {p.name}
                </button>
              ))}
              {projects.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-400" aria-live="polite">
                  Nenhum projeto
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!selectedMember && (
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(activeDropdown === 'author' ? null : 'author')}
            aria-label="Filtrar por autor"
            aria-expanded={activeDropdown === 'author'}
            aria-haspopup="menu"
            className="text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded-full px-2.5 py-0.5 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            + Autor
          </button>
          {activeDropdown === 'author' && (
            <div
              role="menu"
              aria-label="Selecionar autor"
              className="absolute top-full left-0 mt-1 z-[60] min-w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1"
            >
              {(members as WorkspaceMember[]).map((m) => (
                <button
                  key={m.id}
                  role="menuitem"
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-gray-700"
                  onClick={() => {
                    onChange({ ...filters, authorId: m.id })
                    setActiveDropdown(null)
                  }}
                >
                  {m.name}
                </button>
              ))}
              {members.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-400" aria-live="polite">
                  Nenhum membro
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!hasDate && (
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(activeDropdown === 'date' ? null : 'date')}
            aria-label="Filtrar por data"
            aria-expanded={activeDropdown === 'date'}
            aria-haspopup="menu"
            className="text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded-full px-2.5 py-0.5 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            + Data
          </button>
          {activeDropdown === 'date' && (
            <div
              role="menu"
              aria-label="Selecionar período"
              className="absolute top-full left-0 mt-1 z-[60] min-w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1"
            >
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  role="menuitem"
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-gray-700"
                  onClick={() => {
                    const today = new Date().toISOString().slice(0, 10)
                    onChange({ ...filters, dateFrom: toIsoDate(preset.days), dateTo: today })
                    setActiveDropdown(null)
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
