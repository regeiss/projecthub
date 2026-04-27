import { describe, expect, it } from 'vitest'
import {
  computePlanningSummary,
  groupAllocationsByLane,
  moveIssueToLane,
  normalizeNonNegativeNumber,
} from './planning-board-state'

const capacities = [
  { member: 'member-1', memberName: 'Ana', defaultDays: '10.0', overrideDays: null },
  { member: 'member-2', memberName: 'Bruno', defaultDays: '5.0', overrideDays: '4.0' },
] as const

const allocations = [
  {
    id: 'a-1',
    issue: 'issue-1',
    issueTitle: 'Login',
    issueSequenceId: 12,
    plannedMember: 'member-1',
    plannedDays: '3.0',
    plannedStoryPoints: 5,
    rank: 0,
    note: null,
  },
  {
    id: 'a-2',
    issue: 'issue-2',
    issueTitle: 'Billing',
    issueSequenceId: 14,
    plannedMember: 'member-1',
    plannedDays: '8.0',
    plannedStoryPoints: 8,
    rank: 1,
    note: null,
  },
] as const

describe('planning board state', () => {
  it('computes totals and overload from planned days', () => {
    const summary = computePlanningSummary(capacities, allocations)
    expect(summary.totalAvailableDays).toBe(14)
    expect(summary.totalPlannedDays).toBe(11)
    expect(summary.totalPlannedStoryPoints).toBe(13)
    expect(summary.overloadedMembers).toEqual(['member-1'])
  })

  it('groups allocations by member lane and unassigned lane', () => {
    const lanes = groupAllocationsByLane([
      ...allocations,
      {
        id: 'a-3',
        issue: 'issue-3',
        issueTitle: 'Unassigned',
        issueSequenceId: 15,
        plannedMember: null,
        plannedDays: '1.0',
        plannedStoryPoints: 2,
        rank: 2,
        note: null,
      },
      {
        id: 'a-4',
        issue: 'issue-4',
        issueTitle: 'Unassigned first',
        issueSequenceId: 16,
        plannedMember: null,
        plannedDays: '2.0',
        plannedStoryPoints: 3,
        rank: 1,
        note: null,
      },
    ])
    expect(lanes.member['member-1']).toHaveLength(2)
    expect(lanes.unassigned).toHaveLength(2)
    expect(lanes.unassigned.map((item) => item.id)).toEqual(['a-4', 'a-3'])
  })

  it('moves an allocation between lanes while keeping rank order', () => {
    const next = moveIssueToLane([...allocations], 'a-2', 'member-2')
    expect(next.find((item) => item.id === 'a-2')?.plannedMember).toBe('member-2')
    expect(next.find((item) => item.id === 'a-2')?.rank).toBe(0)
  })

  it('normalizes negative planning numbers to null', () => {
    expect(normalizeNonNegativeNumber(8)).toBe(8)
    expect(normalizeNonNegativeNumber(0)).toBe(0)
    expect(normalizeNonNegativeNumber(-1)).toBeNull()
    expect(normalizeNonNegativeNumber(Number.NaN)).toBeNull()
    expect(normalizeNonNegativeNumber(null)).toBeNull()
  })
})
