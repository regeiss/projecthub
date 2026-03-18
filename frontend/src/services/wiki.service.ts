import api from '@/lib/axios'
import type { PaginatedResponse, WikiPage, WikiPageComment, WikiPageListItem, WikiPageVersion, WikiSpace } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSpace(raw: any): WikiSpace {
  return {
    id: raw.id,
    workspaceId: raw.workspace,
    projectId: raw.project ?? null,
    name: raw.name,
    description: raw.description ?? null,
    icon: raw.icon ?? null,
    isPrivate: raw.is_private,
    createdById: raw.created_by,
    pageCount: raw.page_count ?? 0,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPage(raw: any): WikiPage {
  return {
    id: raw.id,
    spaceId: raw.space,
    parentId: raw.parent ?? null,
    title: raw.title,
    content: raw.content ?? null,
    emoji: raw.emoji ?? null,
    coverUrl: raw.cover_url ?? null,
    sortOrder: raw.sort_order,
    isLocked: raw.is_locked,
    isArchived: raw.is_archived,
    isPublished: raw.is_published,
    publishedToken: raw.published_token ?? null,
    wordCount: raw.word_count ?? 0,
    createdById: raw.created_by,
    updatedById: raw.updated_by ?? null,
    children: (raw.children ?? []).map(mapPageListItem),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPageListItem(raw: any): WikiPageListItem {
  return {
    id: raw.id,
    spaceId: raw.space,
    parentId: raw.parent ?? null,
    title: raw.title,
    emoji: raw.emoji ?? null,
    sortOrder: raw.sort_order,
    isLocked: raw.is_locked,
    isArchived: raw.is_archived,
    isPublished: raw.is_published,
    wordCount: raw.word_count ?? 0,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

export const wikiService = {
  // Spaces
  spaces: () =>
    api.get<PaginatedResponse<unknown>>('/wiki/spaces/').then((r) => (r.data.results as unknown[]).map(mapSpace)),

  createSpace: (projectId: string, name: string) =>
    api.post<unknown>('/wiki/spaces/', { project: projectId, name }).then((r) => mapSpace(r.data)),

  updateSpace: (spaceId: string, data: Partial<WikiSpace>) =>
    api.patch<unknown>(`/wiki/spaces/${spaceId}/`, data).then((r) => mapSpace(r.data)),

  deleteSpace: (spaceId: string) =>
    api.delete(`/wiki/spaces/${spaceId}/`),

  // Pages
  pages: (spaceId: string, parentId?: string | null) =>
    api.get<PaginatedResponse<unknown>>(`/wiki/spaces/${spaceId}/pages/`, {
      params: parentId !== undefined ? { parent: parentId ?? 'null' } : {},
    }).then((r) => (r.data.results as unknown[]).map(mapPageListItem)),

  getPage: (pageId: string) =>
    api.get<unknown>(`/wiki/pages/${pageId}/`).then((r) => mapPage(r.data)),

  createPage: (spaceId: string, data: Partial<WikiPage>) =>
    api.post<unknown>(`/wiki/spaces/${spaceId}/pages/`, { title: data.title, content: data.content ?? null, parent: data.parentId ?? null }).then((r) => mapPage(r.data)),

  updatePage: (pageId: string, data: Partial<WikiPage>) =>
    api.patch<unknown>(`/wiki/pages/${pageId}/`, data).then((r) => mapPage(r.data)),

  movePage: (pageId: string, sortOrder?: number, parentId?: string | null) =>
    api.patch(`/wiki/pages/${pageId}/move/`, { sort_order: sortOrder, parent: parentId }).then((r) => r.data),

  publishPage: (pageId: string, publish: boolean) =>
    api.post(`/wiki/pages/${pageId}/publish/`, { publish }).then((r) => r.data),

  deletePage: (pageId: string) =>
    api.delete(`/wiki/pages/${pageId}/`),

  // Versions
  versions: (pageId: string) =>
    api.get<PaginatedResponse<WikiPageVersion>>(`/wiki/pages/${pageId}/versions/`).then((r) => r.data),

  restoreVersion: (pageId: string, versionId: string) =>
    api.post<WikiPage>(`/wiki/pages/${pageId}/versions/${versionId}/restore/`).then((r) => r.data),

  // Comments
  comments: (pageId: string) =>
    api.get<WikiPageComment[]>(`/wiki/pages/${pageId}/comments/`).then((r) => r.data),

  addComment: (pageId: string, content: string, selectionText?: string) =>
    api.post<WikiPageComment>(`/wiki/pages/${pageId}/comments/`, {
      content,
      selection_text: selectionText,
    }).then((r) => r.data),

  resolveComment: (commentId: string) =>
    api.post<WikiPageComment>(`/wiki/comments/${commentId}/resolve/`).then((r) => r.data),

  deleteComment: (commentId: string) =>
    api.delete(`/wiki/comments/${commentId}/`),
}
