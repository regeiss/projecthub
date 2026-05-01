export * from './workspace'
export * from './project'
export * from './issue'
export * from './wiki'
export * from './cpm'
export * from './portfolio'
export * from './milestone'
export * from './risk'
export * from './resource'
export * from './planning'

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Notification {
  id: string
  type: string
  entityType: string
  entityId: string
  title: string
  message: string | null
  actionUrl: string | null
  isRead: boolean
  readAt: string | null
  actor: {
    id: string
    name: string
    avatarUrl: string | null
  } | null
  createdAt: string
}

export interface Cycle {
  id: string
  projectId: string
  name: string
  description: string | null
  startDate: string
  endDate: string
  status: 'draft' | 'active' | 'completed'
  issueCount?: number
  completedCount?: number
  createdAt: string
  updatedAt: string
}

export interface Module {
  id: string
  projectId: string
  name: string
  description: string | null
  status: 'backlog' | 'in-progress' | 'paused' | 'completed' | 'cancelled'
  leadId: string | null
  leadDetail: { id: string; name: string; email: string; avatarUrl: string | null } | null
  startDate: string | null
  targetDate: string | null
  issueCount?: number
  completedCount?: number
  createdAt: string
  updatedAt: string
}
