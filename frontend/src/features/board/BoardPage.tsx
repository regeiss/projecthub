import { useState } from 'react'
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
import { Plus } from 'lucide-react'
import { useProjectStates } from '@/hooks/useProjects'
import { useIssues, useUpdateIssue } from '@/hooks/useIssues'
import type { Issue, IssueState } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { PageSpinner } from '@/components/ui/Spinner'
import { priorityColor, truncate } from '@/lib/utils'
import { BoardFilters } from './BoardFilters'
import { useNavigate } from 'react-router-dom'

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
      className="cursor-grab rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 shadow-sm hover:shadow-md active:cursor-grabbing"
      onClick={() => navigate(`/projects/${projectId}/issues/${issue.id}`)}
    >
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{issue.sequenceId}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        {truncate(issue.title, 80)}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {issue.priority !== 'none' && (
            <span
              className={`text-xs font-medium ${priorityColor(issue.priority)}`}
            >
              {issue.priority[0].toUpperCase()}
            </span>
          )}
          {issue.labels?.map((l) => (
            <span
              key={l.id}
              className="inline-flex h-4 items-center rounded-full px-1.5 text-[10px] font-medium"
              style={{
                backgroundColor: l.color + '20',
                color: l.color,
              }}
            >
              {l.name}
            </span>
          ))}
        </div>
        {issue.assignee && (
          <Avatar
            src={issue.assignee.avatarUrl}
            name={issue.assignee.name}
            size="xs"
          />
        )}
      </div>
    </div>
  )
}

function KanbanColumn({
  state,
  issues,
}: {
  state: IssueState
  issues: Issue[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: state.id })

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 px-4">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: state.color }}
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{state.name}</span>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{issues.length}</span>
      </div>

      {/* Issue cards */}
      <SortableContext
        items={issues.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`flex flex-col gap-2 min-h-[100px] rounded-lg p-2 transition-colors ${
            isOver ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-700' : 'bg-gray-50 dark:bg-gray-900'
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

export function BoardPage() {
  const { projectId = '' } = useParams()
  const { data: states = [], isLoading: loadingStates } = useProjectStates(projectId)
  const { data: issueData, isLoading: loadingIssues } = useIssues(projectId, {})
  const issues: Issue[] = issueData?.results ?? []
  const updateIssue = useUpdateIssue()

  const [activeIssue, setActiveIssue] = useState<Issue | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  function getIssuesByState(stateId: string) {
    return issues
      .filter((i) => i.stateId === stateId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }

  function handleDragStart({ active }: DragStartEvent) {
    const issue = issues.find((i) => i.id === active.id)
    setActiveIssue(issue ?? null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveIssue(null)
    if (!over) return

    // over.id is either a state.id (dropped on column) or an issue.id (dropped on card)
    const newStateId =
      states.find((s) => s.id === over.id)?.id ??
      issues.find((i) => i.id === over.id)?.stateId

    const dragged = issues.find((i) => i.id === active.id)
    if (newStateId && newStateId !== dragged?.stateId) {
      updateIssue.mutate({
        projectId,
        issueId: active.id as string,
        data: { stateId: newStateId },
      })
    }
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
            {states.map((state) => (
              <KanbanColumn
                key={state.id}
                state={state}
                issues={getIssuesByState(state.id)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeIssue && <IssueCard issue={activeIssue} />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
