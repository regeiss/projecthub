export interface SearchProjectBrief {
  id: string
  name: string
  identifier: string
}

export interface SearchStateBrief {
  id: string
  name: string
  color: string
}

export interface SearchMemberBrief {
  id: string
  name: string
  avatar_url: string | null
}

export interface SearchSpaceBrief {
  id: string
  name: string
}

export interface IssueSearchResult {
  id: string
  sequence_id: number | null
  title: string
  project: SearchProjectBrief
  state: SearchStateBrief | null
  created_by: SearchMemberBrief | null
  created_at: string
  headline: string
}

export interface WikiPageSearchResult {
  id: string
  title: string
  space: SearchSpaceBrief
  project: SearchProjectBrief | null
  created_by: SearchMemberBrief | null
  updated_at: string
  headline: string
}

export interface GlobalSearchResponse {
  issues: IssueSearchResult[]
  wiki_pages: WikiPageSearchResult[]
  total: number
}

export interface GlobalSearchFilters {
  projectId?: string
  authorId?: string
  dateFrom?: string
  dateTo?: string
}
