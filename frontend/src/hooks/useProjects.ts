import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/services/project.service'
import type { Project } from '@/types'

export function useProjects(workspaceId?: string) {
  return useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => projectService.list(),
    enabled: !!workspaceId,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.get(id),
    enabled: !!id,
  })
}

export function useProjectStates(projectId: string) {
  return useQuery({
    queryKey: ['project-states', projectId],
    queryFn: () => projectService.states(projectId),
    enabled: !!projectId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: (data: any) => (Array.isArray(data) ? data : (data?.results ?? [])),
  })
}

export function useProjectLabels(projectId: string) {
  return useQuery({
    queryKey: ['project-labels', projectId],
    queryFn: () => projectService.labels(projectId),
    enabled: !!projectId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: (data: any) => (Array.isArray(data) ? data : (data?.results ?? [])),
  })
}

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectService.members(projectId),
    enabled: !!projectId,
  })
}

export function useAddProjectMember(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      projectService.addMember(projectId, memberId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-members', projectId] }),
  })
}

export function useRemoveProjectMember(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => projectService.removeMember(projectId, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-members', projectId] }),
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      workspaceId: _workspaceId,
      data,
    }: {
      workspaceId: string
      data: Partial<Project>
    }) => projectService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      projectService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', id] })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projectService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
