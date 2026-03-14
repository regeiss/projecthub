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

  // Compute timeline range
  const allDates = projects.flatMap((p) =>
    [p.startDate, p.endDate].filter(Boolean).map((d) => new Date(d!)),
  )
  const minDate = allDates.length
    ? new Date(Math.min(...allDates.map((d) => d.getTime())))
    : new Date()
  const maxDate = allDates.length
    ? new Date(Math.max(...allDates.map((d) => d.getTime())))
    : new Date(Date.now() + 90 * 86400000)
  const totalDays = Math.max(
    (maxDate.getTime() - minDate.getTime()) / 86400000 + 1,
    30,
  )

  function barStyle(startDate: string | null, endDate: string | null) {
    if (!startDate || !endDate) return { display: 'none' as const }
    const s = new Date(startDate)
    const e = new Date(endDate)
    const offsetPct = ((s.getTime() - minDate.getTime()) / 86400000 / totalDays) * 100
    const widthPct = ((e.getTime() - s.getTime()) / 86400000 / totalDays) * 100
    return {
      left: `${Math.max(0, offsetPct)}%`,
      width: `${Math.max(1, widthPct)}%`,
    }
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
                Linha do tempo ({formatDate(minDate.toISOString())} — {formatDate(maxDate.toISOString())})
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
                  <div className="relative h-6 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
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
