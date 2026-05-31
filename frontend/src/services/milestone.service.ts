import api from '@/lib/axios'
import type { Milestone, MilestoneStatus } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMilestone(raw: any): Milestone {
  return {
    id: raw.id,
    projectId: raw.project,
    name: raw.name,
    description: raw.description ?? null,
    dueDate: raw.due_date ?? null,
    status: raw.status,
    issueCount: raw.issue_count ?? 0,
    completedCount: raw.completed_count ?? 0,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

export const milestoneService = {
  list: (projectId: string) =>
    api.get<{ results: unknown[] }>(`/projects/${projectId}/milestones/`)
      .then((r) => r.data.results.map(mapMilestone)),

  get: (projectId: string, milestoneId: string) =>
    api.get<unknown>(`/projects/${projectId}/milestones/${milestoneId}/`)
      .then((r) => mapMilestone(r.data)),

  create: (projectId: string, data: { name: string; description?: string; dueDate?: string }) =>
    api.post<unknown>(`/projects/${projectId}/milestones/`, {
      name: data.name,
      description: data.description,
      due_date: data.dueDate,
    }).then((r) => mapMilestone(r.data)),

  update: (projectId: string, milestoneId: string, data: { name?: string; description?: string; dueDate?: string | null; status?: MilestoneStatus }) =>
    api.patch<unknown>(`/projects/${projectId}/milestones/${milestoneId}/`, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.dueDate !== undefined && { due_date: data.dueDate }),
      ...(data.status !== undefined && { status: data.status }),
    }).then((r) => mapMilestone(r.data)),

  delete: (projectId: string, milestoneId: string) =>
    api.delete(`/projects/${projectId}/milestones/${milestoneId}/`),
}
