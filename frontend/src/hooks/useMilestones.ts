import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { milestoneService } from '@/services/milestone.service'
import type { MilestoneStatus } from '@/types'

export function useMilestones(projectId: string) {
  return useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => milestoneService.list(projectId),
    enabled: !!projectId,
  })
}

export function useCreateMilestone(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string; dueDate?: string }) =>
      milestoneService.create(projectId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['milestones', projectId] }),
  })
}

export function useUpdateMilestone(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ milestoneId, data }: { milestoneId: string; data: { name?: string; description?: string; dueDate?: string | null; status?: MilestoneStatus } }) =>
      milestoneService.update(projectId, milestoneId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['milestones', projectId] }),
  })
}

export function useDeleteMilestone(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (milestoneId: string) => milestoneService.delete(projectId, milestoneId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['milestones', projectId] }),
  })
}
