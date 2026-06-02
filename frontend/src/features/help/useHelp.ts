import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDebounce } from '@/hooks/useDebounce'
import { categoryFromPath } from './content/routeMap'
import type { HelpPanel } from './content/types'

interface UseHelpReturn {
  panel: HelpPanel
  setPanel: (p: HelpPanel) => void
  articleId: string | null
  setArticleId: (id: string | null) => void
  query: string
  setQuery: (q: string) => void
  debouncedQuery: string
}

export function useHelp(): UseHelpReturn {
  const location = useLocation()
  const navigate = useNavigate()

  const initialPanel = useCallback((): HelpPanel => {
    const from = (location.state as { from?: string } | null)?.from
    if (from) return categoryFromPath(from)
    return 'general'
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [panel, setPanel] = useState<HelpPanel>(initialPanel)
  const [articleId, setArticleId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 150)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== '?') return
      const target = e.target as HTMLElement
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (target.isContentEditable) return
      navigate('/help', { state: { from: location.pathname } })
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navigate, location.pathname])

  return { panel, setPanel, articleId, setArticleId, query, setQuery, debouncedQuery }
}
