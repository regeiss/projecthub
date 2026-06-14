import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { discoveryService } from '@/services/discovery.service'

export function useIdeas(workspaceId?: string) {
  return useQuery({
    queryKey: ['discovery-ideas', workspaceId],
    queryFn: () => discoveryService.listIdeas(),
    enabled: !!workspaceId,
  })
}

export function useIdeaComments(ideaId: string) {
  return useQuery({
    queryKey: ['idea-comments', ideaId],
    queryFn: () => discoveryService.listComments(ideaId),
    enabled: !!ideaId,
  })
}

export function useAddIdeaComment(ideaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => discoveryService.addComment(ideaId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['idea-comments', ideaId] }),
  })
}

export function useDeleteIdeaComment(ideaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => discoveryService.deleteComment(ideaId, commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['idea-comments', ideaId] }),
  })
}
