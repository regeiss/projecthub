import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ARTICLES } from './content/articles'
import { FAQ } from './content/faq'

interface Props {
  query: string
  onQueryChange: (q: string) => void
  debouncedQuery: string
  onSelectArticle: (id: string) => void
  inputOnly?: boolean
}

interface SearchResult {
  id: string
  title: string
  type: 'article' | 'faq'
}

function search(q: string): SearchResult[] {
  if (!q.trim()) return []
  const lower = q.toLowerCase()

  const articleResults: SearchResult[] = ARTICLES
    .filter(
      (a) =>
        a.title.toLowerCase().includes(lower) ||
        a.keywords.some((k) => k.toLowerCase().includes(lower)) ||
        a.bodyText.toLowerCase().includes(lower),
    )
    .map((a) => ({ id: a.id, title: a.title, type: 'article' }))

  const faqResults: SearchResult[] = FAQ
    .filter((f) => f.question.toLowerCase().includes(lower))
    .map((f) => ({ id: f.id, title: f.question, type: 'faq' }))

  return [...articleResults, ...faqResults]
}

export function HelpSearch({ query, onQueryChange, debouncedQuery, onSelectArticle, inputOnly = false }: Props) {
  const results = search(debouncedQuery)

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          type="search"
          role="searchbox"
          aria-label="Pesquisar na ajuda"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Pesquisar na ajuda…"
          className={cn(
            'w-full rounded-lg border border-gray-200 dark:border-gray-700',
            'bg-white dark:bg-gray-900 py-2 pl-9 pr-4 text-sm',
            'text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500',
            'outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-900/40',
          )}
        />
      </div>

      {!inputOnly && debouncedQuery.trim() && (
        <div className="flex flex-col gap-1">
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              Nenhum resultado para{' '}
              <strong className="text-gray-600 dark:text-gray-300">"{debouncedQuery}"</strong>.
              <br />
              <span className="text-xs">Tente navegar pelas categorias ao lado.</span>
            </p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => onSelectArticle(r.id)}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-4 py-3 text-left transition-colors',
                  'hover:bg-gray-50 dark:hover:bg-gray-800',
                )}
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.title}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {r.type === 'faq' ? 'FAQ' : 'Artigo'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
