import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { issueTemplateService } from '@/services/issueTemplate.service'

export function useIssueTemplates() {
  return useQuery({
    queryKey: ['issue-templates'],
    queryFn: issueTemplateService.list,
  })
}

export function useCreateIssueTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: issueTemplateService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issue-templates'] }),
  })
}

export function useUpdateIssueTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof issueTemplateService.update>[1] }) =>
      issueTemplateService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issue-templates'] }),
  })
}

export function useDeleteIssueTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: issueTemplateService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issue-templates'] }),
  })
}
