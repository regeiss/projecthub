import api from '@/lib/axios'
import type { KeycloakUser, PaginatedResponse, Workspace, WorkspaceMember } from '@/types'

export const workspaceService = {
  list: () =>
    api.get<PaginatedResponse<Workspace>>('/workspaces/').then((r) => r.data.results),

  get: (slug: string) =>
    api.get<Workspace>(`/workspaces/${slug}/`).then((r) => r.data),

  members: (slug: string) =>
    api.get<PaginatedResponse<WorkspaceMember>>(`/workspaces/${slug}/members/`).then((r) => r.data.results),

  create: (data: { name: string; slug?: string }) =>
    api.post<Workspace>('/workspaces/', data).then((r) => r.data),

  updateMemberRole: (slug: string, memberId: string, role: string) =>
    api.patch<WorkspaceMember>(`/workspaces/${slug}/members/${memberId}/`, { role }).then((r) => r.data),

  me: () =>
    api.get<WorkspaceMember>('/auth/me/').then((r) => r.data),

  keycloakUsers: (slug: string, search: string): Promise<KeycloakUser[]> =>
    api
      .get<KeycloakUser[]>(`/workspaces/${slug}/keycloak-users/`, { params: { search } })
      .then((r) => r.data),

  addMember: (
    slug: string,
    data: { keycloakSub: string; email: string; name: string; role: string },
  ): Promise<WorkspaceMember> =>
    api
      .post<WorkspaceMember>(`/workspaces/${slug}/members/create/`, {
        keycloak_sub: data.keycloakSub,
        email: data.email,
        name: data.name,
        role: data.role,
      })
      .then((r) => r.data),
}
