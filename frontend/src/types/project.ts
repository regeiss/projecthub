export interface Project {
  id: string
  workspaceId: string
  name: string
  identifier: string
  description: string | null
  icon: string | null
  color: string
  status: 'active' | 'paused' | 'completed' | 'archived'
  isPrivate: boolean
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface ProjectMember {
  id: string
  projectId: string
  memberId: string
  memberName: string
  memberEmail: string
  memberAvatar: string | null
  role: 'admin' | 'member' | 'viewer'
  createdAt: string
}

export interface IssueState {
  id: string
  projectId: string
  name: string
  color: string
  category: 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled'
  sequence: number
  isDefault: boolean
}

export interface Label {
  id: string
  projectId: string
  name: string
  color: string
}
