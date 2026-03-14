import api from '@/lib/axios'
import type {
  EvmData,
  PaginatedResponse,
  Portfolio,
  PortfolioCostEntry,
  PortfolioDashboardProject,
  PortfolioObjective,
  PortfolioProject,
  RoadmapProject,
} from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapObjective(raw: any): PortfolioObjective {
  return {
    id:           raw.id,
    portfolioId:  raw.portfolio,
    title:        raw.title,
    description:  raw.description ?? null,
    targetValue:  String(raw.target_value ?? raw.targetValue ?? '100'),
    currentValue: String(raw.current_value ?? raw.currentValue ?? '0'),
    unit:         raw.unit ?? null,
    dueDate:      raw.due_date ?? raw.dueDate ?? null,
    progressPct:  raw.progress_pct ?? 0,
    linkedProjects: (raw.linked_projects ?? []).map((p: any) => ({
      project:     p.project,
      projectName: p.project_name,
      weight:      p.weight,
    })),
    createdAt:    raw.created_at,
    updatedAt:    raw.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDashboardProject(raw: any): PortfolioDashboardProject {
  return {
    id:                raw.id,
    portfolioId:       raw.portfolio,
    projectId:         raw.project,
    projectName:       raw.project_name,
    projectIdentifier: raw.project_identifier,
    startDate:         raw.start_date ?? null,
    endDate:           raw.end_date ?? null,
    budgetPlanned:     raw.budget_planned,
    budgetActual:      raw.budget_actual,
    ragStatus:         raw.rag_status,
    ragLabel:          raw.rag_label,
    ragOverride:       raw.rag_override,
    ragNote:           raw.rag_note ?? null,
    createdAt:         raw.created_at,
    updatedAt:         raw.updated_at,
    evm:               raw.evm,
    riskCount:         raw.risk_count         ?? 0,
    criticalRiskCount: raw.critical_risk_count ?? 0,
  }
}

export const portfolioService = {
  list: () =>
    api.get<PaginatedResponse<Portfolio>>('/portfolio/').then((r) => r.data.results),

  get: (id: string) =>
    api.get<Portfolio>(`/portfolio/${id}/`).then((r) => r.data),

  create: (data: Partial<Portfolio>) =>
    api.post<Portfolio>('/portfolio/', data).then((r) => r.data),

  update: (id: string, data: Partial<Portfolio>) =>
    api.patch<Portfolio>(`/portfolio/${id}/`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/portfolio/${id}/`),

  dashboard: (id: string) =>
    api
      .get<{ portfolio: Portfolio; projects: unknown[]; totals: EvmData }>(
        `/portfolio/${id}/dashboard/`,
      )
      .then((r) => ({
        portfolio: r.data.portfolio,
        projects:  r.data.projects.map(mapDashboardProject),
        totals:    r.data.totals,
      })),

  roadmap: (id: string) =>
    api
      .get<{ projects: unknown[]; dependencies: { predecessor_id: string; successor_id: string }[] }>(
        `/portfolio/${id}/roadmap/`,
      )
      .then((r) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        projects: r.data.projects.map((p: any): RoadmapProject => ({
          id:                p.id,
          project:           p.project,
          projectName:       p.project_name,
          projectIdentifier: p.project_identifier,
          projectColor:      p.project_color ?? '#6366f1',
          startDate:         p.start_date ?? null,
          endDate:           p.end_date ?? null,
          ragStatus:         p.rag_status,
          predecessors:      p.predecessors ?? [],
        })),
        dependencies: r.data.dependencies,
      })),

  recalculateRag: (id: string) =>
    api.post(`/portfolio/${id}/recalculate-rag/`).then((r) => r.data),

  // Projects
  projects: (portfolioId: string) =>
    api
      .get<PaginatedResponse<PortfolioProject>>(`/portfolio/${portfolioId}/projects/`)
      .then((r) => r.data.results),

  addProject: (portfolioId: string, data: { project: string; startDate?: string | null; endDate?: string | null; budgetPlanned?: string }) =>
    api
      .post<PortfolioProject>(`/portfolio/${portfolioId}/projects/`, {
        project:        data.project,
        start_date:     data.startDate ?? null,
        end_date:       data.endDate ?? null,
        budget_planned: data.budgetPlanned ?? '0.00',
      })
      .then((r) => r.data),

  updateProject: (portfolioId: string, ppId: string, data: Partial<PortfolioProject> & Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {}
    if (data.startDate !== undefined) payload.start_date = data.startDate
    if (data.endDate !== undefined) payload.end_date = data.endDate
    if (data.budgetPlanned !== undefined) payload.budget_planned = data.budgetPlanned
    if (data.budgetActual !== undefined) payload.budget_actual = data.budgetActual
    if (data.ragStatus !== undefined) payload.rag_status = data.ragStatus
    if (data.ragOverride !== undefined) payload.rag_override = data.ragOverride
    if (data.ragNote !== undefined) payload.rag_note = data.ragNote
    return api.patch<PortfolioProject>(`/portfolio/${portfolioId}/projects/${ppId}/`, payload).then((r) => r.data)
  },

  removeProject: (portfolioId: string, ppId: string) =>
    api.delete(`/portfolio/${portfolioId}/projects/${ppId}/`),

  // Costs
  costs: (portfolioId: string, ppId: string) =>
    api
      .get<PaginatedResponse<PortfolioCostEntry>>(`/portfolio/${portfolioId}/projects/${ppId}/costs/`)
      .then((r) => r.data.results),

  addCost: (portfolioId: string, ppId: string, data: Partial<PortfolioCostEntry>) =>
    api.post<PortfolioCostEntry>(`/portfolio/${portfolioId}/projects/${ppId}/costs/`, data).then((r) => r.data),

  deleteCost: (portfolioId: string, ppId: string, costId: string) =>
    api.delete(`/portfolio/${portfolioId}/projects/${ppId}/costs/${costId}/`),

  // Objectives
  objectives: (portfolioId: string) =>
    api
      .get<PaginatedResponse<unknown>>(`/portfolio/${portfolioId}/objectives/`)
      .then((r) => (r.data.results as unknown[]).map(mapObjective)),

  createObjective: (portfolioId: string, data: Partial<PortfolioObjective>) =>
    api
      .post<unknown>(`/portfolio/${portfolioId}/objectives/`, {
        title:         data.title,
        description:   data.description ?? null,
        target_value:  data.targetValue ?? '100',
        current_value: data.currentValue ?? '0',
        unit:          data.unit ?? null,
        due_date:      data.dueDate ?? null,
      })
      .then((r) => mapObjective(r.data)),

  updateObjective: (portfolioId: string, objId: string, data: Partial<PortfolioObjective>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {}
    if (data.title !== undefined)        payload.title         = data.title
    if (data.description !== undefined)  payload.description   = data.description
    if (data.targetValue !== undefined)  payload.target_value  = data.targetValue
    if (data.currentValue !== undefined) payload.current_value = data.currentValue
    if (data.unit !== undefined)         payload.unit          = data.unit
    if (data.dueDate !== undefined)      payload.due_date      = data.dueDate
    return api.patch<unknown>(`/portfolio/${portfolioId}/objectives/${objId}/`, payload).then((r) => mapObjective(r.data))
  },

  deleteObjective: (portfolioId: string, objId: string) =>
    api.delete(`/portfolio/${portfolioId}/objectives/${objId}/`),
}
