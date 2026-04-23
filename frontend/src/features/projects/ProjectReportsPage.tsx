import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { BarChart3, Clock3, TrendingUp } from 'lucide-react'
import { useCycles } from '@/hooks/useCycles'
import { useIssues } from '@/hooks/useIssues'
import { formatDate } from '@/lib/utils'

function buildBurndownPoints(cycle: { startDate: string; endDate: string }, issues: { completedAt: string | null }[]) {
  const start = new Date(cycle.startDate)
  const end = new Date(cycle.endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return []

  const total = issues.length
  const countsByDay = new Map<string, number>()
  issues.forEach((issue) => {
    if (!issue.completedAt) return
    const completed = new Date(issue.completedAt)
    if (Number.isNaN(completed.getTime())) return
    const day = completed.toISOString().slice(0, 10)
    if (completed >= start && completed <= end) {
      countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1)
    }
  })

  const points: { day: string; remaining: number; ideal: number }[] = []
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
  let completedSoFar = 0
  for (let i = 0; i <= totalDays; i += 1) {
    const current = new Date(start.getTime() + i * 86400000)
    const dayKey = current.toISOString().slice(0, 10)
    completedSoFar += countsByDay.get(dayKey) ?? 0
    const remaining = Math.max(0, total - completedSoFar)
    const ideal = Math.max(0, Math.round(total - (total / totalDays) * i))
    points.push({ day: dayKey, remaining, ideal })
  }
  return points
}

function velocityMetrics(cycles: { name: string; completedCount?: number; issueCount?: number }[]) {
  return cycles.map((cycle) => ({
    label: cycle.name,
    value: cycle.completedCount ?? 0,
    planned: cycle.issueCount ?? 0,
  }))
}

export function ProjectReportsPage() {
  const { projectId = '' } = useParams()
  const { data: cycles = [], isLoading: loadingCycles } = useCycles(projectId)

  const activeCycle = useMemo(
    () => cycles.find((cycle) => cycle.status === 'active') ?? null,
    [cycles],
  )

  const burndownCycle = useMemo(() => {
    if (activeCycle) return activeCycle
    return cycles.slice().reverse().find((cycle) => cycle.status === 'completed') ?? null
  }, [activeCycle, cycles])

  const cycleId = burndownCycle?.id ?? ''
  const { data: cycleIssuesData = [], isLoading: loadingIssues } = useIssues(projectId, cycleId ? { cycleId } : {})

  const cycleIssues = Array.isArray(cycleIssuesData) ? [] : (cycleIssuesData.results ?? [])

  const burndownData = useMemo(
    () => (burndownCycle ? buildBurndownPoints(burndownCycle, cycleIssues) : []),
    [burndownCycle, cycleIssues],
  )

  const velocityData = useMemo(() => velocityMetrics(cycles.slice(-6)), [cycles])

  const averageVelocity = useMemo(() => {
    if (velocityData.length === 0) return 0
    const sum = velocityData.reduce((acc, item) => acc + item.value, 0)
    return Math.round(sum / velocityData.length)
  }, [velocityData])

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Relatórios</p>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Burndown e Velocity</h1>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              <TrendingUp className="h-4 w-4" /> Velocidade média
            </div>
            <div className="mt-3 text-3xl font-semibold text-gray-900 dark:text-gray-100">{averageVelocity}</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">issues concluídas / ciclo</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              <Clock3 className="h-4 w-4" /> Ciclos analisados
            </div>
            <div className="mt-3 text-3xl font-semibold text-gray-900 dark:text-gray-100">{velocityData.length}</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">ultimos ciclos</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Velocity</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Issues completadas nos últimos ciclos</p>
            </div>
          </div>
          {loadingCycles ? (
            <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Carregando ciclos...</div>
          ) : velocityData.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400">
              Nenhum ciclo encontrado. Crie um ciclo para acompanhar velocidade e burndown.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3">
                {velocityData.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="min-w-[80px] text-xs font-medium text-gray-600 dark:text-gray-400">{item.label}</div>
                    <div className="flex-1 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{
                          width: `${Math.min(
                            100,
                            (item.value / Math.max(1, ...velocityData.map((v) => v.value))) * 100
                          )}%`
                        }}
                      />
                    </div>
                    <div className="min-w-[40px] text-right text-sm font-semibold text-gray-900 dark:text-gray-100">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
                Planejado: {velocityData[velocityData.length - 1]?.planned ?? 0} issues no último ciclo
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Burndown</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {burndownCycle ? `Ciclo ${burndownCycle.name}` : 'Selecione um ciclo ativo para ver o burndown'}
              </p>
            </div>
          </div>
          {loadingIssues || loadingCycles ? (
            <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Carregando dados...</div>
          ) : !burndownCycle ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400">
              Nenhum ciclo disponível para burndown. Crie um ciclo e adicione issues a ele.
            </div>
          ) : burndownData.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400">
              Não há issues suficientes para gerar o burndown.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400">
                <div>Data inicial: {formatDate(burndownCycle.startDate)}</div>
                <div className="text-right">Data final: {formatDate(burndownCycle.endDate)}</div>
              </div>
              <div className="space-y-2">
                <div className="overflow-x-auto">
                  <div className="relative h-64 w-full rounded-2xl bg-gray-950/10 p-4 dark:bg-white/5">
                    <div className="absolute inset-x-0 top-0 h-px bg-gray-200 dark:bg-gray-700" />
                    <div className="absolute inset-x-0 top-1/3 h-px bg-gray-200 dark:bg-gray-700" />
                    <div className="absolute inset-x-0 top-2/3 h-px bg-gray-200 dark:bg-gray-700" />
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gray-200 dark:bg-gray-700" />
                    <div className="absolute inset-0 flex items-end gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                      {burndownData.map((point) => (
                        <div key={point.day} className="relative flex-1">
                          <div className="h-full w-full rounded-b-md bg-primary/20" style={{ height: `${(point.remaining / Math.max(1, burndownData[0].remaining)) * 100}%` }} />
                          <div className="absolute inset-x-0 top-0 h-1 rounded-full bg-indigo-500" style={{ top: `${(1 - point.ideal / Math.max(1, burndownData[0].remaining)) * 100}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <div>Work remaining</div>
                  <div className="text-right">Ideal trend</div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
