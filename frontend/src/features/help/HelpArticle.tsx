import { ChevronLeft } from 'lucide-react'
import { ARTICLES } from './content/articles'

interface Props {
  articleId: string
  onBack: () => void
}

export function HelpArticle({ articleId, onBack }: Props) {
  const article = ARTICLES.find((a) => a.id === articleId)

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">Artigo não encontrado.</p>
        <button
          onClick={onBack}
          className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={onBack}
        aria-label="Voltar à lista"
        className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Voltar
      </button>

      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {article.title}
      </h2>

      <div className="prose prose-sm dark:prose-invert max-w-none">
        {article.body}
      </div>
    </div>
  )
}
