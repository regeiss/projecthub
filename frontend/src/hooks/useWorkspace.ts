import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workspaceService } from '@/services/workspace.service'

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceService.list(),
  })
}

export function useWorkspaceMembers(slug: string) {
  return useQuery({
    queryKey: ['workspace-members', slug],
    queryFn: () => workspaceService.members(slug),
    enabled: !!slug,
  })
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => workspaceService.me(),
  })
}

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; slug?: string }) => workspaceService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  })
}

export function useUpdateMemberRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, memberId, role }: { slug: string; memberId: string; role: string }) =>
      workspaceService.updateMemberRole(slug, memberId, role),
    onSuccess: (_, { slug }) => {
      qc.invalidateQueries({ queryKey: ['workspace-members', slug] })
    },
  })
}

export function useKeycloakUsers(slug: string, search: string) {
  return useQuery({
    queryKey: ['keycloak-users', slug, search],
    queryFn: () => workspaceService.keycloakUsers(slug, search),
    enabled: !!slug && search.length >= 2,
  })
}

export function useAddWorkspaceMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      slug,
      keycloakSub,
      email,
      name,
      role,
    }: {
      slug: string
      keycloakSub: string
      email: string
      name: string
      role: string
    }) => workspaceService.addMember(slug, { keycloakSub, email, name, role }),
    onSuccess: (_, { slug }) => {
      qc.invalidateQueries({ queryKey: ['workspace-members', slug] })
    },
  })
}
