import api from '@/lib/axios'
import type { Cycle, PaginatedResponse } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCycle(raw: any): Cycle {
  return {
    id: raw.id,
    projectId: raw.project,
    name: raw.name,
    description: raw.description ?? null,
    startDate: raw.start_date,
    endDate: raw.end_date,
    status: raw.status,
    issueCount: raw.issue_count,
    completedCount: raw.completed_count,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

function toSnakeCase(data: Partial<Cycle>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (data.name !== undefined) out.name = data.name
  if (data.description !== undefined) out.description = data.description
  if (data.startDate !== undefined) out.start_date = data.startDate
  if (data.endDate !== undefined) out.end_date = data.endDate
  if (data.status !== undefined) out.status = data.status
  return out
}

export const cycleService = {
  list: (projectId: string) =>
    api.get<PaginatedResponse<unknown>>(`/projects/${projectId}/cycles/`)
      .then((r) => (r.data.results as unknown[]).map(mapCycle)),

  get: (projectId: string, cycleId: string) =>
    api.get<unknown>(`/projects/${projectId}/cycles/${cycleId}/`).then((r) => mapCycle(r.data)),

  create: (projectId: string, data: Partial<Cycle>) =>
    api.post<unknown>(`/projects/${projectId}/cycles/`, toSnakeCase(data)).then((r) => mapCycle(r.data)),

  update: (projectId: string, cycleId: string, data: Partial<Cycle>) =>
    api.patch<unknown>(`/projects/${projectId}/cycles/${cycleId}/`, toSnakeCase(data)).then((r) => mapCycle(r.data)),

  delete: (projectId: string, cycleId: string) =>
    api.delete(`/projects/${projectId}/cycles/${cycleId}/`),

  progress: (projectId: string, cycleId: string) =>
    api.get(`/projects/${projectId}/cycles/${cycleId}/progress/`).then((r) => r.data),

  addIssue: (cycleId: string, issueId: string) =>
    api.post(`/cycles/${cycleId}/issues/`, { issue_id: issueId }).then((r) => r.data),

  removeIssue: (cycleId: string, issueId: string) =>
    api.delete(`/cycles/${cycleId}/issues/${issueId}/`),
}
