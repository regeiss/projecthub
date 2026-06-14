import { cn } from '@/lib/utils'
import type { Idea } from '@/types'

const STATUS_ORDER: Idea['status'][] = ['new', 'reviewing', 'planned', 'building', 'shipped', 'parked']

const STATUS_LABELS: Record<Idea['status'], string> = {
  new: 'Nova',
  reviewing: 'Em análise',
  planned: 'Planejada',
  building: 'Em execução',
  shipped: 'Entregue',
  parked: 'Estacionada',
}

const STATUS_COLORS: Record<Idea['status'], string> = {
  new: 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300',
  reviewing: 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300',
  planned: 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300',
  building: 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300',
  shipped: 'bg-green-100 border-green-300 text-green-800 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300',
  parked: 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300',
}

const STATUS_BAR: Record<Idea['status'], string> = {
  new: 'bg-amber-400',
  reviewing: 'bg-blue-400',
  planned: 'bg-purple-400',
  building: 'bg-orange-400',
  shipped: 'bg-green-500',
  parked: 'bg-gray-400',
}

interface Props {
  ideas: Idea[]
  onSelect: (idea: Idea) => void
}

export function IdeaRoadmapView({ ideas, onSelect }: Props) {
  const grouped = STATUS_ORDER.reduce<Record<string, Idea[]>>((acc, status) => {
    acc[status] = ideas.filter((i) => i.status === status)
    return acc
  }, {})

  const maxInGroup = Math.max(...STATUS_ORDER.map((s) => grouped[s].length), 1)

  return (
    <div
      role="region"
      aria-label="Visão de roadmap de ideias"
      className="overflow-x-auto pb-4"
    >
      <div className="min-w-[680px]">
        {/* Stage header */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${STATUS_ORDER.length}, 1fr)` }}>
          {STATUS_ORDER.map((status) => {
            const count = grouped[status].length
            const pct = maxInGroup > 0 ? (count / maxInGroup) : 0
            return (
              <div key={status} className="flex flex-col gap-1">
                <div className="flex items-center justify-between px-1">
                  <span className={cn(
                    'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                    STATUS_COLORS[status],
                  )}>
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{count}</span>
                </div>
                {/* Progress fill bar showing relative volume */}
                <div className="h-1 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={cn('h-1 rounded-full transition-all', STATUS_BAR[status])}
                    style={{ width: `${pct * 100}%` }}
                    role="presentation"
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Cards */}
        <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${STATUS_ORDER.length}, 1fr)` }}>
          {STATUS_ORDER.map((status) => (
            <div key={status} className="flex flex-col gap-2 min-h-[120px]">
              {grouped[status].map((idea) => (
                <button
                  key={idea.id}
                  type="button"
                  onClick={() => onSelect(idea)}
                  aria-label={`Abrir ideia: ${idea.title}`}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400',
                    'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
                  )}
                >
                  <p className="line-clamp-2 text-xs font-medium text-gray-900 dark:text-gray-100 leading-snug">
                    {idea.title}
                  </p>
                  {idea.scorecard != null && idea.scorecard.score > 0 && (
                    <span className="mt-1.5 inline-block rounded-full bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                      {idea.scorecard.score.toFixed(1)}
                    </span>
                  )}
                </button>
              ))}
              {grouped[status].length === 0 && (
                <div className="flex items-center justify-center min-h-[60px] rounded-lg border border-dashed border-gray-200 dark:border-gray-800">
                  <span className="text-[10px] text-gray-300 dark:text-gray-700">vazio</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
