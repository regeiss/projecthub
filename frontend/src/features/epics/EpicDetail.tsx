import { useState } from 'react'
import { useEpicIssues, useCreateIssue } from '@/hooks/useIssues'
import { useProjectStates } from '@/hooks/useProjects'
import { PageSpinner } from '@/components/ui/Spinner'
import { Plus } from 'lucide-react'
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
  const { data: issues = [], isLoading } = useEpicIssues(epicId)
  const { data: states = [] } = useProjectStates(projectId)
  const create = useCreateIssue()
  const [addingTitle, setAddingTitle] = useState('')

  const defaultState = states.find((s) => s.category === 'backlog') ?? states[0]

  if (isLoading) return <PageSpinner />

  const groups = groupByState(issues)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addingTitle.trim() || !defaultState) return
    create.mutate(
      {
        projectId,
        data: {
          title: addingTitle.trim(),
          type: 'task',
          stateId: defaultState.id,
          epicId,
        },
      },
      { onSuccess: () => setAddingTitle('') },
    )
  }

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 pb-1">
      {issues.length === 0 && (
        <p className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">
          Nenhuma issue nesta épico.
        </p>
      )}
      {groups.map((g) => (
        <div key={g.stateName}>
          <div className="flex items-center gap-1.5 px-4 py-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.stateColor }} />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{g.stateName}</span>
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
      <form onSubmit={handleAdd} className="flex items-center gap-2 px-4 py-1.5">
        <Plus className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Adicionar issue..."
          value={addingTitle}
          onChange={(e) => setAddingTitle(e.target.value)}
          className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
        />
      </form>
    </div>
  )
}
