import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { resourceService } from '@/services/resource.service'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Spinner } from '@/components/ui/Spinner'

const RANGE_OPTIONS = [3, 6, 12] as const
type Range = (typeof RANGE_OPTIONS)[number]

interface PeriodPoint {
  period: string
  label: string
  available: number
  planned: number
  actual: number
}

function generatePeriods(count: number): { period: string; label: string }[] {
  const out: { period: string; label: string }[] = []
  const today = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d
      .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      .replace('. de ', '/')
      .replace('.', '')
    out.push({ period, label })
  }
  return out
}

// ─── SVG chart ────────────────────────────────────────────────────────────────

const ML = 42, MR = 18, MT = 16, MB = 36
const CH = 160 // chart area height

// Fixed viewBox width (sized for 12 months) keeps font sizes visually consistent
// regardless of how many months are displayed.
const FIXED_CHART_W = 12 * 80  // 960 SVG units

function BarChart({ points }: { points: PeriodPoint[] }) {
  const n = points.length
  const SVG_W = ML + FIXED_CHART_W + MR
  const SVG_H = CH + MT + MB

  const maxVal = Math.max(...points.flatMap((p) => [p.available, p.planned, p.actual]), 1)
  const tickStep = maxVal <= 10 ? 2 : maxVal <= 40 ? 10 : maxVal <= 100 ? 20 : 50
  const yMax = Math.ceil(maxVal / tickStep) * tickStep

  const yOf  = (v: number) => MT + CH - (v / yMax) * CH
  const ticks = Array.from({ length: Math.floor(yMax / tickStep) + 1 }, (_, i) => i * tickStep)

  // groupW adapts to fill the fixed chart width; barW capped so bars don't get huge
  const groupW = FIXED_CHART_W / n
  const barW   = Math.min(20, Math.floor(groupW * 0.2))
  const barGap = Math.max(2, Math.floor(barW * 0.2))

  function groupX(i: number) { return ML + i * groupW + (groupW - 3 * barW - 2 * barGap) / 2 }

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full overflow-visible">
      {/* Gridlines + Y labels */}
      {ticks.map((tick) => {
        const y = yOf(tick)
        return (
          <g key={tick}>
            <line
              x1={ML} y1={y} x2={ML + FIXED_CHART_W} y2={y}
              stroke="currentColor" strokeOpacity={0.08} strokeWidth={1}
              className="text-gray-600 dark:text-gray-300"
            />
            <text
              x={ML - 5} y={y + 3.5}
              textAnchor="end" style={{ fontSize: '7px' }}
              className="fill-gray-400 dark:fill-gray-500"
            >
              {tick}
            </text>
          </g>
        )
      })}

      {/* X-axis baseline */}
      <line
        x1={ML} y1={MT + CH} x2={ML + FIXED_CHART_W} y2={MT + CH}
        stroke="currentColor" strokeOpacity={0.12} className="text-gray-500"
      />

      {/* Bars */}
      {points.map((p, i) => {
        const gx = groupX(i)
        const hAvail   = (p.available / yMax) * CH
        const hPlanned = (p.planned   / yMax) * CH
        const hActual  = (p.actual    / yMax) * CH

        const overPlanned  = p.actual  > p.planned   && p.planned  > 0
        const overCapacity = p.planned > p.available && p.available > 0

        const tooltipAvail   = `Disponível: ${p.available.toFixed(1)}d`
        const tooltipPlanned = `Planejado: ${p.planned.toFixed(1)}d${overCapacity ? ' ⚠ acima da capacidade' : ''}`
        const tooltipActual  = `Realizado: ${p.actual.toFixed(1)}d${overPlanned ? ' ⚠ acima do planejado' : ''}`

        return (
          <g key={p.period}>
            {/* Available bar */}
            {p.available > 0 && (
              <rect
                x={gx} y={yOf(p.available)}
                width={barW} height={hAvail}
                rx={2}
                className="fill-gray-200 dark:fill-gray-700"
              >
                <title>{tooltipAvail}</title>
              </rect>
            )}

            {/* Planned bar */}
            {p.planned > 0 && (
              <rect
                x={gx + barW + barGap} y={yOf(p.planned)}
                width={barW} height={hPlanned}
                rx={2}
                fill={overCapacity ? '#f87171' : '#818cf8'}
              >
                <title>{tooltipPlanned}</title>
              </rect>
            )}

            {/* Actual bar */}
            {p.actual > 0 && (
              <rect
                x={gx + 2 * (barW + barGap)} y={yOf(p.actual)}
                width={barW} height={hActual}
                rx={2}
                fill={overPlanned ? '#f59e0b' : '#34d399'}
              >
                <title>{tooltipActual}</title>
              </rect>
            )}

            {/* X label */}
            <text
              x={gx + (3 * barW + 2 * barGap) / 2}
              y={MT + CH + 14}
              textAnchor="middle" style={{ fontSize: '7px' }}
              className="fill-gray-400 dark:fill-gray-500"
            >
              {p.label}
            </text>
          </g>
        )
      })}

      {/* Legend */}
      <g transform={`translate(${ML + FIXED_CHART_W - 200}, ${MT})`}>
        <rect x={0} y={0} width={10} height={10} rx={1} className="fill-gray-200 dark:fill-gray-700" />
        <text x={14} y={9} style={{ fontSize: '7px' }} className="fill-gray-500 dark:fill-gray-400">Disponível</text>
        <rect x={72} y={0} width={10} height={10} rx={1} fill="#818cf8" />
        <text x={86} y={9} style={{ fontSize: '7px' }} className="fill-gray-500 dark:fill-gray-400">Planejado</text>
        <rect x={144} y={0} width={10} height={10} rx={1} fill="#34d399" />
        <text x={158} y={9} style={{ fontSize: '7px' }} className="fill-gray-500 dark:fill-gray-400">Realizado</text>
      </g>
    </svg>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CapacityTrendChart() {
  const [range, setRange] = useState<Range>(6)
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id ?? null)
  const periods = generatePeriods(range)

  const queries = useQueries({
    queries: periods.map(({ period }) => ({
      queryKey: ['workspace-workload', workspaceId, period],
      queryFn: () => resourceService.getWorkload({ period }),
    })),
  })

  const isLoading = queries.some((q) => q.isPending)

  const points: PeriodPoint[] = periods.map(({ period, label }, i) => {
    const rows = queries[i].data ?? []
    return {
      period,
      label,
      available: rows.reduce((s, r) => s + (r.availableDays ?? 0), 0),
      planned:   rows.reduce((s, r) => s + r.plannedDays,   0),
      actual:    rows.reduce((s, r) => s + r.actualDays,    0),
    }
  })

  const hasData = points.some((p) => p.available > 0 || p.planned > 0 || p.actual > 0)

  return (
    <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Capacidade por Período
        </p>
        <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
          {RANGE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRange(n)}
              className={
                range === n
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 font-medium'
                  : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-1'
              }
            >
              {n}m
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : !hasData ? (
          <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
            Sem dados de capacidade para o período
          </p>
        ) : (
          <BarChart points={points} />
        )}
      </div>
    </div>
  )
}
