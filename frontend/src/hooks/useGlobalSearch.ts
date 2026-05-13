import { useQuery } from '@tanstack/react-query'
import { globalSearchService } from '@/services/globalSearch.service'
import type { GlobalSearchFilters } from '@/types/search'

export function useGlobalSearch(query: string, filters: GlobalSearchFilters) {
  return useQuery({
    queryKey: ['global-search', query, filters],
    queryFn: () => globalSearchService.search(query, filters),
    enabled: query.length >= 2,
    staleTime: 30_000,
    retry: 1,
  })
}
