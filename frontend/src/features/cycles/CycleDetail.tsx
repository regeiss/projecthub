import { useParams } from 'react-router-dom'
import { useCycle, useCycleProgress } from '@/hooks/useCycles'
import { useIssues } from '@/hooks/useIssues'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

export function CycleDetail() {
  const { projectId = '', cycleId = '' } = useParams()
  const { data: cycle, isLoading } = useCycle(projectId, cycleId)
  const { data: progress } = useCycleProgress(projectId, cycleId)
  const { data: issueData } = useIssues(projectId, { cycleId })
  const issues = issueData?.results ?? []

  if (isLoading) return <PageSpinner />
  if (!cycle) return null

  const pct = progress
    ? Math.round((progress.completedIssues / Math.max(progress.totalIssues, 1)) * 100)
    : 0

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{cycle.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
          </p>
        </div>
        <Badge
          variant={
            cycle.status === 'active'
              ? 'success'
              : cycle.status === 'completed'
              ? 'info'
              : 'default'
          }
        >
          {cycle.status === 'active' ? 'Ativo' : cycle.status === 'completed' ? 'Concluído' : 'Rascunho'}
        </Badge>
      </div>

      {/* Progress bar */}
      {progress && (
        <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Progresso</span>
            <span>
              {progress.completedIssues}/{progress.totalIssues} issues — {pct}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Issues */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {issues.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-400 dark:text-gray-500">
            Nenhuma issue neste ciclo
          </p>
        ) : (
          issues.map((issue) => (
            <div key={issue.id} className="flex items-center gap-3 px-4 py-2">
              <span className="w-16 text-xs text-gray-400 dark:text-gray-500">{issue.sequenceId}</span>
              <p className="flex-1 text-sm text-gray-900 dark:text-gray-100">{issue.title}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
