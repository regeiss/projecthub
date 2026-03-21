import { mapIssue } from './issue.service'

describe('mapIssue', () => {
  it('maps subtask_count and completed_subtask_count to camelCase', () => {
    const raw = {
      id: 'abc', title: 'T', priority: 'none', type: 'task',
      sequence_id: 1, sort_order: 0, estimate_days: null,
      state: null, state_color: null, state_category: null,
      assignee: null, assignee_name: null, assignee_avatar: null,
      reporter: null, created_by: null, labels: [],
      parent_id: null, milestone: null, milestone_name: null,
      subtask_count: 3, completed_subtask_count: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      completed_at: null,
    }
    const issue = mapIssue(raw as unknown)
    expect(issue.subtaskCount).toBe(3)
    expect(issue.completedSubtaskCount).toBe(1)
  })

  it('defaults subtask counts to 0 when absent', () => {
    const raw = {
      id: 'abc', title: 'T', priority: 'none', type: 'task',
      sequence_id: 1, sort_order: 0, estimate_days: null,
      state: null, state_color: null, state_category: null,
      assignee: null, assignee_name: null, assignee_avatar: null,
      reporter: null, created_by: null, labels: [],
      parent_id: null, milestone: null, milestone_name: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      completed_at: null,
    }
    const issue = mapIssue(raw as unknown)
    expect(issue.subtaskCount).toBe(0)
    expect(issue.completedSubtaskCount).toBe(0)
  })
})
