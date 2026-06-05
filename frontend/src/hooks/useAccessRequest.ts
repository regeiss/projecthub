import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accessRequestService } from '@/services/accessRequest.service'
import type { AdminResolvePayload } from '@/types/accessRequest'

export function useMyAccessRequest() {
  return useQuery({
    queryKey: ['access-request-me'],
    queryFn: () => accessRequestService.getMyStatus(),
    retry: (failureCount, error: unknown) => {
      if ((error as { response?: { status?: number } })?.response?.status === 404) return false
      return failureCount < 2
    },
    staleTime: 0,
  })
}

export function useSubmitAccessRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: accessRequestService.submit,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['access-request-me'] }),
  })
}

export function useWorkspaceAccessRequests(slug: string, status = 'pending') {
  return useQuery({
    queryKey: ['workspace-access-requests', slug, status],
    queryFn: () => accessRequestService.listForWorkspace(slug, status),
    enabled: !!slug,
  })
}

export function useResolveAccessRequest(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, payload }: { requestId: string; payload: AdminResolvePayload }) =>
      accessRequestService.resolve(slug, requestId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-access-requests', slug] })
    },
  })
}
