import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useHelp } from './useHelp'
import { HelpSidebar } from './HelpSidebar'
import { HelpSearch } from './HelpSearch'
import { HelpArticleList } from './HelpArticleList'
import { HelpArticle } from './HelpArticle'
import { ShortcutsPanel } from './ShortcutsPanel'
import { FaqPanel } from './FaqPanel'
import { ARTICLES } from './content/articles'
import { FAQ } from './content/faq'
import type { HelpCategory } from './content/types'

const CATEGORY_LABELS: Record<HelpCategory, string> = {
  general: 'Geral',
  board: 'Board',
  backlog: 'Backlog',
  cycles: 'Ciclos',
  gantt: 'Gantt',
  wiki: 'Wiki',
  portfolio: 'Portfólio',
  issues: 'Issues',
  modules: 'Módulos',
  milestones: 'Marcos',
  risks: 'Riscos',
  resources: 'Recursos',
  workspace: 'Workspace',
}

export function HelpPage() {
  const navigate = useNavigate()
  const { panel, setPanel, articleId, setArticleId, query, setQuery, debouncedQuery } = useHelp()

  function handleSelectArticle(id: string) {
    const article = ARTICLES.find((a) => a.id === id)
    if (article) {
      setPanel(article.category)
      setArticleId(id)
      setQuery('')
      return
    }
    const faq = FAQ.find((f) => f.id === id)
    if (faq) {
      setPanel('faq')
      setQuery('')
    }
  }

  function renderMainPanel() {
    if (articleId) {
      return (
        <HelpArticle
          articleId={articleId}
          onBack={() => setArticleId(null)}
        />
      )
    }
    if (panel === 'shortcuts') return <ShortcutsPanel />
    if (panel === 'faq') return <FaqPanel />
    return (
      <HelpArticleList
        category={panel as HelpCategory}
        onSelectArticle={(id) => setArticleId(id)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </button>

        <h1 className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Central de Ajuda
        </h1>

        <div className="w-72">
          <HelpSearch
            query={query}
            onQueryChange={setQuery}
            debouncedQuery={debouncedQuery}
            onSelectArticle={handleSelectArticle}
            inputOnly
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        <HelpSidebar
          active={panel}
          onSelect={(p) => {
            setPanel(p)
            setArticleId(null)
            setQuery('')
          }}
        />

        <main className="flex-1 overflow-y-auto p-8">
          {debouncedQuery.trim() ? (
            <HelpSearch
              query={query}
              onQueryChange={setQuery}
              debouncedQuery={debouncedQuery}
              onSelectArticle={handleSelectArticle}
            />
          ) : (
            renderMainPanel()
          )}
        </main>
      </div>
    </div>
  )
}
