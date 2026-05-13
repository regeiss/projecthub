import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { useDebounce } from '@/hooks/useDebounce'
import type { GlobalSearchFilters } from '@/types/search'
import { GlobalSearchFilterChips } from './GlobalSearchFilterChips'
import { GlobalSearchResults } from './GlobalSearchResults'

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<GlobalSearchFilters>({})
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const focusedIndexRef = useRef(focusedIndex)
  const navigate = useNavigate()

  useEffect(() => {
    focusedIndexRef.current = focusedIndex
  }, [focusedIndex])

  const debouncedQuery = useDebounce(query, 300)
  const { data, isLoading, isError, refetch } = useGlobalSearch(debouncedQuery, filters)

  const issues = data?.issues ?? []
  const wikiPages = data?.wiki_pages ?? []
  const totalResults = issues.length + wikiPages.length
  const resultIds = [...issues.map((i) => i.id), ...wikiPages.map((p) => p.id)]

  const open = useCallback(() => {
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setFilters({})
    setFocusedIndex(-1)
  }, [])

  // ⌘K / Ctrl+K global shortcut + Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((current) => {
          if (current) {
            close()
            return false
          }
          open()
          return true
        })
      }
      if (e.key === 'Escape') {
        close()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  // Arrow key navigation + Enter
  useEffect(() => {
    if (!isOpen || totalResults === 0) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((i) => Math.min(i + 1, totalResults - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - 1, -1))
      } else if (e.key === 'Enter' && focusedIndexRef.current >= 0) {
        e.preventDefault()
        const idx = focusedIndexRef.current
        const url =
          idx < issues.length
            ? `/projects/${issues[idx].project.id}/issues/${issues[idx].id}/`
            : (() => {
                const page = wikiPages[idx - issues.length]
                return page.project
                  ? `/projects/${page.project.id}/wiki/${page.id}`
                  : `/wiki/${page.id}`
              })()
        navigate(url)
        close()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, issues, wikiPages, totalResults, navigate, close])

  // Click-away
  useEffect(() => {
    if (!isOpen) return
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isOpen, close])

  // Reset focused index when results change
  useEffect(() => {
    setFocusedIndex(-1)
  }, [data])

  const activeFocusedId =
    focusedIndex >= 0 ? `search-result-${resultIds[focusedIndex]}` : undefined

  return (
    <div ref={containerRef} className={cn('relative', isOpen && 'flex-1 mx-2')} role="search">
      {!isOpen ? (
        <button
          onClick={open}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label="Abrir busca (⌘K)"
          title="Pesquisar (⌘K)"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2 h-7 px-3 rounded-md border border-indigo-400 dark:border-indigo-500 bg-white dark:bg-gray-800 shadow-sm ring-2 ring-indigo-100 dark:ring-indigo-900/40">
            <Search
              className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar em issues e wiki…"
              className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
              role="combobox"
              aria-expanded={debouncedQuery.length >= 2 && isOpen}
              aria-haspopup="listbox"
              aria-controls="search-results-panel"
              aria-activedescendant={activeFocusedId}
              aria-label="Busca global"
              autoComplete="off"
            />
            <GlobalSearchFilterChips filters={filters} onChange={setFilters} />
            <span
              className="text-[10px] text-gray-300 dark:text-gray-600 shrink-0 select-none"
              aria-hidden="true"
            >
              ESC
            </span>
            <button
              onClick={close}
              aria-label="Fechar busca"
              className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {query.length > 0 && query.length < 2 && (
            <div
              className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-x border-gray-200 dark:border-gray-700 shadow-xl rounded-b-lg px-4 py-4 text-center text-sm text-gray-400 dark:text-gray-500"
              role="status"
              aria-live="polite"
            >
              Digite pelo menos 2 caracteres
            </div>
          )}

          {debouncedQuery.length >= 2 && (
            <GlobalSearchResults
              query={debouncedQuery}
              data={data}
              isLoading={isLoading}
              isError={isError}
              focusedIndex={focusedIndex}
              onNavigate={close}
              onRefetch={refetch}
              resultIds={resultIds}
            />
          )}
        </>
      )}
    </div>
  )
}
