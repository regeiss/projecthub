import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useProjectStates } from '@/hooks/useProjects'
import { useIssues, useCreateIssue } from '@/hooks/useIssues'
import type { Issue, IssueState } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { PageSpinner } from '@/components/ui/Spinner'
import { PriorityCapsule, SizeCapsule } from '@/components/ui/IssueCapsules'
import { truncate } from '@/lib/utils'

function IssueRow({ issue }: { issue: Issue }) {
  const navigate = useNavigate()
  const { projectId } = useParams()

  return (
    <div
      className="flex cursor-pointer items-center divide-x divide-gray-300 dark:divide-gray-600 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
      onClick={() => navigate(`/projects/${projectId}/issues/${issue.id}`, { state: { from: `/projects/${projectId}/backlog` } })}
    >
      <span className="w-20 shrink-0 px-4 py-2 text-xs text-gray-400 dark:text-gray-500">
        {issue.sequenceId}
      </span>
      <p className="flex-1 truncate px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{issue.title}</p>
      <div className="flex w-20 shrink-0 items-center justify-center px-3 py-2">
        <PriorityCapsule priority={issue.priority} />
      </div>
      <div className="flex w-14 shrink-0 items-center justify-center px-3 py-2">
        <SizeCapsule size={issue.size} />
      </div>
      <div className="flex w-12 shrink-0 items-center justify-center px-4 py-2">
        {issue.assignee ? (
          <Avatar src={issue.assignee.avatarUrl} name={issue.assignee.name} size="xs" />
        ) : (
          <span className="h-5 w-5" />
        )}
      </div>
    </div>
  )
}

function StateGroup({
  state,
  issues,
  projectId,
}: {
  state: IssueState
  issues: Issue[]
  projectId: string
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const create = useCreateIssue()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    create.mutate(
      { projectId, data: { title, stateId: state.id, priority: 'none' } },
      {
        onSuccess: () => {
          setTitle('')
          setAdding(false)
        },
      },
    )
  }

  return (
    <div className="mb-2">
      <button
        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
        )}
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: state.color }}
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{state.name}</span>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{issues.length}</span>
      </button>

      {!collapsed && (
        <>
          {issues.map((i) => (
            <IssueRow key={i.id} issue={i} />
          ))}
          {adding ? (
            <form onSubmit={handleAdd} className="flex items-center gap-2 px-4 py-2">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da issue…"
                className="flex-1 text-sm border-0 outline-none bg-transparent"
                onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
              />
              <Button size="sm" type="submit" loading={create.isPending}>
                Salvar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => setAdding(false)}
              >
                ✕
              </Button>
            </form>
          ) : (
            <button
              className="flex w-full items-center gap-2 px-4 py-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              onClick={() => setAdding(true)}
            >
              <Plus className="h-3 w-3" />
              Adicionar issue
            </button>
          )}
        </>
      )}
    </div>
  )
}

export function BacklogPage() {
  const { projectId = '' } = useParams()
  const { data: states = [], isLoading: loadingStates } = useProjectStates(projectId)
  const { data: issueData, isLoading: loadingIssues } = useIssues(projectId, {})
  const issues: Issue[] = issueData?.results ?? []

  if (loadingStates || loadingIssues) return <PageSpinner />

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Backlog</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{issues.length} issues</span>
      </div>

      {/* Column headers */}
      <div className="flex items-center divide-x divide-gray-300 dark:divide-gray-600 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950">
        <span className="w-20 shrink-0 px-4 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">ID</span>
        <span className="flex-1 px-4 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">Título</span>
        <span className="w-24 shrink-0 px-4 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">Prioridade</span>
        <span className="w-12 shrink-0 px-4 py-1.5" />
      </div>

      {states.map((state) => (
        <StateGroup
          key={state.id}
          state={state}
          issues={issues.filter((i) => i.stateId === state.id)}
          projectId={projectId}
        />
      ))}
    </div>
  )
}
