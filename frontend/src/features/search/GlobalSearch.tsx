import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { useDebounce } from '@/hooks/useDebounce'
import type { GlobalSearchFilters } from '@/types/search'
import { GlobalSearchFilterChips } from './GlobalSearchFilterChips'
import { GlobalSearchResults } from './GlobalSearchResults'

interface Props {
  expanded?: boolean
}

export function GlobalSearch({ expanded = false }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<GlobalSearchFilters>({})
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const focusedIndexRef = useRef(focusedIndex)
  const navigate = useNavigate()

  useEffect(() => {
    focusedIndexRef.current = focusedIndex
  }, [focusedIndex])

  const debouncedQuery = useDebounce(query, 300)
  const { data, isLoading, isError, refetch } = useGlobalSearch(debouncedQuery, filters)

  const issues = data?.issues ?? []
  const wikiPages = data?.wiki_pages ?? []
  const ideas = data?.ideas ?? []
  const totalResults = issues.length + wikiPages.length + ideas.length
  const resultIds = [...issues.map((i) => i.id), ...wikiPages.map((p) => p.id), ...ideas.map((d) => d.id)]

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
          if (current) { close(); return false }
          open(); return true
        })
      }
      if (e.key === 'Escape') close()
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
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isOpen, close])

  // Reset focused index when results change
  useEffect(() => { setFocusedIndex(-1) }, [data])

  const activeFocusedId =
    focusedIndex >= 0 ? `search-result-${resultIds[focusedIndex]}` : undefined

  // ── Trigger button ──────────────────────────────────────────────────────────

  const trigger = expanded ? (
    <button
      onClick={open}
      className="flex h-8 w-full items-center gap-3 rounded-md px-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
      aria-label="Abrir busca (⌘K)"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate text-left text-sm">Pesquisar…</span>
      <span className="text-[10px] text-white/30 select-none">⌘K</span>
    </button>
  ) : (
    <button
      onClick={open}
      className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
      aria-label="Abrir busca (⌘K)"
      title="Pesquisar (⌘K)"
    >
      <Search className="h-4 w-4" />
    </button>
  )

  // ── Overlay panel (command-palette style) ──────────────────────────────────

  const overlay = createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center pt-20 px-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/25 dark:bg-black/40" />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.1, ease: 'easeIn' } }}
            className="relative w-full max-w-2xl"
            role="search"
          >
            <div className="flex items-center gap-2 h-10 px-3 rounded-t-lg border border-indigo-400 dark:border-indigo-500 bg-white dark:bg-gray-900 shadow-2xl ring-2 ring-indigo-100 dark:ring-indigo-900/40">
              <Search className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" aria-hidden="true" />
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
              <span className="text-[10px] text-gray-300 dark:text-gray-600 shrink-0 select-none" aria-hidden="true">
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
                className={cn(
                  'bg-white dark:bg-gray-900 border-b border-x border-gray-200 dark:border-gray-700',
                  'shadow-xl rounded-b-lg px-4 py-4 text-center text-sm text-gray-400 dark:text-gray-500',
                )}
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )

  return (
    <>
      {trigger}
      {overlay}
    </>
  )
}
