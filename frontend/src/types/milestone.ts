export type MilestoneStatus = 'pending' | 'reached' | 'missed'

export interface Milestone {
  id: string
  projectId: string
  name: string
  description: string | null
  dueDate: string | null
  status: MilestoneStatus
  issueCount: number
  completedCount: number
  createdAt: string
  updatedAt: string
}
