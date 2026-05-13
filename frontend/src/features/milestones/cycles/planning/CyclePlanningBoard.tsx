import { useState } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import {
  useApplySprintPlan,
  useCreateSprintPlanAllocation,
  useCyclePlanning,
  useDeleteSprintPlanAllocation,
  useUpdateSprintPlanAllocation,
  useUpdateSprintPlanMemberCapacities,
} from '@/hooks/useCyclePlanning'
import { useIssues } from '@/hooks/useIssues'
import { useProjectMembers } from '@/hooks/useProjects'
import type { Cycle } from '@/types'
import { ApplySprintPlanModal } from './ApplySprintPlanModal'
import {
  computePlanningSummary,
  groupAllocationsByLane,
  normalizeNonNegativeDays,
  normalizeNonNegativeNumber,
} from './planning-board-state'
import { PlanningMemberColumn } from './PlanningMemberColumn'
import { PlanningSummary } from './PlanningSummary'

interface CyclePlanningBoardProps {
  projectId: string
  cycleId: string
  cycle?: Pick<Cycle, 'id' | 'name' | 'startDate' | 'endDate'>
}

export function CyclePlanningBoard({ projectId, cycleId, cycle }: CyclePlanningBoardProps) {
  const { data: plan, isLoading, isError } = useCyclePlanning(projectId, cycleId)
  const { data: members = [] } = useProjectMembers(projectId)
  const { data: issueData = { results: [] } } = useIssues(projectId, {})
  const applyPlan = useApplySprintPlan(projectId, cycleId)
  const createAllocation = useCreateSprintPlanAllocation(projectId, cycleId)
  const updateAllocation = useUpdateSprintPlanAllocation(projectId, cycleId)
  const deleteAllocation = useDeleteSprintPlanAllocation(projectId, cycleId)
  const updateCapacities = useUpdateSprintPlanMemberCapacities(projectId, cycleId)
  const [applyOpen, setApplyOpen] = useState(false)

  if (isLoading) {
    return <PageSpinner />
  }

  if (isError || !plan) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
        Nao foi possivel carregar o planejamento da sprint.
      </div>
    )
  }

  const allocations = plan.allocations
  const capacities = plan.memberCapacities
  const summary = computePlanningSummary(capacities, allocations)
  const lanes = groupAllocationsByLane(allocations)
  const plannedIssueIds = new Set(allocations.map((allocation) => allocation.issue))
  const backlogIssues = issueData.results.filter((issue) => !plannedIssueIds.has(issue.id))
  const cycleSummary = cycle ?? {
    id: cycleId,
    name: 'Sprint',
    startDate: '',
    endDate: '',
  }
  const applySummary = {
    issuesAddedToCycle: allocations.length,
    assigneeChanges: allocations.filter((row) => row.plannedMember).length,
    estimateDayChanges: allocations.filter((row) => row.plannedDays != null).length,
    estimatePointChanges: allocations.filter((row) => row.plannedStoryPoints != null).length,
  }
  const laneSize = (laneId: string) => {
    if (laneId === 'unassigned') {
      return lanes.unassigned.length
    }

    return (lanes.member[laneId] ?? []).length
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over ? String(event.over.id) : null
    const activeData = event.active.data.current

    if (!overId || !activeData) {
      return
    }

    if (activeData.kind === 'allocation') {
      const allocation = activeData.allocation as (typeof allocations)[number]
      if (overId === 'backlog') {
        deleteAllocation.mutate(allocation.id)
        return
      }

      const nextMemberId = overId === 'unassigned' ? null : overId

      if (allocation.plannedMember === nextMemberId) {
        return
      }

      const nextRank = laneSize(overId)
      updateAllocation.mutate({
        allocationId: allocation.id,
        data: {
          plannedMember: nextMemberId,
          rank: nextRank,
        },
      })
      return
    }

    if (activeData.kind === 'issue' && overId !== 'backlog') {
      const issue = activeData.issue as (typeof backlogIssues)[number]
      const nextRank = laneSize(overId)
      createAllocation.mutate({
        issue: issue.id,
        plannedMember: overId === 'unassigned' ? null : overId,
        plannedDays:
          issue.estimateDays == null ? null : normalizeNonNegativeDays(String(issue.estimateDays)),
        plannedStoryPoints: normalizeNonNegativeNumber(issue.estimatePoints),
        rank: nextRank,
      })
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <PlanningSummary cycle={cycleSummary} plan={plan} summary={summary} />
        <div className="flex justify-end">
          <Button type="button" onClick={() => setApplyOpen(true)}>
            Aplicar plano
          </Button>
        </div>
        <div className="grid gap-4 xl:grid-cols-[320px_repeat(auto-fit,minmax(260px,1fr))]">
          <PlanningMemberColumn
            laneId="backlog"
            title="Backlog"
            subtitle="Issues disponiveis para planejar"
            issues={backlogIssues}
          />
          <PlanningMemberColumn
            laneId="unassigned"
            title="Nao atribuidas"
            subtitle="Itens planejados aguardando definicao de responsavel"
            allocations={lanes.unassigned}
            onChangeAllocationDays={(allocationId, value) =>
              updateAllocation.mutate({ allocationId, data: { plannedDays: value } })
            }
            onChangeAllocationPoints={(allocationId, value) =>
              updateAllocation.mutate({
                allocationId,
                data: { plannedStoryPoints: value },
              })
            }
            onMoveAllocationToBacklog={(allocationId) => deleteAllocation.mutate(allocationId)}
          />
          {members.map((member) => (
            <PlanningMemberColumn
              key={member.memberId}
              laneId={member.memberId}
              title={member.memberName}
              capacity={capacities.find((row) => row.member === member.memberId) ?? null}
              allocations={lanes.member[member.memberId] ?? []}
              overloaded={summary.overloadedMembers.includes(member.memberId)}
              onOverrideSave={(value) =>
                updateCapacities.mutate([{ member: member.memberId, overrideDays: value }])
              }
              isSavingOverride={updateCapacities.isPending}
              onChangeAllocationDays={(allocationId, value) =>
                updateAllocation.mutate({ allocationId, data: { plannedDays: value } })
              }
              onChangeAllocationPoints={(allocationId, value) =>
                updateAllocation.mutate({
                  allocationId,
                  data: { plannedStoryPoints: value },
                })
              }
              onMoveAllocationToBacklog={(allocationId) => deleteAllocation.mutate(allocationId)}
            />
          ))}
        </div>
        <ApplySprintPlanModal
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
          onConfirm={() =>
            applyPlan.mutate(undefined, {
              onSuccess: () => setApplyOpen(false),
            })
          }
          isSubmitting={applyPlan.isPending}
          summary={applySummary}
        />
      </div>
    </DndContext>
  )
}
