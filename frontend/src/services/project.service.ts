import api from '@/lib/axios'
import type { IssueState, Label, PaginatedResponse, Project, ProjectMember } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProjectMember(raw: any): ProjectMember {
  const d = raw.member_detail ?? {}
  return {
    id: raw.id,
    memberId: d.id ?? raw.member,
    memberName: d.name ?? '',
    memberEmail: d.email ?? '',
    memberAvatar: d.avatar_url ?? null,
    role: raw.role,
  }
}

export const projectService = {
  list: () =>
    api.get<PaginatedResponse<Project>>('/projects/').then((r) => r.data.results),

  get: (id: string) =>
    api.get<Project>(`/projects/${id}/`).then((r) => r.data),

  create: (data: Partial<Project>) =>
    api.post<Project>('/projects/', data).then((r) => r.data),

  update: (id: string, data: Partial<Project>) =>
    api.patch<Project>(`/projects/${id}/`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/projects/${id}/`),

  members: (projectId: string) =>
    api.get<PaginatedResponse<ProjectMember>>(`/projects/${projectId}/members/`).then((r) => r.data.results.map(mapProjectMember)),

  addMember: (projectId: string, memberId: string, role: string) =>
    api.post<ProjectMember>(`/projects/${projectId}/members/`, { member_id: memberId, role }).then((r) => r.data),

  removeMember: (projectId: string, memberId: string) =>
    api.delete(`/projects/${projectId}/members/${memberId}/`),

  states: (projectId: string) =>
    api.get<PaginatedResponse<IssueState>>(`/projects/${projectId}/states/`).then((r) => r.data.results),

  createState: (projectId: string, data: Partial<IssueState>) =>
    api.post<IssueState>(`/projects/${projectId}/states/`, data).then((r) => r.data),

  updateState: (projectId: string, stateId: string, data: Partial<IssueState>) =>
    api.patch<IssueState>(`/projects/${projectId}/states/${stateId}/`, data).then((r) => r.data),

  deleteState: (projectId: string, stateId: string) =>
    api.delete(`/projects/${projectId}/states/${stateId}/`),

  labels: (projectId: string) =>
    api.get<PaginatedResponse<Label>>(`/projects/${projectId}/labels/`).then((r) => r.data.results),

  createLabel: (projectId: string, data: Partial<Label>) =>
    api.post<Label>(`/projects/${projectId}/labels/`, data).then((r) => r.data),

  deleteLabel: (projectId: string, labelId: string) =>
    api.delete(`/projects/${projectId}/labels/${labelId}/`),
}
