import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { wikiService } from '@/services/wiki.service'
import type { WikiPage } from '@/types'

export function useWikiSpaces() {
  return useQuery({
    queryKey: ['wiki-spaces'],
    queryFn: () => wikiService.spaces(),
  })
}

export function useWikiPages(spaceId: string, parentId?: string | null) {
  return useQuery({
    queryKey: ['wiki-pages', spaceId, parentId],
    queryFn: () => wikiService.pages(spaceId, parentId),
    enabled: !!spaceId,
  })
}

export function useWikiPage(pageId: string) {
  return useQuery({
    queryKey: ['wiki-page', pageId],
    queryFn: () => wikiService.getPage(pageId),
    enabled: !!pageId,
  })
}

export function useWikiPageComments(pageId: string) {
  return useQuery({
    queryKey: ['wiki-comments', pageId],
    queryFn: () => wikiService.comments(pageId),
    enabled: !!pageId,
  })
}

export function useWikiPageVersions(pageId: string) {
  return useQuery({
    queryKey: ['wiki-versions', pageId],
    queryFn: () => wikiService.versions(pageId),
    enabled: !!pageId,
  })
}

export function useCreateWikiSpace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, name }: { projectId: string; name: string }) =>
      wikiService.createSpace(projectId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wiki-spaces'] })
    },
  })
}

export function useCreateWikiPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ spaceId, data }: { spaceId: string; data: Partial<WikiPage> }) =>
      wikiService.createPage(spaceId, data),
    onSuccess: (page) => {
      qc.invalidateQueries({ queryKey: ['wiki-pages', page.spaceId] })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      console.error('[useCreateWikiPage] 400 body:', err?.response?.data)
    },
  })
}

export function useUpdateWikiPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pageId, data }: { pageId: string; data: Partial<WikiPage> }) =>
      wikiService.updatePage(pageId, data),
    onSuccess: (page) => {
      qc.invalidateQueries({ queryKey: ['wiki-page', page.id] })
      qc.invalidateQueries({ queryKey: ['wiki-pages', page.spaceId] })
    },
  })
}

export function useDeleteWikiPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pageId, spaceId }: { pageId: string; spaceId: string }) =>
      wikiService.deletePage(pageId),
    onSuccess: (_data, { spaceId }) => {
      qc.invalidateQueries({ queryKey: ['wiki-pages', spaceId] })
    },
  })
}

export function useRestoreWikiVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pageId, versionId }: { pageId: string; versionId: string }) =>
      wikiService.restoreVersion(pageId, versionId),
    onSuccess: (page) => {
      qc.invalidateQueries({ queryKey: ['wiki-page', page.id] })
    },
  })
}
