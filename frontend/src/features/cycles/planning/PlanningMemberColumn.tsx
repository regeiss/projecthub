import { useDroppable } from '@dnd-kit/core'
import type { Issue, SprintPlanAllocation, SprintPlanMemberCapacity } from '@/types'
import { PlanningBacklogIssueCard } from './PlanningBacklogIssueCard'
import { PlanningIssueCard } from './PlanningIssueCard'
import { SprintCapacityEditor } from './SprintCapacityEditor'

interface PlanningMemberColumnProps {
  laneId: string
  title: string
  subtitle?: string
  capacity?: SprintPlanMemberCapacity | null
  allocations?: SprintPlanAllocation[]
  issues?: Issue[]
  overloaded?: boolean
  onOverrideSave?: (value: string | null) => void
  isSavingOverride?: boolean
  onChangeAllocationDays?: (allocationId: string, value: string | null) => void
  onChangeAllocationPoints?: (allocationId: string, value: number | null) => void
  onMoveAllocationToBacklog?: (allocationId: string) => void
}

export function PlanningMemberColumn({
  laneId,
  title,
  subtitle,
  capacity = null,
  allocations = [],
  issues = [],
  overloaded = false,
  onOverrideSave,
  isSavingOverride = false,
  onChangeAllocationDays,
  onChangeAllocationPoints,
  onMoveAllocationToBacklog,
}: PlanningMemberColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: laneId })

  return (
    <section
      ref={setNodeRef}
      aria-label={title}
      className={`min-h-[220px] space-y-3 rounded-lg border p-4 ${
        isOver
          ? 'border-indigo-400 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/30'
          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-950/40'
      }`}
      data-lane-id={laneId}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
          {subtitle ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          ) : null}
        </div>
        {capacity ? (
          <div
            className={`rounded-md px-2 py-1 text-xs ${
              overloaded
                ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-white text-gray-600 dark:bg-gray-900 dark:text-gray-300'
            }`}
          >
            {capacity.overrideDays ?? capacity.defaultDays}d
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        {capacity && onOverrideSave ? (
          <SprintCapacityEditor
            capacity={capacity}
            onSave={onOverrideSave}
            isSaving={isSavingOverride}
          />
        ) : null}

        {allocations.map((allocation) => (
          <PlanningIssueCard
            key={allocation.id}
            allocation={allocation}
            onChangeDays={(value) => onChangeAllocationDays?.(allocation.id, value)}
            onChangePoints={(value) => onChangeAllocationPoints?.(allocation.id, value)}
            onMoveToBacklog={
              laneId === 'backlog' ? undefined : () => onMoveAllocationToBacklog?.(allocation.id)
            }
          />
        ))}

        {issues.map((issue) => (
          <PlanningBacklogIssueCard key={issue.id} issue={issue} />
        ))}

        {allocations.length === 0 && issues.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
            Sem itens neste momento
          </p>
        ) : null}
      </div>
    </section>
  )
}
