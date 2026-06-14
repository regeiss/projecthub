import { useNavigate } from 'react-router-dom'
import { FileText, AlertCircle, Lightbulb } from 'lucide-react'
import { relativeTime, cn } from '@/lib/utils'
import type { GlobalSearchResponse } from '@/types/search'

// Strip all HTML except <mark>/<\/mark>, then wrap marks with accessible span
function sanitiseHeadline(raw: string): string {
  const stripped = raw.replace(/<(?!\/?(mark)(\s|>))[^>]+>/gi, '')
  return stripped
    .replace(/<mark>/g, '<span aria-label="correspondência destacada"><mark>')
    .replace(/<\/mark>/g, '</mark></span>')
}

interface Props {
  query: string
  data: GlobalSearchResponse | undefined
  isLoading: boolean
  isError: boolean
  focusedIndex: number
  onNavigate: () => void
  onRefetch: () => void
  resultIds: string[]
}

function SkeletonRow() {
  return (
    <div className="px-4 py-3 animate-pulse">
      <div className="h-3 w-3/4 bg-gray-100 dark:bg-gray-700 rounded mb-2" />
      <div className="h-2.5 w-1/2 bg-gray-100 dark:bg-gray-700 rounded" />
    </div>
  )
}

export function GlobalSearchResults({
  query, data, isLoading, isError, focusedIndex, onNavigate, onRefetch, resultIds,
}: Props) {
  const navigate = useNavigate()

  function handleClick(url: string) {
    navigate(url)
    onNavigate()
  }

  const issues = data?.issues ?? []
  const wikiPages = data?.wiki_pages ?? []
  const ideas = data?.ideas ?? []
  const isEmpty = !isLoading && !isError && issues.length === 0 && wikiPages.length === 0 && ideas.length === 0

  const issueOffset = 0
  const wikiOffset = issues.length
  const ideaOffset = issues.length + wikiPages.length

  return (
    <div
      id="search-results-panel"
      role="listbox"
      aria-label="Resultados da busca"
      aria-multiselectable="false"
      className="absolute top-full left-0 right-0 z-50 mt-0 bg-white dark:bg-gray-900 border-b border-x border-gray-200 dark:border-gray-700 shadow-xl rounded-b-lg overflow-hidden"
    >
      {isError && (
        <div className="flex items-center gap-2 px-4 py-6 justify-center text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          Erro ao buscar. Tente novamente.
          <button onClick={onRefetch} className="underline ml-1">Tentar</button>
        </div>
      )}

      {isEmpty && (
        <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          Sem resultados para <em>«{query}»</em>
        </p>
      )}

      {!isError && (
        <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
          {/* Issues column */}
          <div>
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Issues
              </span>
              {!isLoading && issues.length > 0 && (
                <span className="text-[10px] text-gray-400 dark:text-gray-600">({issues.length})</span>
              )}
            </div>
            <ul role="presentation">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <li key={i} role="presentation">
                      <SkeletonRow />
                    </li>
                  ))
                : issues.map((issue, i) => {
                    const idx = issueOffset + i
                    const resultId = `search-result-${resultIds[idx]}`
                    const url = `/projects/${issue.project.id}/issues/${issue.id}/`
                    return (
                      <li
                        key={issue.id}
                        id={resultId}
                        role="option"
                        className={cn(
                          'px-4 py-2.5 cursor-pointer border-b border-gray-50 dark:border-gray-800/50 last:border-0',
                          focusedIndex === idx
                            ? 'bg-indigo-50 dark:bg-indigo-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
                        )}
                        onClick={() => handleClick(url)}
                        tabIndex={-1}
                        aria-selected={focusedIndex === idx}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug line-clamp-1">
                          {issue.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {issue.project.identifier}
                          </span>
                          {issue.state && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ background: issue.state.color + '22', color: issue.state.color }}
                            >
                              {issue.state.name}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
                            {relativeTime(issue.created_at)}
                          </span>
                        </div>
                        {issue.headline && (
                          <p
                            className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 [&_mark]:bg-amber-100 [&_mark]:dark:bg-amber-900/40 [&_mark]:text-amber-800 [&_mark]:dark:text-amber-300 [&_mark]:rounded-sm [&_mark]:px-0.5"
                            dangerouslySetInnerHTML={{ __html: sanitiseHeadline(issue.headline) }}
                            aria-label="Trecho do resultado"
                          />
                        )}
                      </li>
                    )
                  })}
              {!isLoading && issues.length === 0 && !isEmpty && (
                <li className="px-4 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">Sem issues</li>
              )}
            </ul>
          </div>

          {/* Wiki column */}
          <div>
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Wiki
              </span>
              {!isLoading && wikiPages.length > 0 && (
                <span className="text-[10px] text-gray-400 dark:text-gray-600">({wikiPages.length})</span>
              )}
            </div>
            <ul role="presentation">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <li key={i} role="presentation">
                      <SkeletonRow />
                    </li>
                  ))
                : wikiPages.map((page, i) => {
                    const idx = wikiOffset + i
                    const resultId = `search-result-${resultIds[idx]}`
                    // Project wiki pages live under /projects/:projectId/wiki/:pageId
                    // Workspace-level wiki pages live under /wiki/:pageId
                    const url = page.project
                      ? `/projects/${page.project.id}/wiki/${page.id}`
                      : `/wiki/${page.id}`
                    return (
                      <li
                        key={page.id}
                        id={resultId}
                        role="option"
                        className={cn(
                          'px-4 py-2.5 cursor-pointer border-b border-gray-50 dark:border-gray-800/50 last:border-0',
                          focusedIndex === idx
                            ? 'bg-indigo-50 dark:bg-indigo-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
                        )}
                        onClick={() => handleClick(url)}
                        tabIndex={-1}
                        aria-selected={focusedIndex === idx}
                      >
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-gray-400 dark:text-gray-500 shrink-0" aria-hidden="true" />
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug line-clamp-1">
                            {page.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 ml-[18px]">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {page.space.name}
                          </span>
                          {page.project ? (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              · {page.project.name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">· —</span>
                          )}
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
                            {relativeTime(page.updated_at)}
                          </span>
                        </div>
                        {page.headline && (
                          <p
                            className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 ml-[18px] [&_mark]:bg-amber-100 [&_mark]:dark:bg-amber-900/40 [&_mark]:text-amber-800 [&_mark]:dark:text-amber-300 [&_mark]:rounded-sm [&_mark]:px-0.5"
                            dangerouslySetInnerHTML={{ __html: sanitiseHeadline(page.headline) }}
                            aria-label="Trecho do resultado"
                          />
                        )}
                      </li>
                    )
                  })}
              {!isLoading && wikiPages.length === 0 && !isEmpty && (
                <li className="px-4 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">Sem páginas wiki</li>
              )}
            </ul>
          </div>

          {/* Ideas column */}
          <div>
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Ideias
              </span>
              {!isLoading && ideas.length > 0 && (
                <span className="text-[10px] text-gray-400 dark:text-gray-600">({ideas.length})</span>
              )}
            </div>
            <ul role="presentation">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <li key={i} role="presentation"><SkeletonRow /></li>
                  ))
                : ideas.map((idea, i) => {
                    const idx = ideaOffset + i
                    const resultId = `search-result-${resultIds[idx]}`
                    return (
                      <li
                        key={idea.id}
                        id={resultId}
                        role="option"
                        className={cn(
                          'px-4 py-2.5 cursor-pointer border-b border-gray-50 dark:border-gray-800/50 last:border-0',
                          focusedIndex === idx
                            ? 'bg-indigo-50 dark:bg-indigo-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
                        )}
                        onClick={() => handleClick('/discovery')}
                        tabIndex={-1}
                        aria-selected={focusedIndex === idx}
                      >
                        <div className="flex items-center gap-1.5">
                          <Lightbulb className="h-3 w-3 text-amber-400 shrink-0" aria-hidden="true" />
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug line-clamp-1">
                            {idea.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 ml-[18px]">
                          <span className="text-xs text-gray-400 dark:text-gray-500">{idea.status}</span>
                        </div>
                        {idea.headline && (
                          <p
                            className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 ml-[18px] [&_mark]:bg-amber-100 [&_mark]:dark:bg-amber-900/40 [&_mark]:text-amber-800 [&_mark]:dark:text-amber-300 [&_mark]:rounded-sm [&_mark]:px-0.5"
                            dangerouslySetInnerHTML={{ __html: sanitiseHeadline(idea.headline) }}
                            aria-label="Trecho do resultado"
                          />
                        )}
                      </li>
                    )
                  })}
              {!isLoading && ideas.length === 0 && !isEmpty && (
                <li className="px-4 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">Sem ideias</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
