// frontend/src/hooks/useResources.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { resourceService } from '@/services/resource.service'
import type { CreateResourceProfileDto, CreateTimeEntryDto, TimeReportParams, UpsertCapacityDto, WorkloadParams } from '@/types'
import { useWorkspaceStore } from '@/stores/workspaceStore'

// ---- Profiles ----
export function useResourceProfiles(projectId?: string) {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id ?? null)
  return useQuery({
    queryKey: ['resource-profiles', workspaceId, projectId],
    queryFn: () => resourceService.listProfiles(projectId),
  })
}

export function useCreateResourceProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateResourceProfileDto) => resourceService.createProfile(dto),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['resource-profiles', vars.project] })
    },
  })
}

export function useUpdateResourceProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dailyRateBrl }: { id: string; dailyRateBrl: string }) =>
      resourceService.updateProfile(id, dailyRateBrl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resource-profiles'] })
    },
  })
}

// ---- Capacity ----
export function useMemberCapacities(params?: { member?: string; year?: number; month?: number }) {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id ?? null)
  return useQuery({
    queryKey: ['member-capacity', workspaceId, params],
    queryFn: () => resourceService.listCapacity(params),
  })
}

export function useCreateCapacity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpsertCapacityDto) => resourceService.createCapacity(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-capacity'] })
      qc.invalidateQueries({ queryKey: ['workload'] })
    },
  })
}

export function useUpdateCapacity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<UpsertCapacityDto> }) =>
      resourceService.updateCapacity(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-capacity'] })
      qc.invalidateQueries({ queryKey: ['workload'] })
    },
  })
}

// ---- Time Entries ----
export function useTimeEntries(params?: {
  issue?: string; member?: string; project?: string;
  date_from?: string; date_to?: string;
}) {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id ?? null)
  return useQuery({
    queryKey: ['time-entries', workspaceId, params],
    queryFn: () => resourceService.listTimeEntries(params),
  })
}

export function useCreateTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateTimeEntryDto) => resourceService.createTimeEntry(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] })
      qc.invalidateQueries({ queryKey: ['workload'] })
    },
  })
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => resourceService.deleteTimeEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] })
      qc.invalidateQueries({ queryKey: ['workload'] })
    },
  })
}

// ---- Workload ----
export function useWorkload(params: WorkloadParams) {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id ?? null)
  return useQuery({
    queryKey: ['workload', 'workspace', workspaceId, params],
    queryFn: () => resourceService.getWorkload(params),
  })
}

export function useProjectWorkload(projectId: string, params: WorkloadParams) {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id ?? null)
  return useQuery({
    queryKey: ['workload', 'project', workspaceId, projectId, params],
    queryFn: () => resourceService.getProjectWorkload(projectId, params),
    enabled: !!projectId,
  })
}

// ---- Time Report ----
export function useTimeReport(projectId: string, params: TimeReportParams) {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id ?? null)
  return useQuery({
    queryKey: ['time-report', workspaceId, projectId, params],
    queryFn: () => resourceService.getTimeReport(projectId, params),
    enabled: !!projectId,
  })
}
