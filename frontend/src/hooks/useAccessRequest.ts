import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accessRequestService } from '@/services/accessRequest.service'
import type { CreateAccessRequestInput, ResolveAccessRequestInput } from '@/types/accessRequest'

export function useMyAccessRequests() {
  return useQuery({
    queryKey: ['my-access-requests'],
    queryFn: () => accessRequestService.mine(),
  })
}

export function useMyAccessRequest() {
  return useQuery({
    queryKey: ['my-access-request-latest'],
    queryFn: async () => {
      const results = await accessRequestService.mine()
      return results[0] ?? undefined
    },
  })
}

export function useCreateAccessRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAccessRequestInput) => accessRequestService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-access-requests'] })
      qc.invalidateQueries({ queryKey: ['my-access-request-latest'] })
    },
  })
}

export const useSubmitAccessRequest = useCreateAccessRequest

export function useWorkspaceAccessRequests(
  slug: string,
  status?: 'pending' | 'approved' | 'denied',
) {
  return useQuery({
    queryKey: ['workspace-access-requests', slug, status ?? 'all'],
    queryFn: () => accessRequestService.listForWorkspace(slug, status),
    enabled: !!slug,
  })
}

export function useResolveAccessRequest(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, payload }: { requestId: string; payload: ResolveAccessRequestInput }) =>
      accessRequestService.resolve(slug, requestId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-access-requests', slug] })
      qc.invalidateQueries({ queryKey: ['my-access-requests'] })
    },
  })
}
