import { useParams } from 'react-router-dom'
import { useCycle, useCycleProgress, useUpdateCycle } from '@/hooks/useCycles'
import { useIssues } from '@/hooks/useIssues'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'active', label: 'Ativo' },
  { value: 'completed', label: 'Concluido' },
] as const

export function CycleDetail() {
  const { projectId = '', cycleId = '' } = useParams()
  const { data: cycle, isLoading } = useCycle(projectId, cycleId)
  const { data: progress } = useCycleProgress(projectId, cycleId)
  const { data: issueData } = useIssues(projectId, { cycleId })
  const updateCycle = useUpdateCycle()
  const issues = issueData?.results ?? []

  if (isLoading) return <PageSpinner />
  if (!cycle) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = progress as any
  const completedIssues = Number(p?.completedIssues ?? p?.completed_issues ?? p?.completed ?? 0)
  const totalIssues = Number(p?.totalIssues ?? p?.total_issues ?? p?.total ?? 0)
  const pct = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{cycle.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <Badge
            variant={
              cycle.status === 'active'
                ? 'success'
                : cycle.status === 'completed'
                ? 'info'
                : 'default'
            }
          >
            {cycle.status === 'active' ? 'Ativo' : cycle.status === 'completed' ? 'Concluido' : 'Rascunho'}
          </Badge>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((statusOption) => (
              <Button
                key={statusOption.value}
                type="button"
                size="sm"
                variant={cycle.status === statusOption.value ? 'secondary' : 'outline'}
                disabled={cycle.status === statusOption.value}
                loading={updateCycle.isPending && cycle.status !== statusOption.value}
                onClick={() =>
                  updateCycle.mutate({
                    projectId,
                    cycleId,
                    data: { status: statusOption.value },
                  })
                }
              >
                {statusOption.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {progress && (
        <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Progresso</span>
            <span>
              {progress.completedIssues}/{progress.totalIssues} issues - {pct}%
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

      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-700 dark:bg-gray-900">
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
