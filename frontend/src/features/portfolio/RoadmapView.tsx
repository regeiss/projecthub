import { usePortfolioRoadmap } from '@/hooks/usePortfolio'
import { RagBadge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

interface RoadmapViewProps {
  portfolioId: string
}

export function RoadmapView({ portfolioId }: RoadmapViewProps) {
  const { data, isLoading } = usePortfolioRoadmap(portfolioId)

  if (isLoading) return <PageSpinner />

  const projects = data?.projects ?? []

  if (projects.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Nenhum projeto no portfolio
      </div>
    )
  }

  // Compute timeline range — snap to month boundaries
  const allDates = projects.flatMap((p) =>
    [p.startDate, p.endDate].filter(Boolean).map((d) => new Date(d!)),
  )
  const rawMin = allDates.length
    ? new Date(Math.min(...allDates.map((d) => d.getTime())))
    : new Date()
  const rawMax = allDates.length
    ? new Date(Math.max(...allDates.map((d) => d.getTime())))
    : new Date(Date.now() + 90 * 86400000)

  // Snap to first day of month / last day of month for clean separators
  const minDate = new Date(rawMin.getFullYear(), rawMin.getMonth(), 1)
  const maxDate = new Date(rawMax.getFullYear(), rawMax.getMonth() + 1, 0)
  const totalMs = Math.max(maxDate.getTime() - minDate.getTime(), 1)

  function pctOf(d: Date) {
    return ((d.getTime() - minDate.getTime()) / totalMs) * 100
  }

  function barStyle(startDate: string | null, endDate: string | null) {
    if (!startDate || !endDate) return { display: 'none' as const }
    const s = new Date(startDate)
    const e = new Date(endDate)
    return {
      left: `${Math.max(0, pctOf(s))}%`,
      width: `${Math.max(0.5, pctOf(e) - pctOf(s))}%`,
    }
  }

  // Month separator lines: first day of each month within the range
  const monthLines: { date: Date; pct: number; label: string }[] = []
  const cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  while (cur <= maxDate) {
    const pct = pctOf(cur)
    monthLines.push({
      date: new Date(cur),
      pct,
      label: `${MONTH_NAMES[cur.getMonth()]} ${String(cur.getFullYear()).slice(2)}`,
    })
    cur.setMonth(cur.getMonth() + 1)
  }

  return (
    <div>
      <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Roadmap</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950">
              <th className="w-48 px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Projeto
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                {/* Month labels header */}
                <div className="relative h-5">
                  {monthLines.map(({ date, pct, label }) => (
                    <span
                      key={date.toISOString()}
                      className="absolute top-0 -translate-x-1/2 select-none whitespace-nowrap text-[10px] font-medium text-gray-400 dark:text-gray-500"
                      style={{ left: `${pct}%` }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </th>
              <th className="w-20 px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                RAG
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {projects.map((pp) => (
              <tr key={pp.id}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  <span className="mr-1.5 font-mono text-xs text-gray-400 dark:text-gray-500">{pp.projectIdentifier}</span>
                  {pp.projectName}
                </td>
                <td className="px-4 py-3">
                  <div className="relative h-6 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    {/* Month separator lines */}
                    {monthLines.map(({ date, pct }) => (
                      <div
                        key={date.toISOString()}
                        className="absolute top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600"
                        style={{ left: `${pct}%` }}
                      />
                    ))}
                    {/* Project bar */}
                    <div
                      className="absolute top-1 h-4 rounded-sm"
                      style={{
                        ...barStyle(pp.startDate, pp.endDate),
                        backgroundColor: pp.projectColor,
                        opacity: 0.75,
                      }}
                      title={`${formatDate(pp.startDate)} — ${formatDate(pp.endDate)}`}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <RagBadge status={pp.ragStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
