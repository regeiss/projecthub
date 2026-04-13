import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useProjectStates } from '@/hooks/useProjects'
import { useIssues, useCreateIssue, useEpics } from '@/hooks/useIssues'
import type { Issue, IssueState } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { PageSpinner } from '@/components/ui/Spinner'
import { PriorityCapsule, SizeCapsule } from '@/components/ui/IssueCapsules'
import { truncate } from '@/lib/utils'
import { EpicBadge } from '@/features/issues/EpicBadge'

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
      <div className="flex flex-1 flex-col truncate px-4 py-2">
        <span className="truncate text-sm text-gray-900 dark:text-gray-100">{issue.title}</span>
        <EpicBadge epic={issue.epic} className="mt-0.5 self-start" />
      </div>
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
  const [groupByEpic, setGroupByEpic] = useState(false)
  const { data: epics = [] } = useEpics(groupByEpic ? projectId : undefined)

  const allIssues: Issue[] = issueData?.results ?? []
  const nonEpicIssues = allIssues.filter((i) => i.type !== 'epic')

  if (loadingStates || loadingIssues) return <PageSpinner />

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Backlog</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setGroupByEpic((v) => !v)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              groupByEpic
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Por épico
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500">{nonEpicIssues.length} issues</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center divide-x divide-gray-300 dark:divide-gray-600 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950">
        <span className="w-20 shrink-0 px-4 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">ID</span>
        <span className="flex-1 px-4 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">Título</span>
        <span className="w-24 shrink-0 px-4 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">Prioridade</span>
        <span className="w-12 shrink-0 px-4 py-1.5" />
      </div>

      {groupByEpic ? (
        <div className="space-y-3 p-3">
          {[
            ...epics.map((epic) => ({
              id: epic.id,
              title: epic.title,
              color: epic.color,
              issues: nonEpicIssues.filter((i) => i.epicId === epic.id),
            })),
            {
              id: null as string | null,
              title: 'Sem épico',
              color: null as string | null,
              issues: nonEpicIssues.filter((i) => !i.epicId),
            },
          ].map((group) => (
            <div
              key={group.id ?? 'no-epic'}
              className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: group.color ?? '#9ca3af' }}
                />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {group.title}
                </span>
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                  {group.issues.length} issue{group.issues.length !== 1 ? 's' : ''}
                </span>
              </div>
              {group.issues.length === 0 ? (
                <p className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                  Nenhuma issue.
                </p>
              ) : (
                group.issues.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} />
                ))
              )}
            </div>
          ))}
        </div>
      ) : (
        states.map((state) => (
          <StateGroup
            key={state.id}
            state={state}
            issues={nonEpicIssues.filter((i) => i.stateId === state.id)}
            projectId={projectId}
          />
        ))
      )}
    </div>
  )
}
