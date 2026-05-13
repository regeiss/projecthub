import api from '@/lib/axios'
import type { GlobalSearchFilters, GlobalSearchResponse } from '@/types/search'

export const globalSearchService = {
  search: (q: string, filters: GlobalSearchFilters = {}): Promise<GlobalSearchResponse> => {
    const params: Record<string, string> = { q }
    if (filters.projectId) params.project_id = filters.projectId
    if (filters.authorId) params.author_id = filters.authorId
    if (filters.dateFrom) params.date_from = filters.dateFrom
    if (filters.dateTo) params.date_to = filters.dateTo
    return api.get<GlobalSearchResponse>('/search/', { params }).then((r) => r.data)
  },
}
