import api from '@/lib/axios'
import type { Module, PaginatedResponse } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapModule(raw: any): Module {
  return {
    id: raw.id,
    projectId: raw.project,
    name: raw.name,
    description: raw.description ?? null,
    status: raw.status,
    leadId: raw.lead ?? null,
    leadDetail: raw.lead_detail ?? null,
    startDate: raw.start_date ?? null,
    targetDate: raw.target_date ?? null,
    issueCount: raw.issue_count ?? 0,
    completedCount: raw.completed_count ?? 0,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

function toSnakeCase(data: Partial<Module>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (data.name !== undefined) out.name = data.name
  if (data.description !== undefined) out.description = data.description
  if (data.status !== undefined) out.status = data.status
  if (data.leadId !== undefined) out.lead = data.leadId
  if (data.startDate !== undefined) out.start_date = data.startDate
  if (data.targetDate !== undefined) out.target_date = data.targetDate
  return out
}

export const moduleService = {
  list: (projectId: string) =>
    api
      .get<PaginatedResponse<unknown>>(`/projects/${projectId}/modules/`)
      .then((r) => (r.data.results as unknown[]).map(mapModule)),

  get: (projectId: string, moduleId: string) =>
    api
      .get<unknown>(`/projects/${projectId}/modules/${moduleId}/`)
      .then((r) => mapModule(r.data)),

  create: (projectId: string, data: Partial<Module>) =>
    api
      .post<unknown>(`/projects/${projectId}/modules/`, toSnakeCase(data))
      .then((r) => mapModule(r.data)),

  update: (projectId: string, moduleId: string, data: Partial<Module>) =>
    api
      .patch<unknown>(`/projects/${projectId}/modules/${moduleId}/`, toSnakeCase(data))
      .then((r) => mapModule(r.data)),

  delete: (projectId: string, moduleId: string) =>
    api.delete(`/projects/${projectId}/modules/${moduleId}/`),

  addIssue: (moduleId: string, issueId: string) =>
    api.post(`/modules/${moduleId}/issues/`, { issue_id: issueId }).then((r) => r.data),

  removeIssue: (moduleId: string, issueId: string) =>
    api.delete(`/modules/${moduleId}/issues/${issueId}/`),
}
