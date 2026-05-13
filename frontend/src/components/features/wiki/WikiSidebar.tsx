import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Search, X, FileText } from 'lucide-react'
import { useWikiSearch } from '@/hooks/useWiki'
import { cn } from '@/lib/utils'
import { PageTree } from './PageTree'
import type { WikiSpace } from '@/types'

// ---------------------------------------------------------------------------
// Search result list
// ---------------------------------------------------------------------------

function SearchResults({
  spaceId,
  query,
  basePath,
}: {
  spaceId: string
  query: string
  basePath: string
}) {
  const { data: results, isLoading } = useWikiSearch(spaceId, query)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-xs text-gray-400 dark:text-gray-500">Pesquisando…</span>
      </div>
    )
  }

  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-10 px-4 text-center">
        <Search className="h-5 w-5 text-gray-300 dark:text-gray-600" />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Nenhuma página encontrada para{' '}
          <span className="font-medium">"{query}"</span>
        </p>
      </div>
    )
  }

  return (
    <ul className="py-1">
      {results.map((page) => (
        <li key={page.id}>
          <NavLink
            to={`${basePath}/${page.id}`}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
              )
            }
          >
            <span className="text-base leading-none shrink-0">
              {page.emoji ?? <FileText className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />}
            </span>
            <span className="truncate">{page.title || 'Sem título'}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// WikiSidebar
// ---------------------------------------------------------------------------

interface WikiSidebarProps {
  space: WikiSpace
  /** Base route path for page links, e.g. "/projects/abc/wiki" or "/wiki" */
  basePath: string
}

export function WikiSidebar({ space, basePath }: WikiSidebarProps) {
  const [query, setQuery] = useState('')
  const isSearching = query.trim().length >= 2

  return (
    <aside
      className="flex h-full w-56 shrink-0 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
      aria-label="Páginas da wiki"
    >
      {/* Header: space name + search input */}
      <div className="shrink-0 border-b border-gray-100 dark:border-gray-800 px-4 py-3 space-y-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          {space.name}
        </p>

        {/* Search input */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar páginas…"
            className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-1.5 pl-8 pr-7 text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            aria-label="Pesquisar páginas da wiki"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Limpar pesquisa"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Body: search results or page tree */}
      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <SearchResults spaceId={space.id} query={query.trim()} basePath={basePath} />
        ) : (
          <PageTree spaceId={space.id} />
        )}
      </div>
    </aside>
  )
}
