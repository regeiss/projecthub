import api from '@/lib/axios'
import type { CpmBaseline, CpmIssueData, CpmResult, GanttTask, PaginatedResponse } from '@/types'

interface ReactFlowGraph {
  nodes: Record<string, unknown>[]
  edges: Record<string, unknown>[]
}

export const cpmService = {
  data: (projectId: string) =>
    api.get<PaginatedResponse<CpmIssueData>>(`/cpm/projects/${projectId}/`).then((r) => r.data),

  calculate: (projectId: string) =>
    api.post<CpmResult>(`/cpm/projects/${projectId}/calculate/`).then((r) => r.data),

  network: (projectId: string) =>
    api.get<ReactFlowGraph>(`/cpm/projects/${projectId}/network/`).then((r) => r.data),

  gantt: (projectId: string) =>
    api.get<{ tasks: Record<string, unknown>[] }>(`/cpm/projects/${projectId}/gantt/`).then((r) =>
      r.data.tasks.map((t): GanttTask => ({
        id:            t.id as string,
        name:          t.name as string,
        start:         t.start as string,
        end:           t.end as string,
        progress:      t.progress as number,
        isCritical:    t.is_critical as boolean,
        slack:         t.slack as number,
        dependencies:  t.dependencies as string,
        assigneeName:  (t.assignee_name as string) ?? null,
        assigneeAvatar:(t.assignee_avatar as string) ?? null,
        stateName:     (t.state_name as string) ?? null,
        stateColor:    (t.state_color as string) ?? null,
      }))
    ),

  updateDuration: (projectId: string, issueId: string, durationDays: number) =>
    api.patch<CpmIssueData>(`/cpm/projects/${projectId}/issues/${issueId}/`, {
      duration_days: durationDays,
    }).then((r) => r.data),

  baselines: (projectId: string) =>
    api.get<CpmBaseline[]>(`/cpm/projects/${projectId}/baselines/`).then((r) => r.data),

  createBaseline: (projectId: string, name: string) =>
    api.post<CpmBaseline>(`/cpm/projects/${projectId}/baselines/`, { name }).then((r) => r.data),

  deleteBaseline: (projectId: string, baselineId: string) =>
    api.delete(`/cpm/projects/${projectId}/baselines/${baselineId}/`),
}
