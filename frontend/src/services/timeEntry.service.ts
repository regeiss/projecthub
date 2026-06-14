import api from '@/lib/axios'

export interface TimeEntry {
  id: string
  issueId: string
  memberId: string
  memberName: string | null
  memberAvatar: string | null
  hours: number
  description: string | null
  date: string
  createdAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEntry(raw: any): TimeEntry {
  return {
    id: raw.id,
    issueId: raw.issue,
    memberId: raw.member,
    memberName: raw.member_name ?? null,
    memberAvatar: raw.member_avatar ?? null,
    hours: parseFloat(raw.hours),
    description: raw.description ?? null,
    date: raw.date,
    createdAt: raw.created_at,
  }
}

export const timeEntryService = {
  list: (issueId: string) =>
    api.get<unknown[]>(`/issues/${issueId}/time-entries/`).then((r) => (r.data as unknown[]).map(mapEntry)),

  create: (issueId: string, data: { hours: number; date: string; description?: string }) =>
    api.post<unknown>(`/issues/${issueId}/time-entries/`, data).then((r) => mapEntry(r.data)),

  delete: (issueId: string, entryId: string) =>
    api.delete(`/issues/${issueId}/time-entries/${entryId}/`),
}
