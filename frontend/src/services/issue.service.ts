import api from '@/lib/axios'
import type {
  CreateIssueDto,
  Issue,
  IssueActivity,
  IssueAttachment,
  IssueComment,
  IssueFilters,
  IssueRelation,
  PaginatedResponse,
  UpdateIssueDto,
} from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapIssue(raw: any): Issue {
  return {
    id: raw.id,
    sequenceId: raw.sequence_id,
    projectId: raw.project,
    title: raw.title,
    description: raw.description ?? null,
    stateId: raw.state,
    stateName: raw.state_name,
    stateColor: raw.state_color,
    stateCategory: raw.state_category,
    priority: raw.priority,
    type: raw.type,
    assigneeId: raw.assignee ?? null,
    assignee: raw.assignee
      ? { id: raw.assignee, name: raw.assignee_name ?? '', avatarUrl: raw.assignee_avatar ?? null }
      : null,
    reporterId: raw.reporter,
    parentId: raw.parent ?? null,
    epicId: raw.epic ?? null,
    estimatePoints: raw.estimate_points ?? null,
    size: raw.size ?? null,
    estimateDays: raw.estimate_days ?? null,
    cycleId: raw.cycle_id ?? null,
    cycleName: raw.cycle_name ?? null,
    startDate: raw.start_date ?? null,
    dueDate: raw.due_date ?? null,
    completedAt: raw.completed_at ?? null,
    sortOrder: raw.sort_order,
    labels: (raw.labels ?? []).map((l: { id: string; name: string; color: string }) => ({
      id: l.id,
      name: l.name,
      color: l.color,
    })),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    cpmSlack: raw.cpm_slack ?? null,
    isCritical: raw.is_critical ?? false,
    milestoneId: raw.milestone ?? null,
    milestoneName: raw.milestone_name ?? null,
    subtaskCount: raw.subtask_count ?? 0,
    completedSubtaskCount: raw.completed_subtask_count ?? 0,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapComment(raw: any): IssueComment {
  return {
    id: raw.id,
    authorName: raw.author_name ?? '',
    authorAvatar: raw.author_avatar ?? null,
    content: raw.content ?? {},
    isEdited: raw.is_edited ?? false,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

export const issueService = {
  list: (filters: IssueFilters & { projectId?: string }) => {
    const { projectId, ...rest } = filters as IssueFilters & { projectId?: string }
    const params: Record<string, unknown> = { ...rest }
    if (projectId) params.project_id = projectId
    return api
      .get<PaginatedResponse<unknown>>('/issues/', { params })
      .then((r) => ({ ...r.data, results: (r.data.results as unknown[]).map(mapIssue) }))
  },

  get: (id: string) =>
    api.get<unknown>(`/issues/${id}/`).then((r) => mapIssue(r.data)),

  create: (data: CreateIssueDto) =>
    api.post<unknown>('/issues/', data).then((r) => mapIssue(r.data)),

  update: (id: string, data: UpdateIssueDto) =>
    api.patch<unknown>(`/issues/${id}/`, data).then((r) => mapIssue(r.data)),

  delete: (id: string) =>
    api.delete(`/issues/${id}/`),

  updateState: (id: string, stateId: string, sortOrder: number) =>
    api.post(`/issues/${id}/update-state/`, { state_id: stateId, sort_order: sortOrder }).then((r) => r.data),

  // Comments
  comments: (issueId: string) =>
    api.get<PaginatedResponse<unknown>>(`/issues/${issueId}/comments/`).then((r) => (r.data.results as unknown[]).map(mapComment)),

  addComment: (issueId: string, content: Record<string, unknown>) =>
    api.post<unknown>(`/issues/${issueId}/comments/`, { content }).then((r) => mapComment(r.data)),

  updateComment: (issueId: string, commentId: string, content: Record<string, unknown>) =>
    api.patch<unknown>(`/issues/${issueId}/comments/${commentId}/`, { content }).then((r) => mapComment(r.data)),

  deleteComment: (issueId: string, commentId: string) =>
    api.delete(`/issues/${issueId}/comments/${commentId}/`),

  // Activities
  activities: (issueId: string, cursor?: string) =>
    api.get<PaginatedResponse<unknown>>(`/issues/${issueId}/activities/`, {
      params: cursor ? { cursor } : {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }).then((r) => (r.data.results as any[]).map((a): IssueActivity => ({
      id: a.id,
      issueId: a.issue,
      actor: a.actor ? { id: a.actor, name: a.actor_name ?? '', avatarUrl: a.actor_avatar ?? null } : null,
      verb: a.verb,
      field: a.field ?? null,
      oldValue: a.old_value ?? null,
      newValue: a.new_value ?? null,
      oldIdentifier: a.old_identifier ?? null,
      newIdentifier: a.new_identifier ?? null,
      createdAt: a.created_at,
    }))),

  // Attachments
  attachments: (issueId: string) =>
    api.get<IssueAttachment[]>(`/issues/${issueId}/attachments/`).then((r) => r.data),

  uploadAttachment: (issueId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<IssueAttachment>(`/issues/${issueId}/attachments/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  deleteAttachment: (issueId: string, attachmentId: string) =>
    api.delete(`/issues/${issueId}/attachments/${attachmentId}/`),

  // Relations
  relations: (issueId: string) =>
    api.get<IssueRelation[]>(`/issues/${issueId}/relations/`).then((r) => r.data),

  addRelation: (issueId: string, relatedIssueId: string, relationType: string, lagDays = 0) =>
    api.post<IssueRelation>(`/issues/${issueId}/relations/`, {
      related_issue_id: relatedIssueId,
      relation_type: relationType,
      lag_days: lagDays,
    }).then((r) => r.data),

  deleteRelation: (issueId: string, relationId: string) =>
    api.delete(`/issues/${issueId}/relations/${relationId}/`),

  // Subtasks
  subtasks: (issueId: string) =>
    api.get<unknown[]>(`/issues/${issueId}/subtasks/`).then((r) => (r.data as unknown[]).map(mapIssue)),

  createSubtask: (issueId: string, data: Record<string, unknown>) =>
    api.post<unknown>(`/issues/${issueId}/subtasks/`, data).then((r) => mapIssue(r.data)),
}
