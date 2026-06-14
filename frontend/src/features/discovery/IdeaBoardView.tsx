import type { Idea } from '@/types'

const boardColumns = [
  { key: 'new', label: 'Novas' },
  { key: 'reviewing', label: 'Em análise' },
  { key: 'planned', label: 'Planejadas' },
  { key: 'building', label: 'Em execução' },
  { key: 'shipped', label: 'Entregues' },
  { key: 'parked', label: 'Estacionadas' },
] as const

export function IdeaBoardView({ ideas, onSelect }: { ideas: Idea[]; onSelect?: (idea: Idea) => void }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {boardColumns.map((column) => {
        const columnIdeas = ideas.filter((idea) => idea.status === column.key)

        return (
          <section
            key={column.key}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{column.label}</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
                {columnIdeas.length}
              </span>
            </div>

            <div className="space-y-3">
              {columnIdeas.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-4 text-sm text-gray-400 dark:text-gray-500">
                  Nenhuma ideia nesta coluna.
                </div>
              ) : (
                columnIdeas.map((idea) => (
                  <article
                    key={idea.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Abrir detalhes da ideia: ${idea.title}`}
                    onClick={() => onSelect?.(idea)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.(idea)}
                    className="cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 shadow-sm transition-all hover:border-gray-300 dark:hover:border-gray-600 hover:shadow focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{idea.title}</h4>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {idea.summary || 'Sem resumo por enquanto.'}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                        {idea.ownerName || 'Sem responsável'}
                      </span>
                      {idea.scorecard != null && idea.scorecard.score > 0 && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          {idea.scorecard.score.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

