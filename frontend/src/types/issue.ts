export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none'

export interface EpicSummary {
  id: string
  sequenceId: number
  title: string
  color: string | null
}
export type IssueType = 'task' | 'bug' | 'story' | 'epic' | 'subtask'
export type IssueSize = 'xs' | 's' | 'm' | 'l' | 'xl'
export type StateCategory = 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled'

export interface Issue {
  id: string
  sequenceId: number
  projectId: string
  title: string
  description: Record<string, unknown> | null
  stateId: string
  stateName?: string
  stateColor?: string
  stateCategory?: StateCategory
  priority: Priority
  type: IssueType
  assigneeId: string | null
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  reporterId: string
  parentId: string | null
  epicId: string | null
  estimatePoints: number | null
  size: IssueSize | null
  estimateDays: number | null
  cycleId: string | null
  cycleName: string | null
  startDate: string | null
  dueDate: string | null
  completedAt: string | null
  sortOrder: number
  labels?: Array<{ id: string; name: string; color: string }>
  createdAt: string
  updatedAt: string
  cpmSlack: number | null
  isCritical: boolean
  milestoneId: string | null
  milestoneName: string | null
  projectName: string
  subtaskCount: number
  completedSubtaskCount: number
  color: string | null
  childCount: number
  completedCount: number
  epic: EpicSummary | null
}

export interface IssueComment {
  id: string
  authorName: string
  authorAvatar: string | null
  content: Record<string, unknown>
  isEdited: boolean
  createdAt: string
  updatedAt: string
}

export interface IssueActivity {
  id: string
  issueId: string
  actor: { id: string; name: string; avatarUrl: string | null } | null
  verb: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  oldIdentifier: string | null
  newIdentifier: string | null
  createdAt: string
}

export interface IssueAttachment {
  id: string
  issueId: string
  filename: string
  fileSize: number
  mimeType: string
  storagePath: string
  createdAt: string
}

export interface IssueRelation {
  id: string
  issueId: string
  relatedIssueId: string
  relatedIssueTitle: string
  relatedIssueSequenceId: number
  relatedIssueProjectId: string
  relatedIssueProjectName: string
  relationType: string
  lagDays: number
}

export interface CreateIssueDto {
  projectId: string
  title: string
  description?: object | null
  stateId: string
  priority?: Priority
  type?: IssueType
  assigneeId?: string | null
  parentId?: string | null
  epicId?: string | null
  estimatePoints?: number | null
  size?: IssueSize | null
  estimateDays?: number | null
  startDate?: string | null
  dueDate?: string | null
  sortOrder?: number
  milestoneId?: string | null
}

export interface CreateSubtaskDto {
  title: string
  stateId?: string
  priority?: Priority
  assigneeId?: string | null
  description?: object | null
  labelIds?: string[]
}

export interface UpdateIssueDto {
  title?: string
  description?: object | null
  stateId?: string
  priority?: Priority
  type?: IssueType
  assigneeId?: string | null
  epicId?: string | null
  color?: string | null
  estimatePoints?: number | null
  size?: IssueSize | null
  estimateDays?: number | null
  startDate?: string | null
  dueDate?: string | null
  sortOrder?: number
  milestoneId?: string | null
}

export interface IssueFilters {
  stateId?: string
  assigneeId?: string
  priority?: Priority
  type?: IssueType
  cycleId?: string
  moduleId?: string
  search?: string
  page?: number
}
