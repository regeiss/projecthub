import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { personalTaskService, type PersonalTask } from '@/services/personalTask.service'

const QK = ['personal-tasks']

export function usePersonalTasks() {
  return useQuery({ queryKey: QK, queryFn: personalTaskService.list })
}

export function useCreatePersonalTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title: string) => personalTaskService.create(title),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdatePersonalTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; done?: boolean; sortOrder?: number }) =>
      personalTaskService.update(id, data),
    onMutate: async ({ id, done }) => {
      if (done === undefined) return
      await qc.cancelQueries({ queryKey: QK })
      const prev = qc.getQueryData<PersonalTask[]>(QK)
      qc.setQueryData<PersonalTask[]>(QK, (old) =>
        old?.map((t) => (t.id === id ? { ...t, done } : t)) ?? [],
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(QK, ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDeletePersonalTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => personalTaskService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
