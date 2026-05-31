import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCycle, useCycleProgress, useUpdateCycle } from '@/hooks/useCycles'
import { useIssues } from '@/hooks/useIssues'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { PageSpinner } from '@/components/ui/Spinner'
import { cn, formatDate } from '@/lib/utils'
import { CyclePlanningBoard } from './planning/CyclePlanningBoard'
import type { Issue } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000))
}

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 min-w-[80px]">
      <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{value}</span>
      <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
    </div>
  )
}

// ─── Burndown SVG ─────────────────────────────────────────────────────────────

function BurndownChart({
  total,
  completed,
  startDate,
  endDate,
}: {
  total: number
  completed: number
  startDate: string
  endDate: string
}) {
  const W = 560
  const H = 100
  const PAD = { top: 8, right: 8, bottom: 4, left: 8 }

  const totalDays = daysBetween(startDate, endDate) || 1
  const todayDay  = Math.min(totalDays, daysBetween(startDate, new Date().toISOString()))
  const remaining = Math.max(0, total - completed)

  const xScale = (day: number) =>
    PAD.left + (day / totalDays) * (W - PAD.left - PAD.right)
  const yScale = (val: number) =>
    PAD.top + (1 - val / (total || 1)) * (H - PAD.top - PAD.bottom)

  // Ideal line: (0, total) → (totalDays, 0)
  const idealD = `M ${xScale(0)} ${yScale(total)} L ${xScale(totalDays)} ${yScale(0)}`

  // Actual line: smooth curve from (0, total) to (todayDay, remaining)
  const x0 = xScale(0)
  const y0 = yScale(total)
  const x1 = xScale(todayDay)
  const y1 = yScale(remaining)
  const cx = (x0 + x1) / 2
  const actualD = `M ${x0} ${y0} C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`

  if (total === 0) return null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Ideal dashed line */}
      <path
        d={idealD}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="5 3"
        className="text-gray-300 dark:text-gray-700"
      />
      {/* Actual line */}
      <path
        d={actualD}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-primary"
      />
      {/* Today dot */}
      <circle
        cx={x1}
        cy={y1}
        r="3"
        fill="currentColor"
        className="text-primary"
      />
    </svg>
  )
}

// ─── Issue row ────────────────────────────────────────────────────────────────

function IssueRow({ issue }: { issue: Issue }) {
  const dot =
    issue.stateCategory === 'completed'
      ? 'bg-green-500'
      : issue.stateCategory === 'started'
      ? 'bg-blue-500'
      : issue.stateCategory === 'cancelled'
      ? 'bg-gray-300 dark:bg-gray-600'
      : 'bg-gray-200 dark:bg-gray-700'

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} />
      <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
        {issue.title}
      </span>
      {issue.sequenceId && (
        <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
          #{issue.sequenceId}
        </span>
      )}
    </div>
  )
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  cycle,
  progress,
  issues,
}: {
  cycle: { name: string; startDate: string; endDate: string; status: string }
  progress: { totalIssues: number; completedIssues: number } | undefined
  issues: Issue[]
}) {
  const total     = progress?.totalIssues     ?? issues.length
  const done      = progress?.completedIssues ?? issues.filter((i) => i.stateCategory === 'completed').length
  const inProg    = issues.filter((i) => i.stateCategory === 'started').length
  const todo      = issues.filter((i) => i.stateCategory === 'backlog' || i.stateCategory === 'unstarted').length

  const topIssues = [...issues]
    .sort((a, b) => {
      const order = { started: 0, unstarted: 1, backlog: 2, completed: 3, cancelled: 4 }
      return (order[a.stateCategory ?? 'backlog'] ?? 2) - (order[b.stateCategory ?? 'backlog'] ?? 2)
    })
    .slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex gap-3">
        <StatCard value={done}   label="feito"   />
        <StatCard value={inProg} label="em and." />
        <StatCard value={todo}   label="a fazer" />
      </div>

      {/* Burndown */}
      {total > 0 && (
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Burndown
          </p>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
            <BurndownChart
              total={total}
              completed={done}
              startDate={cycle.startDate}
              endDate={cycle.endDate}
            />
          </div>
        </section>
      )}

      {/* Top issues */}
      {topIssues.length > 0 && (
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Top tarefas
          </p>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-1 divide-y divide-gray-100 dark:divide-gray-800">
            {topIssues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { value: 'overview',  label: 'Resumo'         },
  { value: 'planning',  label: 'Planejamento'   },
] as const

type Tab = (typeof TABS)[number]['value']

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CycleDetail() {
  const { projectId = '', cycleId = '' } = useParams()
  const { workspace } = useWorkspaceStore()
  const { data: cycle, isLoading } = useCycle(projectId, cycleId)
  const { data: progress } = useCycleProgress(projectId, cycleId)
  const { data: issueData } = useIssues(projectId, { cycleId })
  const updateCycle = useUpdateCycle()
  const [tab, setTab] = useState<Tab>('overview')

  const issues = issueData?.results ?? []

  if (isLoading) return <PageSpinner />
  if (!cycle) return null

  const p = progress as { totalIssues: number; completedIssues: number } | undefined

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      {/* Header */}
      <div className="mb-5">
        {/* Breadcrumb */}
        <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">
          {workspace?.name ?? 'Workspace'} / Ciclos
        </p>

        <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
            {cycle.name}
          </h2>

          {cycle.status === 'active' && (
            <span className="mt-1 shrink-0 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
              ao vivo
            </span>
          )}
          {cycle.status === 'completed' && (
            <span className="mt-1 shrink-0 rounded-full border border-gray-300 dark:border-gray-600 px-3 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              concluído
            </span>
          )}
        </div>

        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          {formatDateShort(cycle.startDate)} – {formatDateShort(cycle.endDate)}
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-5 flex items-center gap-1 border-b border-gray-200 dark:border-gray-800">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              'px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === value
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
            )}
          >
            {label}
          </button>
        ))}

        {/* Status change (compact, right-aligned) */}
        <div className="ml-auto flex items-center gap-1 pb-1">
          {(['draft', 'active', 'completed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => updateCycle.mutate({ projectId, cycleId, data: { status: s } })}
              disabled={cycle.status === s}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                cycle.status === s
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-default'
                  : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              {s === 'draft' ? 'rascunho' : s === 'active' ? 'ativar' : 'concluir'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === 'overview' ? (
        <OverviewTab cycle={cycle} progress={p} issues={issues} />
      ) : (
        <CyclePlanningBoard
          projectId={projectId}
          cycleId={cycleId}
          cycle={{ id: cycle.id, name: cycle.name, startDate: cycle.startDate, endDate: cycle.endDate }}
        />
      )}
    </div>
  )
}
