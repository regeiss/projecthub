import type { SprintPlanAllocation, SprintPlanMemberCapacity } from '@/types'

export function parseDays(value: string | null | undefined) {
  return value == null ? 0 : Number(value)
}

export function normalizeNonNegativeNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value) || value < 0) {
    return null
  }
  return value
}

export function normalizeNonNegativeDays(value: string | null | undefined) {
  if (value == null) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const parsed = Number(trimmed)
  return normalizeNonNegativeNumber(parsed) == null ? null : trimmed
}

export function availableDays(
  capacity: Pick<SprintPlanMemberCapacity, 'defaultDays' | 'overrideDays'>,
) {
  return parseDays(capacity.overrideDays ?? capacity.defaultDays)
}

export function computePlanningSummary(
  capacities: ReadonlyArray<
    Pick<SprintPlanMemberCapacity, 'member' | 'defaultDays' | 'overrideDays'>
  >,
  allocations: ReadonlyArray<
    Pick<SprintPlanAllocation, 'plannedMember' | 'plannedDays' | 'plannedStoryPoints'>
  >,
) {
  const totalAvailableDays = capacities.reduce((sum, row) => sum + availableDays(row), 0)
  const totalPlannedDays = allocations.reduce((sum, row) => sum + parseDays(row.plannedDays), 0)
  const totalPlannedStoryPoints = allocations.reduce(
    (sum, row) => sum + (row.plannedStoryPoints ?? 0),
    0,
  )

  const overloadedMembers = capacities
    .filter((capacity) => {
      const memberDays = allocations
        .filter((allocation) => allocation.plannedMember === capacity.member)
        .reduce((sum, allocation) => sum + parseDays(allocation.plannedDays), 0)
      return memberDays > availableDays(capacity)
    })
    .map((row) => row.member)

  return { totalAvailableDays, totalPlannedDays, totalPlannedStoryPoints, overloadedMembers }
}

export function groupAllocationsByLane(allocations: SprintPlanAllocation[]) {
  const member: Record<string, SprintPlanAllocation[]> = {}
  const unassigned = allocations
    .filter((row) => !row.plannedMember)
    .sort((a, b) => a.rank - b.rank)

  allocations
    .filter((row) => row.plannedMember)
    .forEach((row) => {
      const laneId = row.plannedMember as string
      member[laneId] = [...(member[laneId] ?? []), row].sort((a, b) => a.rank - b.rank)
    })

  return { member, unassigned }
}

export function moveIssueToLane(
  allocations: SprintPlanAllocation[],
  allocationId: string,
  laneId: string | null,
) {
  const next = allocations.map((row) =>
    row.id === allocationId ? { ...row, plannedMember: laneId } : row,
  )

  const laneRows = next
    .filter((row) => row.plannedMember === laneId)
    .sort((a, b) => a.rank - b.rank)
    .map((row, index) => ({ ...row, rank: index }))

  return next.map((row) => laneRows.find((laneRow) => laneRow.id === row.id) ?? row)
}
