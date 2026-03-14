export interface WikiSpace {
  id: string
  workspaceId: string
  projectId: string | null
  name: string
  description: string | null
  icon: string | null
  isPrivate: boolean
  createdById: string
  pageCount: number
  createdAt: string
  updatedAt: string
}

export interface WikiPage {
  id: string
  spaceId: string
  parentId: string | null
  title: string
  content: object | null
  emoji: string | null
  coverUrl: string | null
  sortOrder: number
  isLocked: boolean
  isArchived: boolean
  isPublished: boolean
  publishedToken: string | null
  wordCount: number
  createdById: string
  updatedById: string | null
  children?: WikiPageListItem[]
  createdAt: string
  updatedAt: string
}

export interface WikiPageListItem {
  id: string
  spaceId: string
  parentId: string | null
  title: string
  emoji: string | null
  sortOrder: number
  isLocked: boolean
  isArchived: boolean
  isPublished: boolean
  wordCount: number
  createdAt: string
  updatedAt: string
}

export interface WikiPageComment {
  id: string
  pageId: string
  author: { id: string; name: string; avatarUrl: string | null }
  content: string
  selectionText: string | null
  isResolved: boolean
  createdAt: string
  updatedAt: string
}

export interface WikiPageVersion {
  id: string
  pageId: string
  versionNumber: number
  title: string
  content: object
  changeSummary: string | null
  createdById: string
  createdAt: string
}
