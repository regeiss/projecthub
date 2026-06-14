import api from '@/lib/axios'
import type { PaginatedResponse } from '@/types'
import type {
  AccessRequestDetail,
  CreateAccessRequestInput,
  ResolveAccessRequestInput,
} from '@/types/accessRequest'

function mapAccessRequest(raw: any): AccessRequestDetail {
  return {
    id: raw.id,
    status: raw.status,
    workspaceName: raw.workspace_name ?? raw.workspaceName ?? '',
    denialReason: raw.denial_reason ?? raw.denialReason ?? null,
    requestedAt: raw.requested_at ?? raw.requestedAt,
    resolvedAt: raw.resolved_at ?? raw.resolvedAt ?? null,
    keycloakSub: raw.keycloak_sub ?? raw.keycloakSub,
    email: raw.email,
    name: raw.name,
    workspace: raw.workspace,
    secretaria: raw.secretaria,
    reason: raw.reason ?? '',
    resolvedBy: raw.resolved_by ?? raw.resolvedBy ?? null,
    previousDenialCount: raw.previous_denial_count ?? raw.previousDenialCount ?? 0,
  }
}

function mapAccessRequestPage(raw: any): PaginatedResponse<AccessRequestDetail> {
  return {
    ...raw,
    results: (raw.results as unknown[]).map(mapAccessRequest),
  }
}

export const accessRequestService = {
  mine: () =>
    api.get<any>('/workspaces/access-requests/me/').then((r) => {
      const data = r.data
      if (Array.isArray(data)) return data.map(mapAccessRequest)
      return (data.results as unknown[]).map(mapAccessRequest)
    }),

  create: (data: CreateAccessRequestInput) =>
    api.post<any>('/workspaces/access-requests/', {
      secretaria: data.secretaria,
      workspace_name: data.workspaceName,
      reason: data.reason,
    }).then((r) => mapAccessRequest(r.data)),

  listForWorkspace: (slug: string, status?: 'pending' | 'approved' | 'denied') =>
    api
      .get<any>(`/workspaces/${slug}/access-requests/`, {
        params: status ? { status } : undefined,
      })
      .then((r) => mapAccessRequestPage(r.data)),

  resolve: (slug: string, requestId: string, payload: ResolveAccessRequestInput) =>
    api
      .post<any>(`/workspaces/${slug}/access-requests/${requestId}/resolve/`, {
        action: payload.action,
        extra_workspace_ids: payload.extraWorkspaceIds,
        role: payload.role,
        denial_reason: payload.denialReason,
      })
      .then((r) => mapAccessRequest(r.data)),

  getMyStatus: async (): Promise<AccessRequestDetail | undefined> => {
    const results = await api.get<any>('/workspaces/access-requests/me/').then((r) => {
      const data = r.data
      if (Array.isArray(data)) return data.map(mapAccessRequest)
      return (data.results as unknown[]).map(mapAccessRequest)
    })
    return results[0]
  },
}
