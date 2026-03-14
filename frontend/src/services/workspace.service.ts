import api from '@/lib/axios'
import type { PaginatedResponse, Workspace, WorkspaceMember } from '@/types'

export const workspaceService = {
  list: () =>
    api.get<PaginatedResponse<Workspace>>('/workspaces/').then((r) => r.data.results),

  get: (slug: string) =>
    api.get<Workspace>(`/workspaces/${slug}/`).then((r) => r.data),

  members: (slug: string) =>
    api.get<PaginatedResponse<WorkspaceMember>>(`/workspaces/${slug}/members/`).then((r) => r.data.results),

  updateMemberRole: (slug: string, memberId: string, role: string) =>
    api.patch<WorkspaceMember>(`/workspaces/${slug}/members/${memberId}/`, { role }).then((r) => r.data),

  me: () =>
    api.get<WorkspaceMember>('/auth/me/').then((r) => r.data),
}
