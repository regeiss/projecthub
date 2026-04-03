import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useWikiPage, useUpdateWikiPage, useWikiSpaces } from '@/hooks/useWiki'

vi.mock('@/services/wiki.service', () => ({
  wikiService: {
    getPage: vi.fn(),
    updatePage: vi.fn(),
    spaces: vi.fn(),
  },
}))

import { wikiService } from '@/services/wiki.service'

const mockPage = {
  id: 'page-1',
  spaceId: 'space-1',
  parentId: null,
  title: 'Test Page',
  content: { type: 'doc', content: [] },
  emoji: null,
  coverUrl: null,
  sortOrder: 1,
  isLocked: false,
  isArchived: false,
  isPublished: false,
  publishedToken: null,
  wordCount: 0,
  createdById: 'member-1',
  updatedById: null,
  ancestors: [{ id: 'parent-1', title: 'Parent Page' }],
  children: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useWikiPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns page data including ancestors', async () => {
    vi.mocked(wikiService.getPage).mockResolvedValue(mockPage)
    const { result } = renderHook(() => useWikiPage('page-1'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.ancestors).toEqual([{ id: 'parent-1', title: 'Parent Page' }])
  })
})

describe('useUpdateWikiPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls updatePage with TipTap JSON content', async () => {
    vi.mocked(wikiService.updatePage).mockResolvedValue({ ...mockPage, title: 'Updated' })
    const { result } = renderHook(() => useUpdateWikiPage(), { wrapper: makeWrapper() })
    const content = { type: 'doc', content: [{ type: 'paragraph' }] }
    result.current.mutate({ pageId: 'page-1', data: { content } })
    await waitFor(() => expect(wikiService.updatePage).toHaveBeenCalledWith('page-1', { content }))
  })
})

describe('useWikiSpaces', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls spaces service and returns mapped list', async () => {
    const mockSpace = {
      id: 'space-1', workspaceId: 'ws-1', projectId: 'proj-1',
      name: 'Engineering', description: null, icon: null,
      isPrivate: false, createdById: 'member-1', pageCount: 3,
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    }
    vi.mocked(wikiService.spaces).mockResolvedValue([mockSpace])
    const { result } = renderHook(() => useWikiSpaces(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].workspaceId).toBe('ws-1')
  })
})
