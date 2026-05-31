import { useQueries } from '@tanstack/react-query'
import { useProjects } from '@/hooks/useProjects'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { resourceService } from '@/services/resource.service'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'

interface Props {
  period: string
}

// Cell color: % of member capacity consumed by a single project
function cellClass(pct: number) {
  if (pct <= 0) return ''
  if (pct <= 30) return 'bg-green-50 dark:bg-green-900/25'
  if (pct <= 55) return 'bg-green-100 dark:bg-green-800/40'
  if (pct <= 80) return 'bg-amber-100 dark:bg-amber-800/40'
  return 'bg-red-100 dark:bg-red-800/40'
}

function cellTextClass(pct: number) {
  if (pct <= 0) return 'text-gray-300 dark:text-gray-600'
  if (pct <= 55) return 'text-green-700 dark:text-green-400'
  if (pct <= 80) return 'text-amber-700 dark:text-amber-300'
  return 'text-red-700 dark:text-red-400 font-semibold'
}

// Total column: member's total load across all projects vs available capacity
function totalClass(pct: number) {
  if (pct <= 0) return 'bg-gray-50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-500'
  if (pct <= 80) return 'bg-green-100 dark:bg-green-800/40 text-green-800 dark:text-green-300'
  if (pct <= 100) return 'bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300'
  return 'bg-red-200 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-bold'
}

function fmt(n: number) {
  return n % 1 === 0 ? `${n}d` : `${n.toFixed(1)}d`
}

export function WorkloadHeatmap({ period }: Props) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const { data: projects = [] } = useProjects(workspaceId)

  const workloadQueries = useQueries({
    queries: projects.map((p) => ({
      queryKey: ['project-workload', p.id, period],
      queryFn: () => resourceService.getProjectWorkload(p.id, { period }),
      enabled: !!p.id,
    })),
  })

  const isLoading = workloadQueries.some((q) => q.isPending)

  // ── Build matrix ────────────────────────────────────────────────────────────

  type ProjectCell = { planned: number; actual: number }
  type MemberRow = {
    memberId: string
    memberName: string
    memberAvatar: string | null
    availableDays: number
    cells: Map<string, ProjectCell>
  }

  const memberMap = new Map<string, MemberRow>()
  const activeProjectIds = new Set<string>()

  workloadQueries.forEach((q, i) => {
    if (!q.data) return
    const proj = projects[i]
    q.data.forEach((w) => {
      if (w.plannedDays === 0 && w.actualDays === 0) return
      activeProjectIds.add(proj.id)
      if (!memberMap.has(w.memberId)) {
        memberMap.set(w.memberId, {
          memberId: w.memberId,
          memberName: w.memberName,
          memberAvatar: w.memberAvatar,
          availableDays: w.availableDays,
          cells: new Map(),
        })
      }
      const row = memberMap.get(w.memberId)!
      // availableDays is workspace-wide per period — take max in case of rounding diffs
      if (w.availableDays > row.availableDays) row.availableDays = w.availableDays
      row.cells.set(proj.id, { planned: w.plannedDays, actual: w.actualDays })
    })
  })

  const activeProjects = projects.filter((p) => activeProjectIds.has(p.id))

  const rows = Array.from(memberMap.values())
    .map((row) => {
      const totalPlanned = Array.from(row.cells.values()).reduce((s, c) => s + c.planned, 0)
      const totalActual  = Array.from(row.cells.values()).reduce((s, c) => s + c.actual,  0)
      const totalPct     = row.availableDays > 0 ? (totalPlanned / row.availableDays) * 100 : 0
      return { ...row, totalPlanned, totalActual, totalPct }
    })
    .sort((a, b) => b.totalPct - a.totalPct)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Heatmap de Carga por Projeto
        </p>
        <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-5 rounded-sm bg-green-50 dark:bg-green-900/25 border border-green-200 dark:border-green-800/60" />
            ≤ 30%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-5 rounded-sm bg-green-100 dark:bg-green-800/40 border border-green-200 dark:border-green-700/60" />
            31–55%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-5 rounded-sm bg-amber-100 dark:bg-amber-800/40 border border-amber-200 dark:border-amber-700/60" />
            56–80%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-5 rounded-sm bg-red-100 dark:bg-red-800/40 border border-red-200 dark:border-red-700/60" />
            &gt; 80%
          </span>
          <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">
            % da capacidade do membro
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
          Sem alocações registradas para este período
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                <th className="sticky left-0 z-10 min-w-[180px] bg-gray-50 dark:bg-gray-950 px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Membro
                </th>
                {activeProjects.map((p) => (
                  <th
                    key={p.id}
                    title={p.name}
                    className="min-w-[76px] max-w-[90px] px-2 py-2 text-center align-bottom"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        {p.identifier}
                      </span>
                      <span className="max-w-[76px] truncate text-[10px] font-normal text-gray-400 dark:text-gray-500">
                        {p.name}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="min-w-[72px] px-2 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {rows.map((row) => (
                <tr key={row.memberId} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                  {/* Member */}
                  <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar src={row.memberAvatar} name={row.memberName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200 max-w-[120px]">
                          {row.memberName}
                        </p>
                        {row.availableDays > 0 && (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">
                            {fmt(row.availableDays)} disp.
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Per-project cells */}
                  {activeProjects.map((p) => {
                    const cell = row.cells.get(p.id)
                    const planned = cell?.planned ?? 0
                    const actual  = cell?.actual  ?? 0
                    const pct = row.availableDays > 0 ? (planned / row.availableDays) * 100 : 0

                    const tooltip = cell
                      ? `${p.identifier} — ${row.memberName}\nPlanejado: ${fmt(planned)}\nRealizado: ${fmt(actual)}\nCapacidade: ${fmt(row.availableDays)}\n% da capacidade: ${pct.toFixed(0)}%`
                      : ''

                    return (
                      <td
                        key={p.id}
                        title={tooltip}
                        className={cn(
                          'px-2 py-2.5 text-center transition-colors',
                          planned > 0 ? cellClass(pct) : '',
                        )}
                      >
                        {planned > 0 ? (
                          <div className={cn('leading-tight', cellTextClass(pct))}>
                            <div className="text-[11px]">{fmt(planned)}</div>
                            {actual > 0 && (
                              <div className="text-[10px] opacity-70">{fmt(actual)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-200 dark:text-gray-700">—</span>
                        )}
                      </td>
                    )
                  })}

                  {/* Total */}
                  <td
                    title={`Total planejado: ${fmt(row.totalPlanned)}\nTotal realizado: ${fmt(row.totalActual)}\nCapacidade: ${fmt(row.availableDays)}\nUtilização: ${row.totalPct.toFixed(0)}%`}
                    className={cn('px-2 py-2.5 text-center', totalClass(row.totalPct))}
                  >
                    <div className="leading-tight">
                      <div className="text-[11px]">{fmt(row.totalPlanned)}</div>
                      <div className="text-[10px] opacity-80">{row.totalPct.toFixed(0)}%</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
