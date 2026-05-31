import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { riskService } from '@/services/risk.service'
import type { CreateRiskDto, UpdateRiskDto } from '@/types'

export function useRisks(projectId: string) {
  return useQuery({
    queryKey: ['risks', projectId],
    queryFn:  () => riskService.list(projectId),
    enabled:  !!projectId,
  })
}

export function useCreateRisk(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRiskDto) => riskService.create(projectId, data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['risks', projectId] }),
  })
}

export function useUpdateRisk(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ riskId, data }: { riskId: string; data: UpdateRiskDto }) =>
      riskService.update(projectId, riskId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', projectId] }),
  })
}

export function useDeleteRisk(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (riskId: string) => riskService.delete(projectId, riskId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['risks', projectId] }),
  })
}
