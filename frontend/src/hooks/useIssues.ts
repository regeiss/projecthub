import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { issueService } from '@/services/issue.service'
import type { IssueFilters } from '@/types'

export function useIssues(projectId: string, filters: IssueFilters = {}) {
  return useQuery({
    queryKey: ['issues', projectId, filters],
    queryFn: () => issueService.list({ ...filters, projectId }),
    enabled: !!projectId,
  })
}

export function useIssue(projectId: string, issueId: string) {
  return useQuery({
    queryKey: ['issue', issueId],
    queryFn: () => issueService.get(issueId),
    enabled: !!issueId,
  })
}

export function useIssueComments(projectId: string, issueId: string) {
  return useQuery({
    queryKey: ['issue-comments', issueId],
    queryFn: () => issueService.comments(issueId),
    enabled: !!issueId,
  })
}

export function useIssueActivities(projectId: string, issueId: string) {
  return useQuery({
    queryKey: ['issue-activities', issueId],
    queryFn: () => issueService.activities(issueId),
    enabled: !!issueId,
  })
}

export function useIssueAttachments(projectId: string, issueId: string) {
  return useQuery({
    queryKey: ['issue-attachments', issueId],
    queryFn: () => issueService.attachments(issueId),
    enabled: !!issueId,
  })
}

export function useCreateIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string
      data: Record<string, unknown>
    }) => {
      const payload: Record<string, unknown> = {
        project: projectId,
        title: data.title,
        priority: data.priority ?? 'none',
      }
      if (data.stateId) payload.state = data.stateId
      if (data.assigneeId) payload.assignee = data.assigneeId
      if (data.description) payload.description = data.description
      if (Array.isArray(data.labelIds) && data.labelIds.length > 0) {
        payload.label_ids = data.labelIds
      }
      return issueService.create(payload as Parameters<typeof issueService.create>[0])
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['issues', projectId] })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      console.error('[useCreateIssue] 400 body:', err?.response?.data)
    },
  })
}

export function useUpdateIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId: _projectId,
      issueId,
      data,
    }: {
      projectId: string
      issueId: string
      data: Record<string, unknown>
    }) => {
      const payload: Record<string, unknown> = {}
      if (data.title !== undefined) payload.title = data.title
      if (data.description !== undefined) payload.description = data.description
      if (data.priority !== undefined) payload.priority = data.priority
      if (data.stateId !== undefined) payload.state = data.stateId
      if (data.assigneeId !== undefined) payload.assignee = data.assigneeId
      if (data.sortOrder !== undefined) payload.sort_order = data.sortOrder
      if (data.estimatePoints !== undefined) payload.estimate_points = data.estimatePoints
      if (data.size !== undefined) payload.size = data.size
      if (data.estimateDays !== undefined) payload.estimate_days = data.estimateDays
      if (data.startDate !== undefined) payload.start_date = data.startDate
      if (data.dueDate !== undefined) payload.due_date = data.dueDate
      if (Array.isArray(data.labelIds)) payload.label_ids = data.labelIds
      // allow direct snake_case passthrough for drag-and-drop
      if (data.state !== undefined) payload.state = data.state
      if (data.sort_order !== undefined) payload.sort_order = data.sort_order
      return issueService.update(issueId, payload as Parameters<typeof issueService.update>[1])
    },
    onSuccess: (issue, { issueId }) => {
      qc.invalidateQueries({ queryKey: ['issues'] })
      qc.invalidateQueries({ queryKey: ['issue', issueId] })
    },
  })
}

export function useDeleteIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId: _projectId,
      issueId,
    }: {
      projectId: string
      issueId: string
    }) => issueService.delete(issueId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issues'] }),
  })
}

export function useAddComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId: _projectId,
      issueId,
      content,
    }: {
      projectId: string
      issueId: string
      content: Record<string, unknown>
    }) => issueService.addComment(issueId, content),
    onSuccess: (_, { issueId }) => {
      qc.invalidateQueries({ queryKey: ['issue-comments', issueId] })
    },
  })
}

export function useUploadAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId: _projectId,
      issueId,
      file,
    }: {
      projectId: string
      issueId: string
      file: File
    }) => issueService.uploadAttachment(issueId, file),
    onSuccess: (_, { issueId }) => {
      qc.invalidateQueries({ queryKey: ['issue-attachments', issueId] })
    },
  })
}
