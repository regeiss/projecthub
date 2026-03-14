import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cpmService } from '@/services/cpm.service'

export function useCpmData(projectId: string) {
  return useQuery({
    queryKey: ['cpm-data', projectId],
    queryFn: () => cpmService.data(projectId),
    enabled: !!projectId,
  })
}

export function useCpmNetwork(projectId: string) {
  return useQuery({
    queryKey: ['cpm-network', projectId],
    queryFn: () => cpmService.network(projectId),
    enabled: !!projectId,
  })
}

export function useCpmGantt(projectId: string) {
  return useQuery({
    queryKey: ['cpm-gantt', projectId],
    queryFn: () => cpmService.gantt(projectId),
    enabled: !!projectId,
  })
}

export function useCpmBaselines(projectId: string) {
  return useQuery({
    queryKey: ['cpm-baselines', projectId],
    queryFn: () => cpmService.baselines(projectId),
    enabled: !!projectId,
  })
}

export function useCalculateCpm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) => cpmService.calculate(projectId),
    onSuccess: (_, projectId) => {
      qc.invalidateQueries({ queryKey: ['cpm-data', projectId] })
      qc.invalidateQueries({ queryKey: ['cpm-network', projectId] })
      qc.invalidateQueries({ queryKey: ['cpm-gantt', projectId] })
    },
  })
}

export function useCreateBaseline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, name }: { projectId: string; name: string }) =>
      cpmService.createBaseline(projectId, name),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['cpm-baselines', projectId] })
    },
  })
}
