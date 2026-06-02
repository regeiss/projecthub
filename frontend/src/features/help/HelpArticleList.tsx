import { ChevronRight, FileText } from 'lucide-react'
import { ARTICLES } from './content/articles'
import type { HelpCategory } from './content/types'

interface Props {
  category: HelpCategory
  onSelectArticle: (id: string) => void
}

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

export function HelpArticleList({ category, onSelectArticle }: Props) {
  const articles = ARTICLES.filter((a) => a.category === category)

  return (
    <div>
      <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
        {CATEGORY_LABELS[category]}
      </h2>

      {articles.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Nenhum artigo disponível para esta categoria.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {articles.map((article) => (
            <button
              key={article.id}
              onClick={() => onSelectArticle(article.id)}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 group"
            >
              <FileText
                className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-indigo-500"
                aria-hidden="true"
              />
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                {article.title}
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-gray-400"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
