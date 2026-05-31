import api from '@/lib/axios'

export interface PersonalTask {
  id: string
  title: string
  done: boolean
  sortOrder: number
  createdAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map(raw: any): PersonalTask {
  return {
    id:        raw.id,
    title:     raw.title,
    done:      raw.done,
    sortOrder: raw.sort_order,
    createdAt: raw.created_at,
  }
}

export const personalTaskService = {
  list: () =>
    api.get<unknown[]>('/tasks/').then((r) => (r.data as unknown[]).map(map)),

  create: (title: string) =>
    api.post('/tasks/', { title }).then((r) => map(r.data)),

  update: (id: string, data: Partial<{ title: string; done: boolean; sortOrder: number }>) =>
    api.patch(`/tasks/${id}/`, {
      ...(data.title     !== undefined && { title:      data.title }),
      ...(data.done      !== undefined && { done:       data.done }),
      ...(data.sortOrder !== undefined && { sort_order: data.sortOrder }),
    }).then((r) => map(r.data)),

  delete: (id: string) =>
    api.delete(`/tasks/${id}/`),
}
