import api from '@/lib/axios'
import type { Risk, CreateRiskDto, UpdateRiskDto, PaginatedResponse } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRisk(raw: any): Risk {
  return {
    id:              raw.id,
    projectId:       raw.project,
    title:           raw.title,
    description:     raw.description ?? null,
    category:        raw.category,
    probability:     raw.probability,
    impact:          raw.impact,
    score:           raw.score,
    status:          raw.status,
    responseType:    raw.response_type ?? null,
    ownerId:         raw.owner ?? null,
    ownerName:       raw.owner_name ?? null,
    mitigationPlan:  raw.mitigation_plan ?? null,
    contingencyPlan: raw.contingency_plan ?? null,
    dueDate:         raw.due_date ?? null,
    createdAt:       raw.created_at,
    updatedAt:       raw.updated_at,
  }
}

export const riskService = {
  list: (projectId: string, params?: { status?: string; category?: string; score_gte?: number }) =>
    api
      .get<PaginatedResponse<unknown>>(`/projects/${projectId}/risks/`, { params })
      .then((r) => r.data.results.map(mapRisk)),

  get: (projectId: string, riskId: string) =>
    api
      .get<unknown>(`/projects/${projectId}/risks/${riskId}/`)
      .then((r) => mapRisk(r.data)),

  create: (projectId: string, data: CreateRiskDto) =>
    api
      .post<unknown>(`/projects/${projectId}/risks/`, {
        title:            data.title,
        description:      data.description,
        category:         data.category,
        probability:      data.probability,
        impact:           data.impact,
        status:           data.status ?? 'identified',
        response_type:    data.responseType,
        owner:            data.ownerId,
        mitigation_plan:  data.mitigationPlan,
        contingency_plan: data.contingencyPlan,
        due_date:         data.dueDate,
      })
      .then((r) => mapRisk(r.data)),

  update: (projectId: string, riskId: string, data: UpdateRiskDto) =>
    api
      .patch<unknown>(`/projects/${projectId}/risks/${riskId}/`, {
        ...(data.title            !== undefined && { title: data.title }),
        ...(data.description      !== undefined && { description: data.description }),
        ...(data.category         !== undefined && { category: data.category }),
        ...(data.probability      !== undefined && { probability: data.probability }),
        ...(data.impact           !== undefined && { impact: data.impact }),
        ...(data.status           !== undefined && { status: data.status }),
        ...(data.responseType     !== undefined && { response_type: data.responseType }),
        ...(data.ownerId          !== undefined && { owner: data.ownerId }),
        ...(data.mitigationPlan   !== undefined && { mitigation_plan: data.mitigationPlan }),
        ...(data.contingencyPlan  !== undefined && { contingency_plan: data.contingencyPlan }),
        ...(data.dueDate          !== undefined && { due_date: data.dueDate }),
      })
      .then((r) => mapRisk(r.data)),

  delete: (projectId: string, riskId: string) =>
    api.delete(`/projects/${projectId}/risks/${riskId}/`),
}
