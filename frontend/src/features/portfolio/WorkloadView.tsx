import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { usePortfolioDashboard } from '@/hooks/usePortfolio'
import { resourceService } from '@/services/resource.service'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner, PageSpinner } from '@/components/ui/Spinner'

interface Props {
  portfolioId: string
}

const PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#f97316', '#14b8a6', '#ec4899', '#84cc16',
]

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function WorkloadView({ portfolioId }: Props) {
  const [period, setPeriod] = useState(currentMonthStr())
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id ?? null)

  const { data: dashData, isLoading: dashLoading } = usePortfolioDashboard(portfolioId)
  const projects = dashData?.projects ?? []

  const workloadQueries = useQueries({
    queries: projects.map((pp) => ({
      queryKey: ['project-workload', workspaceId, pp.projectId, period],
      queryFn: () => resourceService.getProjectWorkload(pp.projectId, { period }),
      enabled: !!pp.projectId,
    })),
  })

  const isLoadingWorkload = workloadQueries.some((q) => q.isLoading)

  // Aggregate member workloads across all portfolio projects
  const memberMap = new Map<
    string,
    { name: string; avatar: string | null; plannedDays: number; actualDays: number }
  >()
  workloadQueries.forEach((q) => {
    if (!q.data) return
    q.data.forEach((w) => {
      const existing = memberMap.get(w.memberId)
      if (existing) {
        existing.plannedDays += w.plannedDays
        existing.actualDays  += w.actualDays
      } else {
        memberMap.set(w.memberId, {
          name:        w.memberName,
          avatar:      w.memberAvatar,
          plannedDays: w.plannedDays,
          actualDays:  w.actualDays,
        })
      }
    })
  })
  const members = Array.from(memberMap.values())
    .filter((m) => m.plannedDays > 0 || m.actualDays > 0)
    .sort((a, b) => b.plannedDays - a.plannedDays)

  if (dashLoading) return <PageSpinner />

  if (projects.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Nenhum projeto no portfolio
      </div>
    )
  }

  const maxIssues = Math.max(...projects.map((p) => p.evm?.totalIssues ?? 0), 1)
  const maxDays   = Math.max(...members.map((m) => Math.max(m.plannedDays, m.actualDays)), 1)

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Workload</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">Período</span>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-8 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ── Issues por projeto ── */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Issues por projeto
          </p>
          <div className="space-y-4">
            {projects.map((pp, idx) => {
              const total = pp.evm?.totalIssues    ?? 0
              const done  = pp.evm?.completedIssues ?? 0
              const color = PALETTE[idx % PALETTE.length]
              return (
                <div key={pp.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span
                        className="truncate text-xs text-gray-700 dark:text-gray-300"
                        title={pp.projectName}
                      >
                        <span className="mr-1 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                          {pp.projectIdentifier}
                        </span>
                        {pp.projectName}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-gray-400 dark:text-gray-500">
                      {done}/{total}
                    </span>
                  </div>
                  <div className="relative h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    {/* total scope bar */}
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-gray-200 dark:bg-gray-700"
                      style={{ width: `${(total / maxIssues) * 100}%` }}
                    />
                    {/* completed fill */}
                    <div
                      className="absolute left-0 top-0 h-full rounded-full transition-all"
                      style={{ width: `${(done / maxIssues) * 100}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Carga por membro ── */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Carga por membro
          </p>

          {isLoadingWorkload ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : members.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
              Sem dados de workload para este período
            </p>
          ) : (
            <div className="space-y-5">
              {members.map((m) => {
                const plannedPct = (m.plannedDays / maxDays) * 100
                const actualPct  = (m.actualDays  / maxDays) * 100
                const overloaded = m.actualDays > m.plannedDays && m.plannedDays > 0
                return (
                  <div key={m.name}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Avatar src={m.avatar} name={m.name} size="sm" />
                        <span className="truncate text-xs text-gray-700 dark:text-gray-300">
                          {m.name}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 font-mono text-xs ${overloaded ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}
                      >
                        {m.actualDays.toFixed(1)}d / {m.plannedDays.toFixed(1)}d
                      </span>
                    </div>
                    {/* Planned bar */}
                    <div className="relative mb-0.5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full bg-indigo-200 dark:bg-indigo-900 transition-all"
                        style={{ width: `${plannedPct}%` }}
                      />
                    </div>
                    {/* Actual bar */}
                    <div className="relative h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full transition-all ${overloaded ? 'bg-amber-500' : 'bg-indigo-500'}`}
                        style={{ width: `${actualPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              {/* Legend */}
              <div className="flex items-center gap-4 pt-1 text-[10px] text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-4 rounded bg-indigo-200 dark:bg-indigo-900" />
                  Planejado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-4 rounded bg-indigo-500" />
                  Realizado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-4 rounded bg-amber-500" />
                  Acima do planejado
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
