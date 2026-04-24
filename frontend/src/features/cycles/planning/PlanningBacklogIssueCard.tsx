import { useDraggable } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import type { Issue } from '@/types'

interface PlanningBacklogIssueCardProps {
  issue: Issue
}

export function PlanningBacklogIssueCard({ issue }: PlanningBacklogIssueCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `issue:${issue.id}`,
    data: {
      kind: 'issue',
      issue,
    },
  })

  return (
    <div
      ref={setNodeRef}
      style={
        transform
          ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            }
          : undefined
      }
      className={`rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 ${
        isDragging ? 'opacity-70 shadow-lg' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label={`Planejar ${issue.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{issue.title}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>#{issue.sequenceId}</span>
            {issue.estimateDays != null ? <span>{issue.estimateDays}d</span> : null}
            {issue.estimatePoints != null ? <span>{issue.estimatePoints} pts</span> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
