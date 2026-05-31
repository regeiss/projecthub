import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { moduleService } from '@/services/module.service'
import type { Module } from '@/types'

export function useModules(projectId: string) {
  return useQuery({
    queryKey: ['modules', projectId],
    queryFn: () => moduleService.list(projectId),
    enabled: !!projectId,
  })
}

export function useModule(projectId: string, moduleId: string) {
  return useQuery({
    queryKey: ['module', moduleId],
    queryFn: () => moduleService.get(projectId, moduleId),
    enabled: !!projectId && !!moduleId,
  })
}

export function useCreateModule(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Module>) => moduleService.create(projectId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modules', projectId] }),
  })
}

export function useUpdateModule(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: string; data: Partial<Module> }) =>
      moduleService.update(projectId, moduleId, data),
    onSuccess: (mod) => {
      qc.invalidateQueries({ queryKey: ['modules', projectId] })
      qc.invalidateQueries({ queryKey: ['module', mod.id] })
    },
  })
}

export function useDeleteModule(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (moduleId: string) => moduleService.delete(projectId, moduleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modules', projectId] }),
  })
}

export function useAddModuleIssue(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ moduleId, issueId }: { moduleId: string; issueId: string }) =>
      moduleService.addIssue(moduleId, issueId),
    onSuccess: (_data, { moduleId }) => {
      qc.invalidateQueries({ queryKey: ['modules', projectId] })
      qc.invalidateQueries({ queryKey: ['module', moduleId] })
    },
  })
}

export function useRemoveModuleIssue(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ moduleId, issueId }: { moduleId: string; issueId: string }) =>
      moduleService.removeIssue(moduleId, issueId),
    onSuccess: (_data, { moduleId }) => {
      qc.invalidateQueries({ queryKey: ['modules', projectId] })
      qc.invalidateQueries({ queryKey: ['module', moduleId] })
    },
  })
}
