// frontend/src/services/resource.service.ts
import api from '@/lib/axios'
import type {
  CreateResourceProfileDto,
  CreateTimeEntryDto,
  MemberCapacity,
  MemberWorkload,
  ResourceProfile,
  TimeEntry,
  UpsertCapacityDto,
  WorkloadParams,
} from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(r: any): ResourceProfile {
  return {
    id: r.id,
    project: r.project,
    member: r.member,
    memberName: r.member_name,
    memberAvatar: r.member_avatar ?? null,
    dailyRateBrl: r.daily_rate_brl,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCapacity(r: any): MemberCapacity {
  return {
    id: r.id,
    member: r.member,
    memberName: r.member_name,
    year: r.year,
    month: r.month,
    availableDays: parseFloat(r.available_days),
    note: r.note ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTimeEntry(r: any): TimeEntry {
  return {
    id: r.id,
    issue: r.issue,
    issueTitle: r.issue_title,
    issueSequenceId: r.issue_sequence_id,
    projectId: r.project_id,
    member: r.member,
    memberName: r.member_name,
    memberAvatar: r.member_avatar ?? null,
    date: r.date,
    hours: parseFloat(r.hours),
    description: r.description ?? null,
    createdAt: r.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWorkload(r: any): MemberWorkload {
  return {
    memberId: r.member_id,
    memberName: r.member_name,
    memberAvatar: r.member_avatar ?? null,
    availableDays: r.available_days ?? null,
    plannedDays: r.planned_days,
    actualDays: r.actual_days,
    utilizationPct: r.utilization_pct ?? null,
    dailyRateBrl: r.daily_rate_brl ?? null,
    plannedCost: r.planned_cost ?? null,
    actualCost: r.actual_cost ?? null,
  }
}

export const resourceService = {
  // --- ResourceProfile ---
  listProfiles(projectId?: string): Promise<ResourceProfile[]> {
    const params = projectId ? { project: projectId } : {}
    return api.get('/resources/profiles/', { params }).then(r => r.data.map(mapProfile))
  },
  createProfile(dto: CreateResourceProfileDto): Promise<ResourceProfile> {
    return api.post('/resources/profiles/', {
      project: dto.project,
      member: dto.member,
      daily_rate_brl: dto.dailyRateBrl,
    }).then(r => mapProfile(r.data))
  },
  updateProfile(id: string, dailyRateBrl: string): Promise<ResourceProfile> {
    return api.patch(`/resources/profiles/${id}/`, {
      daily_rate_brl: dailyRateBrl,
    }).then(r => mapProfile(r.data))
  },
  deleteProfile(id: string): Promise<void> {
    return api.delete(`/resources/profiles/${id}/`)
  },

  // --- MemberCapacity ---
  listCapacity(params?: { member?: string; year?: number; month?: number }): Promise<MemberCapacity[]> {
    return api.get('/resources/capacity/', { params }).then(r => r.data.map(mapCapacity))
  },
  createCapacity(dto: UpsertCapacityDto): Promise<MemberCapacity> {
    return api.post('/resources/capacity/', {
      member: dto.member,
      year: dto.year,
      month: dto.month,
      available_days: dto.availableDays,
      note: dto.note,
    }).then(r => mapCapacity(r.data))
  },
  updateCapacity(id: string, dto: Partial<UpsertCapacityDto>): Promise<MemberCapacity> {
    const payload: Record<string, unknown> = {}
    if (dto.availableDays !== undefined) payload.available_days = dto.availableDays
    if (dto.note !== undefined) payload.note = dto.note
    return api.patch(`/resources/capacity/${id}/`, payload).then(r => mapCapacity(r.data))
  },

  // --- TimeEntry ---
  listTimeEntries(params?: {
    issue?: string; member?: string; project?: string;
    date_from?: string; date_to?: string;
  }): Promise<TimeEntry[]> {
    return api.get('/resources/time-entries/', { params }).then(r => r.data.map(mapTimeEntry))
  },
  createTimeEntry(dto: CreateTimeEntryDto): Promise<TimeEntry> {
    return api.post('/resources/time-entries/', {
      issue: dto.issue,
      member: dto.member,
      date: dto.date,
      hours: dto.hours,
      description: dto.description,
    }).then(r => mapTimeEntry(r.data))
  },
  deleteTimeEntry(id: string): Promise<void> {
    return api.delete(`/resources/time-entries/${id}/`)
  },

  // --- Workload ---
  getWorkload(params: WorkloadParams): Promise<MemberWorkload[]> {
    const p: Record<string, string> = {}
    if (params.period) p.period = params.period
    if (params.cycleId) p.cycle_id = params.cycleId
    return api.get('/resources/workload/', { params: p }).then(r => r.data.map(mapWorkload))
  },
  getProjectWorkload(projectId: string, params: WorkloadParams): Promise<MemberWorkload[]> {
    const p: Record<string, string> = {}
    if (params.period) p.period = params.period
    if (params.cycleId) p.cycle_id = params.cycleId
    return api
      .get(`/resources/projects/${projectId}/workload/`, { params: p })
      .then(r => r.data.map(mapWorkload))
  },
}
