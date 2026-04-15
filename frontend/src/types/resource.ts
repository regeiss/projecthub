// frontend/src/types/resource.ts

export interface ResourceProfile {
  id: string
  project: string
  member: string
  memberName: string
  memberAvatar: string | null
  dailyRateBrl: string
  createdAt: string
  updatedAt: string
}

export interface MemberCapacity {
  id: string
  member: string
  memberName: string
  year: number
  month: number
  availableDays: number
  note: string | null
}

export interface TimeEntry {
  id: string
  issue: string
  issueTitle: string
  issueSequenceId: number
  projectId: string
  member: string
  memberName: string
  memberAvatar: string | null
  date: string
  hours: number
  description: string | null
  createdAt: string
}

export interface MemberWorkload {
  memberId: string
  memberName: string
  memberAvatar: string | null
  availableDays: number | null
  plannedDays: number
  actualDays: number
  utilizationPct: number | null
  dailyRateBrl: string | null
  plannedCost: number | null
  actualCost: number | null
}

export interface CreateResourceProfileDto {
  project: string
  member: string
  dailyRateBrl: string
}

export interface CreateTimeEntryDto {
  issue: string
  member: string
  date: string
  hours: number
  description?: string
}

export interface UpsertCapacityDto {
  member: string
  year: number
  month: number
  availableDays: number
  note?: string
}

export interface WorkloadParams {
  period?: string    // 'YYYY-MM'
  cycleId?: string
}
