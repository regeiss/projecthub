import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { watchService } from '@/services/watch.service'

export function useIssueWatchStatus(issueId: string) {
  return useQuery({
    queryKey: ['watch', 'issue', issueId],
    queryFn: () => watchService.getIssueWatchStatus(issueId),
    enabled: !!issueId,
  })
}

export function useToggleIssueWatch(issueId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (watching: boolean) =>
      watching ? watchService.unwatchIssue(issueId) : watchService.watchIssue(issueId),
    onSuccess: (data) => {
      qc.setQueryData(['watch', 'issue', issueId], data)
    },
  })
}

export function usePageWatchStatus(pageId: string) {
  return useQuery({
    queryKey: ['watch', 'wiki-page', pageId],
    queryFn: () => watchService.getPageWatchStatus(pageId),
    enabled: !!pageId,
  })
}

export function useTogglePageWatch(pageId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (watching: boolean) =>
      watching ? watchService.unwatchPage(pageId) : watchService.watchPage(pageId),
    onSuccess: (data) => {
      qc.setQueryData(['watch', 'wiki-page', pageId], data)
    },
  })
}
