import api from '@/lib/axios'
import type {
  SprintPlan,
  SprintPlanAllocation,
  SprintPlanMemberCapacity,
  UpdateSprintPlanMemberCapacityInput,
} from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMemberCapacity(raw: any): SprintPlanMemberCapacity {
  return {
    id: raw.id,
    member: raw.member,
    memberName: raw.member_name ?? '',
    memberAvatar: raw.member_avatar ?? null,
    defaultDays: String(raw.default_days),
    overrideDays: raw.override_days == null ? null : String(raw.override_days),
    note: raw.note ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAllocation(raw: any): SprintPlanAllocation {
  return {
    id: raw.id,
    issue: raw.issue,
    issueTitle: raw.issue_title ?? '',
    issueSequenceId: raw.issue_sequence_id ?? null,
    plannedMember: raw.planned_member ?? null,
    plannedDays: raw.planned_days == null ? null : String(raw.planned_days),
    plannedStoryPoints: raw.planned_story_points ?? null,
    rank: raw.rank ?? 0,
    note: raw.note ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlan(raw: any): SprintPlan {
  return {
    id: raw.id,
    cycle: raw.cycle,
    status: raw.status,
    appliedAt: raw.applied_at ?? null,
    memberCapacities: (raw.member_capacities ?? []).map(mapMemberCapacity),
    allocations: (raw.allocations ?? []).map(mapAllocation),
  }
}

export const cyclePlanningService = {
  get: (projectId: string, cycleId: string) =>
    api
      .get(`/projects/${projectId}/cycles/${cycleId}/plan/`)
      .then((response) => mapPlan(response.data)),

  create: (projectId: string, cycleId: string) =>
    api
      .post(`/projects/${projectId}/cycles/${cycleId}/plan/`)
      .then((response) => mapPlan(response.data)),

  updateMemberCapacities: (
    projectId: string,
    cycleId: string,
    items: UpdateSprintPlanMemberCapacityInput[],
  ) =>
    api
      .patch(`/projects/${projectId}/cycles/${cycleId}/plan/member-capacities/`, {
        items: items.map((item) => ({
          member: item.member,
          override_days: item.overrideDays,
          note: item.note,
        })),
      })
      .then((response) => (response.data as unknown[]).map(mapMemberCapacity)),

  listAllocations: (projectId: string, cycleId: string) =>
    api
      .get(`/projects/${projectId}/cycles/${cycleId}/plan/allocations/`)
      .then((response) => (response.data as unknown[]).map(mapAllocation)),

  createAllocation: (projectId: string, cycleId: string, data: Partial<SprintPlanAllocation>) =>
    api
      .post(`/projects/${projectId}/cycles/${cycleId}/plan/allocations/`, {
        issue: data.issue,
        planned_member: data.plannedMember,
        planned_days: data.plannedDays,
        planned_story_points: data.plannedStoryPoints,
        rank: data.rank,
        note: data.note,
      })
      .then((response) => mapAllocation(response.data)),

  updateAllocation: (
    projectId: string,
    cycleId: string,
    allocationId: string,
    data: Partial<SprintPlanAllocation>,
  ) =>
    api
      .patch(`/projects/${projectId}/cycles/${cycleId}/plan/allocations/${allocationId}/`, {
        issue: data.issue,
        planned_member: data.plannedMember,
        planned_days: data.plannedDays,
        planned_story_points: data.plannedStoryPoints,
        rank: data.rank,
        note: data.note,
      })
      .then((response) => mapAllocation(response.data)),

  deleteAllocation: (projectId: string, cycleId: string, allocationId: string) =>
    api.delete(`/projects/${projectId}/cycles/${cycleId}/plan/allocations/${allocationId}/`),

  apply: (projectId: string, cycleId: string) =>
    api
      .post(`/projects/${projectId}/cycles/${cycleId}/plan/apply/`)
      .then((response) => mapPlan(response.data)),
}
