import api from '@/lib/axios'
import type { AccessRequest, AccessRequestDetail, AdminResolvePayload } from '@/types/accessRequest'
import type { PaginatedResponse } from '@/types'

export const accessRequestService = {
  submit: (data: {
    workspaceId?: string
    workspaceName: string
    secretaria: string
    reason?: string
  }) =>
    api
      .post<AccessRequest>('/auth/access-requests/', {
        workspace_id: data.workspaceId,
        workspace_name: data.workspaceName,
        secretaria: data.secretaria,
        reason: data.reason ?? '',
      })
      .then((r) => r.data),

  getMyStatus: () =>
    api.get<AccessRequest>('/auth/access-requests/me/').then((r) => r.data),

  listForWorkspace: (slug: string, status = 'pending') =>
    api
      .get<PaginatedResponse<AccessRequestDetail>>(
        `/workspaces/${slug}/access-requests/`,
        { params: { status } },
      )
      .then((r) => r.data),

  resolve: (slug: string, requestId: string, payload: AdminResolvePayload) =>
    api
      .patch<AccessRequest>(`/workspaces/${slug}/access-requests/${requestId}/`, {
        action: payload.action,
        extra_workspace_ids: payload.extraWorkspaceIds ?? [],
        denial_reason: payload.denialReason ?? '',
        role: payload.role ?? 'member',
      })
      .then((r) => r.data),
}
