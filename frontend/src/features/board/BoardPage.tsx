import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, MoreHorizontal, EyeOff, Eye, Trash2, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useProjectStates } from '@/hooks/useProjects'
import { useIssues, useUpdateIssue } from '@/hooks/useIssues'
import type { Issue, IssueState } from '@/types'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { PageSpinner } from '@/components/ui/Spinner'
import { PriorityCapsule, SizeCapsule } from '@/components/ui/IssueCapsules'
import { truncate } from '@/lib/utils'
import { BoardFilters } from './BoardFilters'
import { IssueForm } from '../issues/IssueForm'
import { EpicBadge } from '../issues/EpicBadge'
import { useNavigate } from 'react-router-dom'
import { projectService } from '@/services/project.service'

const PRIORITY_LEFT_COLOR: Record<string, string> = {
  urgent: '#ef4444',
  high:   '#f97316',
  medium: '#eab308',
  low:    '#60a5fa',
  none:   '#e5e7eb',
}

// ---------------------------------------------------------------------------
// IssueCard
// ---------------------------------------------------------------------------
function IssueCard({ issue }: { issue: Issue }) {
  const navigate = useNavigate()
  const { projectId } = useParams()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-md border border-gray-200 dark:border-gray-700 border-l-4 bg-white dark:bg-gray-900 p-3 shadow-sm hover:shadow-md active:cursor-grabbing"
      style={{ ...style, borderLeftColor: PRIORITY_LEFT_COLOR[issue.priority] ?? PRIORITY_LEFT_COLOR.none }}
      onClick={() => navigate(`/projects/${projectId}/issues/${issue.id}`, { state: { from: `/projects/${projectId}/board` } })}
    >
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{issue.sequenceId}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
        {truncate(issue.title, 80)}
      </p>
      <EpicBadge epic={issue.epic} className="mb-2" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PriorityCapsule priority={issue.priority} />
          <SizeCapsule size={issue.size} />
          {issue.labels?.map((l) => (
            <span
              key={l.id}
              className="inline-flex h-4 items-center rounded-full px-1.5 text-[10px] font-medium"
              style={{ backgroundColor: l.color + '20', color: l.color }}
            >
              {l.name}
            </span>
          ))}
          {issue.cycleName && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-500"
              aria-label={`Ciclo: ${issue.cycleName}`}
            >
              <RotateCcw className="h-2.5 w-2.5" />
              {truncate(issue.cycleName, 16)}
            </span>
          )}
          {issue.subtaskCount > 0 && (
            <span
              className="text-xs text-gray-400"
              aria-label={`${issue.completedSubtaskCount} de ${issue.subtaskCount} subtarefas concluídas`}
            >
              {issue.completedSubtaskCount}/{issue.subtaskCount}
            </span>
          )}
        </div>
        {issue.assignee && (
          <Avatar src={issue.assignee.avatarUrl} name={issue.assignee.name} size="xs" className="shrink-0" />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ColumnMenu — "···" dropdown
// ---------------------------------------------------------------------------
function ColumnMenu({
  projectId,
  state,
  isFirst,
  isLast,
  isHidden,
  onToggleHide,
  onMoveLeft,
  onMoveRight,
  onDelete,
}: {
  projectId: string
  state: IssueState
  isFirst: boolean
  isLast: boolean
  isHidden: boolean
  onToggleHide: () => void
  onMoveLeft: () => void
  onMoveRight: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  function item(
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    opts: { danger?: boolean; disabled?: boolean; hint?: string } = {},
  ) {
    return (
      <button
        type="button"
        disabled={opts.disabled}
        onClick={() => { onClick(); setOpen(false) }}
        className={[
          'flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors',
          opts.danger
            ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
          opts.disabled ? 'cursor-not-allowed opacity-40' : '',
        ].join(' ')}
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        {opts.hint && <span className="text-xs text-gray-400">{opts.hint}</span>}
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Ações da coluna"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-6 w-6 items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg"
        >
          <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Coluna
          </p>
          {item(
            isHidden ? 'Mostrar coluna' : 'Ocultar coluna',
            isHidden
              ? <Eye className="h-4 w-4 shrink-0" />
              : <EyeOff className="h-4 w-4 shrink-0" />,
            onToggleHide,
          )}
          {item(
            'Excluir coluna',
            <Trash2 className="h-4 w-4 shrink-0" />,
            onDelete,
            { danger: true },
          )}

          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

          <p className="px-3 pt-1 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Posição
          </p>
          {item(
            'Mover à esquerda',
            <ArrowLeft className="h-4 w-4 shrink-0" />,
            onMoveLeft,
            { disabled: isFirst },
          )}
          {item(
            'Mover à direita',
            <ArrowRight className="h-4 w-4 shrink-0" />,
            onMoveRight,
            { disabled: isLast },
          )}
          <div className="pb-1" />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KanbanColumn
// ---------------------------------------------------------------------------
function KanbanColumn({
  projectId,
  state,
  issues,
  isFirst,
  isLast,
  isHidden,
  onAdd,
  onToggleHide,
  onMoveLeft,
  onMoveRight,
  onDelete,
}: {
  projectId: string
  state: IssueState
  issues: Issue[]
  isFirst: boolean
  isLast: boolean
  isHidden: boolean
  onAdd: () => void
  onToggleHide: () => void
  onMoveLeft: () => void
  onMoveRight: () => void
  onDelete: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: state.id })

  if (isHidden) return null

  return (
    <div className="group flex w-72 shrink-0 flex-col gap-2 px-4">
      {/* Column header */}
      <div className="flex items-center gap-1.5 rounded-md px-1 py-1">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: state.color }}
        />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
          {state.name}
        </span>
        <span className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          {issues.length}
        </span>

        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <ColumnMenu
            projectId={projectId}
            state={state}
            isFirst={isFirst}
            isLast={isLast}
            isHidden={isHidden}
            onToggleHide={onToggleHide}
            onMoveLeft={onMoveLeft}
            onMoveRight={onMoveRight}
            onDelete={onDelete}
          />
          <button
            type="button"
            aria-label={`Adicionar issue em ${state.name}`}
            onClick={onAdd}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Issue cards */}
      <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex flex-col gap-2 min-h-[100px] rounded-lg p-2 transition-colors ${
            isOver
              ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-700'
              : 'bg-gray-50 dark:bg-gray-900'
          }`}
        >
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BoardPage
// ---------------------------------------------------------------------------
export function BoardPage() {
  const { projectId = '' } = useParams()
  const qc = useQueryClient()
  const { data: states = [], isLoading: loadingStates } = useProjectStates(projectId)
  const { data: issueData, isLoading: loadingIssues } = useIssues(projectId, {})
  const issues: Issue[] = (issueData?.results ?? []).filter((i) => i.type !== 'epic')
  const updateIssue = useUpdateIssue()

  const [activeIssue, setActiveIssue] = useState<Issue | null>(null)
  const [newIssueStateId, setNewIssueStateId] = useState<string | null>(null)
  const [hiddenStates, setHiddenStates] = useState<Set<string>>(new Set())

  const deleteStateMutation = useMutation({
    mutationFn: (stateId: string) => projectService.deleteState(projectId, stateId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-states', projectId] }),
  })

  const updateStateMutation = useMutation({
    mutationFn: ({ stateId, data }: { stateId: string; data: Partial<IssueState> }) =>
      projectService.updateState(projectId, stateId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-states', projectId] }),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  function getIssuesByState(stateId: string) {
    return issues
      .filter((i) => i.stateId === stateId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveIssue(issues.find((i) => i.id === active.id) ?? null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveIssue(null)
    if (!over) return
    const newStateId =
      states.find((s) => s.id === over.id)?.id ??
      issues.find((i) => i.id === over.id)?.stateId
    const dragged = issues.find((i) => i.id === active.id)
    if (newStateId && newStateId !== dragged?.stateId) {
      updateIssue.mutate({ projectId, issueId: active.id as string, data: { stateId: newStateId } })
    }
  }

  const sortedStates = [...states].sort((a, b) => a.sequence - b.sequence)
  const visibleStates = sortedStates.filter((s) => !hiddenStates.has(s.id))

  function handleMoveLeft(stateId: string) {
    const idx = sortedStates.findIndex((s) => s.id === stateId)
    if (idx <= 0) return
    const prev = sortedStates[idx - 1]
    const cur = sortedStates[idx]
    updateStateMutation.mutate({ stateId: cur.id, data: { sequence: prev.sequence } })
    updateStateMutation.mutate({ stateId: prev.id, data: { sequence: cur.sequence } })
  }

  function handleMoveRight(stateId: string) {
    const idx = sortedStates.findIndex((s) => s.id === stateId)
    if (idx >= sortedStates.length - 1) return
    const next = sortedStates[idx + 1]
    const cur = sortedStates[idx]
    updateStateMutation.mutate({ stateId: cur.id, data: { sequence: next.sequence } })
    updateStateMutation.mutate({ stateId: next.id, data: { sequence: cur.sequence } })
  }

  function handleDelete(stateId: string) {
    if (!confirm('Excluir esta coluna? As issues não serão excluídas.')) return
    deleteStateMutation.mutate(stateId)
  }

  if (loadingStates || loadingIssues) return <PageSpinner />

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2">
        <BoardFilters projectId={projectId} />
      </div>

      <div className="flex flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex divide-x divide-gray-300 dark:divide-gray-700 py-4">
            {sortedStates.map((state, idx) => (
              <KanbanColumn
                key={state.id}
                projectId={projectId}
                state={state}
                issues={getIssuesByState(state.id)}
                isFirst={idx === 0}
                isLast={idx === sortedStates.length - 1}
                isHidden={hiddenStates.has(state.id)}
                onAdd={() => setNewIssueStateId(state.id)}
                onToggleHide={() =>
                  setHiddenStates((prev) => {
                    const next = new Set(prev)
                    next.has(state.id) ? next.delete(state.id) : next.add(state.id)
                    return next
                  })
                }
                onMoveLeft={() => handleMoveLeft(state.id)}
                onMoveRight={() => handleMoveRight(state.id)}
                onDelete={() => handleDelete(state.id)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeIssue && <IssueCard issue={activeIssue} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Quick-add issue for a specific column */}
      {newIssueStateId && (
        <IssueForm
          projectId={projectId}
          open={true}
          onClose={() => setNewIssueStateId(null)}
          defaultStateId={newIssueStateId}
        />
      )}
    </div>
  )
}
