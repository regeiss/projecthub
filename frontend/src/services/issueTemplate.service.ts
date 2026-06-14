import api from '@/lib/axios'

export interface IssueTemplate {
  id: string
  name: string
  titleTemplate: string
  description: Record<string, unknown> | null
  priority: string
  size: string
  createdByName: string | null
  createdAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTemplate(raw: any): IssueTemplate {
  return {
    id: raw.id,
    name: raw.name,
    titleTemplate: raw.title_template,
    description: raw.description ?? null,
    priority: raw.priority,
    size: raw.size,
    createdByName: raw.created_by_name ?? null,
    createdAt: raw.created_at,
  }
}

export const issueTemplateService = {
  list: () =>
    api.get<unknown[]>('/issue-templates/').then((r) => (r.data as unknown[]).map(mapTemplate)),

  create: (data: { name: string; title_template: string; description?: Record<string, unknown> | null; priority?: string; size?: string }) =>
    api.post<unknown>('/issue-templates/', data).then((r) => mapTemplate(r.data)),

  update: (id: string, data: Partial<{ name: string; title_template: string; description: Record<string, unknown> | null; priority: string; size: string }>) =>
    api.patch<unknown>(`/issue-templates/${id}/`, data).then((r) => mapTemplate(r.data)),

  delete: (id: string) =>
    api.delete(`/issue-templates/${id}/`),
}
