import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Plus, Sparkles } from 'lucide-react'
import { useProjectStates } from '@/hooks/useProjects'
import { useIssues, useCreateIssue, useEpics, useUpdateIssue } from '@/hooks/useIssues'
import type { Issue, IssueState } from '@/types'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { PageSpinner } from '@/components/ui/Spinner'
import { PriorityCapsule, SizeCapsule } from '@/components/ui/IssueCapsules'
import { cn } from '@/lib/utils'
import { EpicBadge } from '@/features/issues/EpicBadge'

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21]

// ---------------------------------------------------------------------------
// PointsCell — inline editable estimate (normal mode)
// ---------------------------------------------------------------------------
function PointsCell({ issue }: { issue: Issue }) {
  const { projectId = '' } = useParams()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(issue.estimatePoints ?? ''))
  const update = useUpdateIssue()

  function save() {
    const pts = parseInt(value)
    update.mutate({
      projectId,
      issueId: issue.id,
      data: { estimatePoints: isNaN(pts) || value === '' ? null : pts },
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') { setValue(String(issue.estimatePoints ?? '')); setEditing(false) }
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-10 rounded border border-primary px-1 text-center text-xs outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      />
    )
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      className={cn(
        'flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold transition-colors',
        issue.estimatePoints != null
          ? 'bg-primary/15 text-primary-text dark:text-primary'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-primary/10 hover:text-primary-text',
      )}
    >
      {issue.estimatePoints ?? '–'}
    </button>
  )
}

// ---------------------------------------------------------------------------
// GroomingChips — Fibonacci chips for fast estimation
// ---------------------------------------------------------------------------
function GroomingChips({ issue }: { issue: Issue }) {
  const { projectId = '' } = useParams()
  const update = useUpdateIssue()

  function pick(pts: number) {
    update.mutate({
      projectId,
      issueId: issue.id,
      data: { estimatePoints: issue.estimatePoints === pts ? null : pts },
    })
  }

  return (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      {FIBONACCI.map((pts) => (
        <button
          key={pts}
          onClick={() => pick(pts)}
          className={cn(
            'flex h-6 w-7 items-center justify-center rounded text-xs font-semibold transition-colors',
            issue.estimatePoints === pts
              ? 'bg-primary text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-primary-light dark:hover:bg-primary/20 hover:text-primary-text dark:hover:text-primary',
          )}
        >
          {pts}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// IssueRow
// ---------------------------------------------------------------------------
function IssueRow({ issue, grooming }: { issue: Issue; grooming: boolean }) {
  const navigate = useNavigate()
  const { projectId } = useParams()

  return (
    <div
      className="flex cursor-pointer items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
      onClick={() =>
        navigate(`/projects/${projectId}/issues/${issue.id}`, {
          state: { from: `/projects/${projectId}/backlog` },
        })
      }
    >
      {/* ID */}
      <span className="w-16 shrink-0 text-xs text-gray-400 dark:text-gray-500">
        #{issue.sequenceId}
      </span>

      {/* Title */}
      <div className="flex flex-1 flex-col truncate">
        <span className="truncate text-sm text-gray-900 dark:text-gray-100">{issue.title}</span>
        <EpicBadge epic={issue.epic} className="mt-0.5 self-start" />
      </div>

      {grooming ? (
        /* Grooming mode: Fibonacci chips front-and-center */
        <GroomingChips issue={issue} />
      ) : (
        /* Normal mode: compact points cell */
        <div className="flex w-10 shrink-0 items-center justify-center">
          <PointsCell issue={issue} />
        </div>
      )}

      {/* Priority */}
      <div className="flex w-16 shrink-0 items-center justify-center">
        <PriorityCapsule priority={issue.priority} />
      </div>

      {/* Size */}
      {!grooming && (
        <div className="flex w-10 shrink-0 items-center justify-center">
          <SizeCapsule size={issue.size} />
        </div>
      )}

      {/* Assignee */}
      <div className="flex w-8 shrink-0 items-center justify-center">
        {issue.assignee ? (
          <Avatar src={issue.assignee.avatarUrl} name={issue.assignee.name} size="xs" />
        ) : (
          <span className="h-5 w-5" />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StateGroup
// ---------------------------------------------------------------------------
function StateGroup({
  state,
  issues,
  projectId,
  grooming,
}: {
  state: IssueState
  issues: Issue[]
  projectId: string
  grooming: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const create = useCreateIssue()

  const totalPoints = issues.reduce((sum, i) => sum + (i.estimatePoints ?? 0), 0)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    create.mutate(
      { projectId, data: { title, stateId: state.id, priority: 'none' } },
      { onSuccess: () => { setTitle(''); setAdding(false) } },
    )
  }

  return (
    <div className="mb-1">
      <button
        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
        )}
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: state.color }} />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{state.name}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{issues.length}</span>
        {totalPoints > 0 && (
          <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary-text dark:text-primary">
            {totalPoints} pts
          </span>
        )}
      </button>

      {!collapsed && (
        <>
          {issues.map((i) => (
            <IssueRow key={i.id} issue={i} grooming={grooming} />
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
              <Button size="sm" type="submit" loading={create.isPending}>Salvar</Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => setAdding(false)}>✕</Button>
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

// ---------------------------------------------------------------------------
// BacklogPage
// ---------------------------------------------------------------------------
export function BacklogPage() {
  const { projectId = '' } = useParams()
  const { data: states = [], isLoading: loadingStates } = useProjectStates(projectId)
  const { data: issueData, isLoading: loadingIssues } = useIssues(projectId, {})
  const [groupByEpic, setGroupByEpic] = useState(false)
  const [grooming, setGrooming] = useState(false)
  const { data: epics = [] } = useEpics(groupByEpic ? projectId : undefined)

  const allIssues: Issue[] = issueData?.results ?? []
  const nonEpicIssues = allIssues.filter((i) => i.type !== 'epic')
  const totalPoints = nonEpicIssues.reduce((sum, i) => sum + (i.estimatePoints ?? 0), 0)
  const estimatedCount = nonEpicIssues.filter((i) => i.estimatePoints != null).length

  if (loadingStates || loadingIssues) return <PageSpinner />

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Backlog</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {nonEpicIssues.length} issues
          </span>
          {totalPoints > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary-text dark:text-primary">
              {totalPoints} pts total · {estimatedCount}/{nonEpicIssues.length} estimadas
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setGroupByEpic((v) => !v)}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors',
              groupByEpic
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            Por épico
          </button>

          <button
            onClick={() => setGrooming((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
              grooming
                ? 'bg-primary text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            <Sparkles className="h-3 w-3" />
            Grooming
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-4 py-1.5">
        <span className="w-16 shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">ID</span>
        <span className="flex-1 text-xs font-medium text-gray-400 dark:text-gray-500">Título</span>
        {grooming ? (
          <span className="text-xs font-medium text-primary">Estimativa (pts)</span>
        ) : (
          <span className="w-10 shrink-0 text-center text-xs font-medium text-gray-400 dark:text-gray-500">Pts</span>
        )}
        <span className="w-16 shrink-0 text-center text-xs font-medium text-gray-400 dark:text-gray-500">Prio.</span>
        {!grooming && (
          <span className="w-10 shrink-0 text-center text-xs font-medium text-gray-400 dark:text-gray-500">Size</span>
        )}
        <span className="w-8 shrink-0" />
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
          ].map((group) => {
            const groupPoints = group.issues.reduce((s, i) => s + (i.estimatePoints ?? 0), 0)
            return (
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
                  {groupPoints > 0 && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary-text dark:text-primary">
                      {groupPoints} pts
                    </span>
                  )}
                </div>
                {group.issues.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">Nenhuma issue.</p>
                ) : (
                  group.issues.map((issue) => (
                    <IssueRow key={issue.id} issue={issue} grooming={grooming} />
                  ))
                )}
              </div>
            )
          })}
        </div>
      ) : (
        states.map((state) => (
          <StateGroup
            key={state.id}
            state={state}
            issues={nonEpicIssues.filter((i) => i.stateId === state.id)}
            projectId={projectId}
            grooming={grooming}
          />
        ))
      )}
    </div>
  )
}
