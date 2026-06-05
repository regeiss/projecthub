import api from '@/lib/axios'
import type { AccessRequest, AccessRequestDetail, AdminResolvePayload } from '@/types/accessRequest'
import type { PaginatedResponse } from '@/types'

function mapAccessRequest(raw: Record<string, unknown>): AccessRequest {
  return {
    id: raw.id as string,
    status: raw.status as AccessRequest['status'],
    workspaceName: (raw.workspace_name ?? raw.workspaceName) as string,
    denialReason: (raw.denial_reason ?? raw.denialReason ?? '') as string,
    requestedAt: (raw.requested_at ?? raw.requestedAt) as string,
    resolvedAt: (raw.resolved_at ?? raw.resolvedAt ?? null) as string | null,
  }
}

function mapAccessRequestDetail(raw: Record<string, unknown>): AccessRequestDetail {
  return {
    ...mapAccessRequest(raw),
    keycloakSub: (raw.keycloak_sub ?? raw.keycloakSub) as string,
    email: raw.email as string,
    name: raw.name as string,
    workspace: (raw.workspace ?? null) as string | null,
    secretaria: raw.secretaria as string,
    reason: (raw.reason ?? '') as string,
    resolvedBy: (raw.resolved_by ?? raw.resolvedBy ?? null) as string | null,
    previousDenialCount: (raw.previous_denial_count ?? raw.previousDenialCount ?? 0) as number,
  }
}

export const accessRequestService = {
  submit: (data: {
    workspaceId?: string
    workspaceName: string
    secretaria: string
    reason?: string
  }) =>
    api
      .post<Record<string, unknown>>('/auth/access-requests/', {
        workspace_id: data.workspaceId,
        workspace_name: data.workspaceName,
        secretaria: data.secretaria,
        reason: data.reason ?? '',
      })
      .then((r) => mapAccessRequest(r.data)),

  getMyStatus: () =>
    api
      .get<Record<string, unknown>>('/auth/access-requests/me/')
      .then((r) => mapAccessRequest(r.data)),

  listForWorkspace: (slug: string, status = 'pending') =>
    api
      .get<PaginatedResponse<Record<string, unknown>>>(
        `/workspaces/${slug}/access-requests/`,
        { params: { status } },
      )
      .then((r) => ({
        ...r.data,
        results: r.data.results.map(mapAccessRequestDetail),
      })) as Promise<PaginatedResponse<AccessRequestDetail>>,

  resolve: (slug: string, requestId: string, payload: AdminResolvePayload) =>
    api
      .patch<Record<string, unknown>>(`/workspaces/${slug}/access-requests/${requestId}/`, {
        action: payload.action,
        extra_workspace_ids: payload.extraWorkspaceIds ?? [],
        denial_reason: payload.denialReason ?? '',
        role: payload.role ?? 'member',
      })
      .then((r) => mapAccessRequest(r.data)),
}
