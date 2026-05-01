import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cyclePlanningService } from '@/services/cycle-planning.service'
import type { SprintPlanAllocation, UpdateSprintPlanMemberCapacityInput } from '@/types'

export function useCyclePlanning(projectId: string, cycleId: string) {
  return useQuery({
    queryKey: ['cycle-plan', cycleId],
    queryFn: () => cyclePlanningService.get(projectId, cycleId),
    enabled: !!projectId && !!cycleId,
  })
}

export function useUpdateSprintPlanMemberCapacities(projectId: string, cycleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: UpdateSprintPlanMemberCapacityInput[]) =>
      cyclePlanningService.updateMemberCapacities(projectId, cycleId, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cycle-plan', cycleId] })
    },
  })
}

export function useCreateSprintPlanAllocation(projectId: string, cycleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SprintPlanAllocation>) =>
      cyclePlanningService.createAllocation(projectId, cycleId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cycle-plan', cycleId] })
    },
  })
}

export function useUpdateSprintPlanAllocation(projectId: string, cycleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      allocationId,
      data,
    }: {
      allocationId: string
      data: Partial<SprintPlanAllocation>
    }) => cyclePlanningService.updateAllocation(projectId, cycleId, allocationId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cycle-plan', cycleId] })
    },
  })
}

export function useDeleteSprintPlanAllocation(projectId: string, cycleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (allocationId: string) =>
      cyclePlanningService.deleteAllocation(projectId, cycleId, allocationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cycle-plan', cycleId] })
    },
  })
}

export function useApplySprintPlan(projectId: string, cycleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => cyclePlanningService.apply(projectId, cycleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cycle-plan', cycleId] })
      qc.invalidateQueries({ queryKey: ['cycle', cycleId] })
      qc.invalidateQueries({ queryKey: ['cycle-progress', cycleId] })
      qc.invalidateQueries({ queryKey: ['issues', projectId] })
    },
  })
}
