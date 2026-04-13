import { useRef, useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEpicIssues, useUpdateIssue } from '@/hooks/useIssues'
import { useProjectStates } from '@/hooks/useProjects'
import { issueService } from '@/services/issue.service'
import { PageSpinner } from '@/components/ui/Spinner'
import { Link2, Search } from 'lucide-react'
import type { Issue } from '@/types'

interface Props {
  epicId: string
  projectId: string
}

function groupByState(issues: Issue[]) {
  const map = new Map<string, { stateName: string; stateColor: string; issues: Issue[] }>()
  for (const issue of issues) {
    if (!map.has(issue.stateId)) {
      map.set(issue.stateId, {
        stateName: issue.stateName ?? '',
        stateColor: issue.stateColor ?? '#9ca3af',
        issues: [],
      })
    }
    map.get(issue.stateId)!.issues.push(issue)
  }
  return [...map.values()]
}

export function EpicDetail({ epicId, projectId }: Props) {
  const qc = useQueryClient()
  const { data: issues = [], isLoading } = useEpicIssues(epicId)
  const { data: states = [] } = useProjectStates(projectId)
  const update = useUpdateIssue()

  const [linking, setLinking] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the search input whenever link mode opens
  useEffect(() => {
    if (linking) inputRef.current?.focus()
  }, [linking])

  // Fetch candidate issues when link mode is active
  const { data: candidatesPage, isLoading: loadingCandidates } = useQuery({
    queryKey: ['issues-link-candidates', projectId, search],
    queryFn: () =>
      issueService.list({ projectId, search: search || undefined }),
    enabled: linking,
    staleTime: 30_000,
  })

  // Filter out epics and issues already in THIS epic
  const candidates = (candidatesPage?.results ?? []).filter(
    (issue) => issue.type !== 'epic' && issue.epic?.id !== epicId,
  )

  function handleLink(issue: Issue) {
    update.mutate(
      { projectId, issueId: issue.id, data: { epicId } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['epic-issues', epicId] })
          qc.invalidateQueries({ queryKey: ['epics'] })
          setSearch('')
          setLinking(false)
        },
      },
    )
  }

  function handleCancel() {
    setSearch('')
    setLinking(false)
  }

  if (isLoading) return <PageSpinner />

  const groups = groupByState(issues)

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 pb-1">
      {issues.length === 0 && !linking && (
        <p className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">
          Nenhuma issue nesta épico.
        </p>
      )}

      {groups.map((g) => (
        <div key={g.stateName}>
          <div className="flex items-center gap-1.5 px-4 py-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.stateColor }} />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {g.stateName}
            </span>
          </div>
          {g.issues.map((issue) => (
            <div
              key={issue.id}
              className="flex items-center gap-2 px-6 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
                #{issue.sequenceId}
              </span>
              <span className="truncate">{issue.title}</span>
            </div>
          ))}
        </div>
      ))}

      {/* Link picker */}
      {linking ? (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 rounded-md border border-indigo-300 bg-white dark:bg-gray-900 dark:border-indigo-600 px-2 py-1.5 ring-1 ring-indigo-300 dark:ring-indigo-600">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && handleCancel()}
              placeholder="Buscar issue pelo título..."
              className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
            />
          </div>

          {/* Candidates list */}
          <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
            {loadingCandidates ? (
              <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                Carregando…
              </p>
            ) : candidates.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                {search ? 'Nenhuma issue encontrada.' : 'Nenhuma issue disponível.'}
              </p>
            ) : (
              candidates.slice(0, 20).map((issue) => (
                <button
                  key={issue.id}
                  onClick={() => handleLink(issue)}
                  disabled={update.isPending}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  <span className="font-mono text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    #{issue.sequenceId}
                  </span>
                  <span className="truncate text-gray-700 dark:text-gray-300">{issue.title}</span>
                  {issue.epic && (
                    <span className="ml-auto shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                      épico atual
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          <button
            onClick={handleCancel}
            className="mt-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Cancelar
          </button>
        </div>
      ) : (
        /* Trigger button */
        <button
          onClick={() => setLinking(true)}
          className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <Link2 className="h-3.5 w-3.5" />
          Vincular issue existente
        </button>
      )}
    </div>
  )
}
