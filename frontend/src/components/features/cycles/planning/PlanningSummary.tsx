import type { Cycle, SprintPlan } from '@/types'

interface PlanningSummaryProps {
  cycle: Pick<Cycle, 'name' | 'startDate' | 'endDate'>
  plan: SprintPlan | null | undefined
  summary: {
    totalAvailableDays: number
    totalPlannedDays: number
    totalPlannedStoryPoints: number
    overloadedMembers: string[]
  }
}

export function PlanningSummary({ cycle, plan, summary }: PlanningSummaryProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Planejamento da sprint
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{cycle.name}</p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {cycle.startDate} - {cycle.endDate}
        </p>
        <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
          {plan?.status === 'applied' ? 'Plano aplicado' : 'Plano em rascunho'}
        </p>
      </div>
      <SummaryMetric label="Capacidade" value={`${summary.totalAvailableDays.toFixed(2)}d`} />
      <SummaryMetric label="Planejado" value={`${summary.totalPlannedDays.toFixed(2)}d`} />
      <SummaryMetric label="Story Points" value={String(summary.totalPlannedStoryPoints)} />
      <SummaryMetric label="Sobrecarga" value={String(summary.overloadedMembers.length)} />
    </div>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  )
}
