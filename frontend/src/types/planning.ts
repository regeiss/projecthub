export interface SprintPlanMemberCapacity {
  id: string
  member: string
  memberName: string
  memberAvatar: string | null
  defaultDays: string
  overrideDays: string | null
  note: string | null
}

export interface SprintPlanAllocation {
  id: string
  issue: string
  issueTitle: string
  issueSequenceId: number | null
  plannedMember: string | null
  plannedDays: string | null
  plannedStoryPoints: number | null
  rank: number
  note: string | null
}

export interface SprintPlan {
  id: string
  cycle: string
  status: 'draft' | 'applied'
  appliedAt: string | null
  memberCapacities: SprintPlanMemberCapacity[]
  allocations: SprintPlanAllocation[]
}

export interface UpdateSprintPlanMemberCapacityInput {
  member: string
  overrideDays?: string | null
  note?: string | null
}
