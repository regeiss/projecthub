export type AccessRequestStatus = 'pending' | 'approved' | 'denied'

export interface AccessRequest {
  id: string
  status: AccessRequestStatus
  workspaceName: string
  denialReason: string | null
  requestedAt: string
  resolvedAt: string | null
}

export interface AccessRequestDetail extends AccessRequest {
  keycloakSub: string
  email: string
  name: string
  workspace: string | null
  secretaria: string
  reason: string
  resolvedBy: string | null
  previousDenialCount: number
}

export interface AdminResolvePayload {
  action: 'approve' | 'deny'
  extraWorkspaceIds?: string[]
  denialReason?: string
  role?: 'admin' | 'member' | 'guest'
}
