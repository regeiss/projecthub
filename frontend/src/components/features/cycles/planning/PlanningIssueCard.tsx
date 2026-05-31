import { useEffect, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { SprintPlanAllocation } from '@/types'
import { normalizeNonNegativeDays, normalizeNonNegativeNumber } from './planning-board-state'

interface PlanningIssueCardProps {
  allocation: SprintPlanAllocation
  onChangeDays?: (value: string | null) => void
  onChangePoints?: (value: number | null) => void
  onMoveToBacklog?: () => void
}

export function PlanningIssueCard({
  allocation,
  onChangeDays,
  onChangePoints,
  onMoveToBacklog,
}: PlanningIssueCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: allocation.id,
    data: {
      kind: 'allocation',
      allocationId: allocation.id,
      allocation,
    },
  })
  const [daysValue, setDaysValue] = useState(allocation.plannedDays ?? '')
  const [pointsValue, setPointsValue] = useState(
    allocation.plannedStoryPoints == null ? '' : String(allocation.plannedStoryPoints),
  )

  useEffect(() => {
    setDaysValue(allocation.plannedDays ?? '')
  }, [allocation.plannedDays])

  useEffect(() => {
    setPointsValue(
      allocation.plannedStoryPoints == null ? '' : String(allocation.plannedStoryPoints),
    )
  }, [allocation.plannedStoryPoints])

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
      className={`rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 ${
        isDragging ? 'opacity-70 shadow-lg' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="mt-0.5 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label={`Mover ${allocation.issueTitle}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {allocation.issueTitle}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              #{allocation.issueSequenceId ?? '-'}
            </p>
          </div>
        </div>
        {onMoveToBacklog ? (
          <Button type="button" size="sm" variant="ghost" onClick={onMoveToBacklog}>
            Backlog
          </Button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Input
          label="Dias"
          type="number"
          min="0"
          step="0.5"
          value={daysValue}
          onChange={(event) => setDaysValue(event.target.value)}
          onBlur={() => onChangeDays?.(normalizeNonNegativeDays(daysValue))}
        />
        <Input
          label="Pontos"
          type="number"
          min="0"
          step="1"
          value={pointsValue}
          onChange={(event) => setPointsValue(event.target.value)}
          onBlur={() =>
            onChangePoints?.(
              pointsValue.trim()
                ? normalizeNonNegativeNumber(Number(pointsValue.trim()))
                : null,
            )
          }
        />
      </div>
    </div>
  )
}
