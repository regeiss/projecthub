// Shared widget primitives and all project dashboard widgets
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import { useIssues } from '@/hooks/useIssues'
import { useCycles, useCycleProgress } from '@/hooks/useCycles'
import { useMilestones } from '@/hooks/useMilestones'
import { useRisks } from '@/hooks/useRisks'
import { useTimeReport } from '@/hooks/useResources'
import { useProjectMembers } from '@/hooks/useProjects'
import type { StateCategory } from '@/types'

// ─── Primitives ──────────────────────────────────────────────────────────────

export function WidgetCard({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 ${className}`}>
      <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      {children}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-24 items-center justify-center text-xs text-gray-400">{label}</div>
  )
}

// Donut chart (pure SVG, no external dep)
function DonutChart({
  data,
  size = 100,
}: {
  data: { value: number; color: string; label: string }[]
  size?: number
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <EmptyState label="Sem dados" />

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38
  const ir = size * 0.23
  let angle = -Math.PI / 2

  const arcs = data.map((d) => {
    const sweep = (d.value / total) * 2 * Math.PI
    const a0 = angle
    angle += sweep
    const a1 = angle
    const x0 = cx + r * Math.cos(a0)
    const y0 = cy + r * Math.sin(a0)
    const x1 = cx + r * Math.cos(a1)
    const y1 = cy + r * Math.sin(a1)
    const ix0 = cx + ir * Math.cos(a0)
    const iy0 = cy + ir * Math.sin(a0)
    const ix1 = cx + ir * Math.cos(a1)
    const iy1 = cy + ir * Math.sin(a1)
    const large = sweep > Math.PI ? 1 : 0
    return {
      ...d,
      path: `M${x0},${y0} A${r},${r},0,${large},1,${x1},${y1} L${ix1},${iy1} A${ir},${ir},0,${large},0,${ix0},${iy0}Z`,
    }
  })

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="flex-shrink-0">
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill={a.color} />
        ))}
        <text x={cx} y={cy + 5} textAnchor="middle" className="fill-gray-900 dark:fill-gray-100 text-xs font-semibold" fontSize={13}>
          {total}
        </text>
      </svg>
      <ul className="flex flex-col gap-1.5 min-w-0">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="truncate">{d.label}</span>
            <span className="ml-auto pl-2 font-medium text-gray-800 dark:text-gray-200">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Horizontal bar chart
function BarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <ul className="flex flex-col gap-2">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[1fr_auto] items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{d.label}</span>
            <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color ?? '#6366f1' }}
              />
            </div>
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 tabular-nums">{d.value}</span>
        </li>
      ))}
    </ul>
  )
}

// ─── STATE_COLORS ─────────────────────────────────────────────────────────────

const STATE_COLORS: Record<StateCategory, string> = {
  backlog: '#9ca3af',
  unstarted: '#60a5fa',
  started: '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
}
const STATE_LABELS: Record<StateCategory, string> = {
  backlog: 'Backlog',
  unstarted: 'Não iniciado',
  started: 'Em andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

// ─── Widgets ─────────────────────────────────────────────────────────────────

export function StatCardsWidget() {
  const { projectId = '' } = useParams()
  const { data } = useIssues(projectId)
  const issues = data?.results ?? []
  const today = new Date().toISOString().split('T')[0]

  const stats = useMemo(() => {
    const total = issues.length
    const open = issues.filter((i) => i.stateCategory !== 'completed' && i.stateCategory !== 'cancelled').length
    const inProgress = issues.filter((i) => i.stateCategory === 'started').length
    const completed = issues.filter((i) => i.stateCategory === 'completed').length
    const overdue = issues.filter(
      (i) => i.dueDate && i.dueDate < today && i.stateCategory !== 'completed' && i.stateCategory !== 'cancelled',
    ).length
    return { total, open, inProgress, completed, overdue }
  }, [issues, today])

  const cards = [
    { label: 'Total', value: stats.total, icon: TrendingUp, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'Em aberto', value: stats.open, icon: Clock, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Em andamento', value: stats.inProgress, icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Concluídas', value: stats.completed, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Atrasadas', value: stats.overdue, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl border border-gray-200 dark:border-gray-700 ${c.bg} p-4`}>
          <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
          <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  )
}

export function IssuesByStateWidget() {
  const { projectId = '' } = useParams()
  const { data: page } = useIssues(projectId)
  const issues = page?.results ?? []

  const data = useMemo(() => {
    const counts: Partial<Record<StateCategory, number>> = {}
    for (const issue of issues) {
      const cat = issue.stateCategory
      if (cat) counts[cat] = (counts[cat] ?? 0) + 1
    }
    return (Object.entries(counts) as [StateCategory, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([cat, value]) => ({ label: STATE_LABELS[cat], value, color: STATE_COLORS[cat] }))
  }, [issues])

  return (
    <WidgetCard title="Issues por status">
      {data.length === 0 ? <EmptyState label="Nenhuma issue" /> : <DonutChart data={data} size={110} />}
    </WidgetCard>
  )
}

export function IssuesByAssigneeWidget() {
  const { projectId = '' } = useParams()
  const { data: page } = useIssues(projectId)
  const issues = page?.results ?? []

  const data = useMemo(() => {
    const map = new Map<string, number>()
    for (const issue of issues) {
      if (issue.stateCategory === 'completed' || issue.stateCategory === 'cancelled') continue
      const name = issue.assignee?.name ?? '(sem responsável)'
      map.set(name, (map.get(name) ?? 0) + 1)
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }))
  }, [issues])

  return (
    <WidgetCard title="Issues em aberto por responsável">
      {data.length === 0 ? <EmptyState label="Nenhuma issue em aberto" /> : <BarChart data={data} />}
    </WidgetCard>
  )
}

export function CycleProgressWidget() {
  const { projectId = '' } = useParams()
  const { data: cycles = [] } = useCycles(projectId)

  const active = useMemo(
    () => cycles.filter((c) => c.status === 'active').slice(0, 3),
    [cycles],
  )

  if (active.length === 0) {
    return (
      <WidgetCard title="Ciclo atual">
        <EmptyState label="Nenhum ciclo ativo" />
      </WidgetCard>
    )
  }

  return (
    <WidgetCard title="Ciclo atual">
      <div className="flex flex-col gap-4">
        {active.map((cycle) => (
          <CycleBar key={cycle.id} projectId={projectId} cycleId={cycle.id} name={cycle.name} />
        ))}
      </div>
    </WidgetCard>
  )
}

function CycleBar({ projectId, cycleId, name }: { projectId: string; cycleId: string; name: string }) {
  const { data } = useCycleProgress(projectId, cycleId)
  const total = data?.totalIssues ?? 0
  const done = data?.completedIssues ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Link
          to={`/projects/${projectId}/cycles`}
          className="text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
        >
          {name}
        </Link>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">{done}/{total} ({pct}%)</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function MilestonesWidget() {
  const { projectId = '' } = useParams()
  const { data: milestones = [] } = useMilestones(projectId)
  const today = new Date().toISOString().split('T')[0]

  const sorted = useMemo(
    () =>
      [...milestones]
        .filter((m) => m.status !== 'reached')
        .sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return a.dueDate.localeCompare(b.dueDate)
        })
        .slice(0, 6),
    [milestones],
  )

  const statusColors: Record<string, string> = {
    pending: 'text-gray-400',
    reached: 'text-green-500',
    missed: 'text-red-500',
  }

  return (
    <WidgetCard title="Milestones">
      {sorted.length === 0 ? (
        <EmptyState label="Nenhum milestone pendente" />
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
          {sorted.map((m) => {
            const overdue = m.dueDate && m.dueDate < today && m.status !== 'reached'
            const pct = m.issueCount > 0 ? Math.round((m.completedCount / m.issueCount) * 100) : 0
            return (
              <li key={m.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <CalendarClock className={`h-4 w-4 flex-shrink-0 ${overdue ? 'text-red-500' : statusColors[m.status]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{m.name}</p>
                  {m.dueDate && (
                    <p className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                      {new Date(m.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                {m.issueCount > 0 && (
                  <span className="text-xs text-gray-400 flex-shrink-0">{pct}%</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </WidgetCard>
  )
}

export function RiskSummaryWidget() {
  const { projectId = '' } = useParams()
  const { data: risks = [] } = useRisks(projectId)

  const open = risks.filter(
    (r) => r.status !== 'closed' && r.status !== 'accepted',
  )

  const buckets = useMemo(() => {
    const low = open.filter((r) => r.score <= 4).length
    const medium = open.filter((r) => r.score >= 5 && r.score <= 9).length
    const high = open.filter((r) => r.score >= 10 && r.score <= 14).length
    const critical = open.filter((r) => r.score >= 15).length
    return [
      { label: 'Crítico', value: critical, color: '#ef4444' },
      { label: 'Alto', value: high, color: '#f97316' },
      { label: 'Médio', value: medium, color: '#eab308' },
      { label: 'Baixo', value: low, color: '#22c55e' },
    ]
  }, [open])

  return (
    <WidgetCard title="Riscos em aberto">
      {open.length === 0 ? (
        <EmptyState label="Nenhum risco aberto" />
      ) : (
        <DonutChart data={buckets.filter((b) => b.value > 0)} size={110} />
      )}
    </WidgetCard>
  )
}

export function TimeLoggedWidget() {
  const { projectId = '' } = useParams()
  const { data: members = [] } = useProjectMembers(projectId)
  const today = new Date()
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

  const { data } = useTimeReport(projectId, { dateFrom: firstDay, dateTo: lastDayStr })

  const topIssues = useMemo(
    () => (data?.rows ?? []).slice(0, 5),
    [data],
  )

  return (
    <WidgetCard title={`Horas apontadas (${today.toLocaleString('pt-BR', { month: 'long' })})`}>
      <div className="mb-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {(data?.totalHours ?? 0).toFixed(1)}h
        </span>
        <span className="text-xs text-gray-400">{members.length} membros</span>
      </div>
      {topIssues.length === 0 ? (
        <EmptyState label="Sem apontamentos no mês" />
      ) : (
        <BarChart
          data={topIssues.map((r) => ({
            label: `#${r.issueSequenceId} ${r.issueTitle}`,
            value: parseFloat(r.totalHours.toFixed(1)),
            color: '#6366f1',
          }))}
        />
      )}
    </WidgetCard>
  )
}
