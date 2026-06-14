import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { timeEntryService } from '@/services/timeEntry.service'

export function useTimeEntries(issueId: string) {
  return useQuery({
    queryKey: ['time-entries', issueId],
    queryFn: () => timeEntryService.list(issueId),
    enabled: !!issueId,
  })
}

export function useLogTime(issueId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { hours: number; date: string; description?: string }) =>
      timeEntryService.create(issueId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries', issueId] })
    },
  })
}

export function useDeleteTimeEntry(issueId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: string) => timeEntryService.delete(issueId, entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries', issueId] })
    },
  })
}
