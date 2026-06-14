import type { ReactNode } from 'react'

import type { Idea } from '@/types'

const statusLabels: Record<Idea['status'], string> = {
  new: 'Nova',
  reviewing: 'Em análise',
  planned: 'Planejada',
  building: 'Em execução',
  shipped: 'Entregue',
  parked: 'Estacionada',
}

const statusColors: Record<Idea['status'], string> = {
  new: 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  reviewing: 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  planned: 'border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
  building: 'border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  shipped: 'border-green-300 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300',
  parked: 'border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const COLS = 'grid-cols-[1.6fr_0.9fr_0.8fr_0.8fr_0.8fr_0.5fr_auto]'

function ScoreBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(Math.max(value / 10, 0), 1) * 100
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={10}
      >
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
        {value > 0 ? value : '—'}
      </span>
    </div>
  )
}

export function IdeaTableView({
  ideas,
  onSelect,
  renderActions,
}: {
  ideas: Idea[]
  onSelect?: (idea: Idea) => void
  renderActions?: (idea: Idea) => ReactNode
}) {
  if (ideas.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
        Nenhuma ideia para exibir na visão de tabela.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <div className={`grid ${COLS} bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400`}>
        <span>Título</span>
        <span>Status</span>
        <span>Impacto</span>
        <span>Esforço</span>
        <span>Importância</span>
        <span>Pontuação</span>
        <span />
      </div>
      <div className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
        {ideas.map((idea) => (
          <div
            key={idea.id}
            role="button"
            tabIndex={0}
            aria-label={`Abrir detalhes da ideia: ${idea.title}`}
            onClick={() => onSelect?.(idea)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.(idea)}
            className={`grid cursor-pointer ${COLS} items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-400 dark:hover:bg-gray-800/50`}
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-900 dark:text-gray-100">{idea.title}</div>
              {idea.summary && (
                <div className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">{idea.summary}</div>
              )}
            </div>

            <div>
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[idea.status]}`}>
                {statusLabels[idea.status]}
              </span>
            </div>

            <ScoreBar value={idea.scorecard?.impact ?? 0} color="bg-amber-400 dark:bg-amber-500" />
            <ScoreBar value={idea.scorecard?.effort ?? 0} color="bg-blue-400 dark:bg-blue-500" />
            <ScoreBar value={idea.scorecard?.reach ?? 0} color="bg-purple-400 dark:bg-purple-500" />

            <div className="text-xs font-medium tabular-nums text-gray-900 dark:text-gray-100">
              {idea.scorecard?.score != null && idea.scorecard.score > 0
                ? idea.scorecard.score.toFixed(1)
                : '—'}
            </div>

            <div onClick={(e) => e.stopPropagation()}>{renderActions?.(idea)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
