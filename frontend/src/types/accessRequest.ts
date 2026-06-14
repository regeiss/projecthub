export type AccessRequest = AccessRequestDetail

export interface AccessRequestDetail {
  id: string
  status: 'pending' | 'approved' | 'denied'
  workspaceName: string
  denialReason: string | null
  requestedAt: string
  resolvedAt: string | null
  keycloakSub: string
  email: string
  name: string
  workspace: string
  secretaria: string
  reason: string
  resolvedBy: string | null
  previousDenialCount: number
}

export interface CreateAccessRequestInput {
  secretaria: string
  workspaceName: string
  reason: string
  workspaceId?: string
}

export interface ResolveAccessRequestInput {
  action: 'approve' | 'deny'
  extraWorkspaceIds?: string[]
  role?: 'admin' | 'member' | 'guest'
  denialReason?: string
}
