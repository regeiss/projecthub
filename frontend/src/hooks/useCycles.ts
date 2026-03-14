import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cycleService } from '@/services/cycle.service'
import type { Cycle } from '@/types'

export function useCycles(projectId: string) {
  return useQuery({
    queryKey: ['cycles', projectId],
    queryFn: () => cycleService.list(projectId),
    enabled: !!projectId,
  })
}

export function useCycle(projectId: string, cycleId: string) {
  return useQuery({
    queryKey: ['cycle', cycleId],
    queryFn: () => cycleService.get(projectId, cycleId),
    enabled: !!projectId && !!cycleId,
  })
}

export function useCycleProgress(projectId: string, cycleId: string) {
  return useQuery({
    queryKey: ['cycle-progress', cycleId],
    queryFn: () => cycleService.progress(projectId, cycleId),
    enabled: !!projectId && !!cycleId,
  })
}

export function useCreateCycle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: Partial<Cycle> }) =>
      cycleService.create(projectId, data),
    onSuccess: (cycle) => {
      qc.invalidateQueries({ queryKey: ['cycles', cycle.projectId] })
    },
  })
}

export function useUpdateCycle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, cycleId, data }: { projectId: string; cycleId: string; data: Partial<Cycle> }) =>
      cycleService.update(projectId, cycleId, data),
    onSuccess: (cycle) => {
      qc.invalidateQueries({ queryKey: ['cycles', cycle.projectId] })
      qc.invalidateQueries({ queryKey: ['cycle', cycle.id] })
    },
  })
}
