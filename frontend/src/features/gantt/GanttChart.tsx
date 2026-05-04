import { useRef } from 'react'
import { useCpmGantt } from '@/hooks/useCpm'
import { PageSpinner } from '@/components/ui/Spinner'
import type { GanttTask } from '@/types'
import { cn } from '@/lib/utils'

// ─── Layout constants ─────────────────────────────────────────────────────────

const DAY_W    = 44   // px per day column
const ROW_H    = 64   // px per task row
const WEEK_H   = 28   // header: week-range row
const DAY_H    = 24   // header: day-numbers row
const HEADER_H = WEEK_H + DAY_H
const BAR_H    = 34   // height of the pill bar
const BAR_TOP  = (ROW_H - BAR_H) / 2   // vertical offset so bar is centred

// ─── Colours ──────────────────────────────────────────────────────────────────

const CRITICAL_GRAD = { from: '#f43f5e', to: '#fb7185' }   // rose

const NON_CRITICAL_GRADS = [
  { from: '#3b82f6', to: '#60a5fa' },   // blue
  { from: '#8b5cf6', to: '#a78bfa' },   // violet
  { from: '#6366f1', to: '#818cf8' },   // indigo
  { from: '#14b8a6', to: '#2dd4bf' },   // teal
  { from: '#f97316', to: '#fb923c' },   // orange
]

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTH_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtDay(d: Date) {
  return `${MONTH_PT[d.getMonth()]} ${d.getDate()}`
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getISOWeek(d: Date): number {
  const tmp = new Date(d)
  tmp.setHours(0, 0, 0, 0)
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7))
  const jan4 = new Date(tmp.getFullYear(), 0, 4)
  return (
    1 + Math.round(((tmp.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
  )
}

function buildDays(min: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(min)
    d.setDate(d.getDate() + i)
    return d
  })
}

interface WeekGroup { label: string; startIdx: number; count: number }

function groupByWeek(days: Date[]): WeekGroup[] {
  if (!days.length) return []
  const groups: WeekGroup[] = []
  let start = 0
  let wn = getISOWeek(days[0])

  for (let i = 1; i <= days.length; i++) {
    const cur = i < days.length ? getISOWeek(days[i]) : NaN
    if (cur !== wn || i === days.length) {
      groups.push({
        label: `${fmtDay(days[start])} – ${fmtDay(days[i - 1])}  W${wn}`,
        startIdx: start,
        count: i - start,
      })
      start = i
      wn = cur
    }
  }
  return groups
}

// ─── Dependency arrow (SVG) ───────────────────────────────────────────────────

function DepArrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const mid = x1 + 14
  const d = `M${x1},${y1} H${mid} V${y2} H${x2}`
  return (
    <path
      d={d}
      fill="none"
      stroke="#cbd5e1"
      strokeWidth={1.5}
      strokeDasharray="4 3"
      markerEnd="url(#dep-arrow)"
    />
  )
}

// ─── GanttChart ───────────────────────────────────────────────────────────────

interface GanttChartProps {
  projectId: string
  scrollRef?: React.RefObject<HTMLDivElement | null>
}

export function GanttChart({ projectId, scrollRef: externalRef }: GanttChartProps) {
  const { data: tasks = [], isLoading } = useCpmGantt(projectId)
  const internalRef = useRef<HTMLDivElement>(null)
  const containerRef = externalRef ?? internalRef

  if (isLoading) return <PageSpinner />

  if (!tasks.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Calcule o CPM para ver o Gantt
      </div>
    )
  }

  // ── Date range ──────────────────────────────────────────────────────────────

  const allDates = tasks.flatMap((t) => [new Date(t.start), new Date(t.end)])
  const rawMin   = new Date(Math.min(...allDates.map((d) => d.getTime())))
  const rawMax   = new Date(Math.max(...allDates.map((d) => d.getTime())))

  // 3-day padding each side
  const minDate = new Date(rawMin)
  minDate.setDate(minDate.getDate() - 3)
  const totalDays = Math.ceil((rawMax.getTime() - minDate.getTime()) / 86_400_000) + 6

  const days  = buildDays(minDate, totalDays)
  const weeks = groupByWeek(days)

  const totalW = totalDays * DAY_W
  const totalH = tasks.length * ROW_H

  // ── Today marker ────────────────────────────────────────────────────────────

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayOff = (today.getTime() - minDate.getTime()) / 86_400_000
  const todayX   = todayOff * DAY_W

  // ── Task metrics helpers ────────────────────────────────────────────────────

  const taskIdxMap = new Map(tasks.map((t, i) => [t.id, i]))

  function metrics(task: GanttTask) {
    const s = new Date(task.start)
    const e = new Date(task.end)
    s.setHours(0, 0, 0, 0)
    e.setHours(0, 0, 0, 0)
    const offsetDays = (s.getTime() - minDate.getTime()) / 86_400_000
    const durDays    = (e.getTime() - s.getTime()) / 86_400_000 + 1
    return {
      x: offsetDays * DAY_W,
      w: Math.max(durDays * DAY_W, DAY_W),
      start: s,
      end: e,
    }
  }

  // ── Colours ─────────────────────────────────────────────────────────────────

  let nonCritIdx = 0
  const colors = tasks.map((t) =>
    t.isCritical ? CRITICAL_GRAD : NON_CRITICAL_GRADS[nonCritIdx++ % NON_CRITICAL_GRADS.length],
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="h-full overflow-auto bg-white dark:bg-gray-900">
      {/* ── Outer container keeps header sticky ─────────────────────────── */}
      <div style={{ width: totalW, minWidth: '100%', position: 'relative' }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div
          className="sticky top-0 z-20 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          style={{ height: HEADER_H }}
        >
          {/* Week groups */}
          <div className="flex" style={{ height: WEEK_H }}>
            {weeks.map((wk, i) => (
              <div
                key={i}
                className="shrink-0 flex items-center justify-center overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400"
                style={{ width: wk.count * DAY_W }}
              >
                {wk.label}
              </div>
            ))}
          </div>

          {/* Day numbers */}
          <div className="flex" style={{ height: DAY_H }}>
            {days.map((d, i) => {
              const weekend = d.getDay() === 0 || d.getDay() === 6
              const isToday = isoDay(d) === isoDay(today)
              return (
                <div
                  key={i}
                  className={cn(
                    'shrink-0 flex items-center justify-center text-[10px] border-r border-gray-100 dark:border-gray-800',
                    isToday
                      ? 'font-bold text-rose-500'
                      : weekend
                        ? 'text-gray-300 dark:text-gray-600'
                        : 'text-gray-400 dark:text-gray-500',
                  )}
                  style={{ width: DAY_W }}
                >
                  {d.getDate()}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', height: totalH }}>

          {/* Grid columns */}
          {days.map((d, i) => {
            const weekend = d.getDay() === 0 || d.getDay() === 6
            return (
              <div
                key={i}
                className={cn(
                  'absolute top-0 bottom-0 border-r border-gray-100 dark:border-gray-800',
                  weekend && 'bg-gray-50/50 dark:bg-gray-800/10',
                )}
                style={{ left: i * DAY_W, width: DAY_W }}
              />
            )
          })}

          {/* Today vertical line */}
          {todayX >= 0 && todayX <= totalW && (
            <div
              className="absolute top-0 bottom-0 z-10 w-px bg-rose-400/70"
              style={{ left: todayX }}
            />
          )}

          {/* Dependency arrows */}
          <svg
            className="absolute inset-0 pointer-events-none z-20 overflow-visible"
            width={totalW}
            height={totalH}
          >
            <defs>
              <marker
                id="dep-arrow"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
              </marker>
            </defs>

            {tasks.map((task) => {
              if (!task.dependencies) return null
              const deps = task.dependencies.split(',').filter(Boolean)
              const tIdx = taskIdxMap.get(task.id) ?? -1
              if (tIdx === -1) return null
              const { x: tx } = metrics(task)
              const ty = tIdx * ROW_H + ROW_H / 2

              return deps.map((depId) => {
                const sIdx = taskIdxMap.get(depId) ?? -1
                if (sIdx === -1) return null
                const src = metrics(tasks[sIdx])
                const sy  = sIdx * ROW_H + ROW_H / 2
                return (
                  <DepArrow
                    key={`${depId}->${task.id}`}
                    x1={src.x + src.w}
                    y1={sy}
                    x2={tx}
                    y2={ty}
                  />
                )
              })
            })}
          </svg>

          {/* Task rows */}
          {tasks.map((task, i) => {
            const { x, w, start, end } = metrics(task)
            const { from, to } = colors[i]
            const rowY = i * ROW_H

            return (
              <div
                key={task.id}
                className="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-800"
                style={{ top: rowY, height: ROW_H }}
              >
                {/* Start date label */}
                <span
                  className="absolute text-[9px] font-medium text-gray-400 dark:text-gray-500 select-none"
                  style={{ left: x, top: 5 }}
                >
                  {fmtDay(start)}
                </span>

                {/* End date label */}
                <span
                  className="absolute text-[9px] font-medium text-gray-400 dark:text-gray-500 select-none"
                  style={{ left: x + w, top: 5, transform: 'translateX(-100%)' }}
                >
                  {fmtDay(end)}
                </span>

                {/* Pill bar */}
                <div
                  className="absolute flex items-center px-3 rounded-full shadow-sm select-none overflow-hidden"
                  style={{
                    left: x,
                    top: BAR_TOP,
                    width: w,
                    height: BAR_H,
                    background: `linear-gradient(135deg, ${from}, ${to})`,
                  }}
                  title={`${task.name}: ${start.toLocaleDateString('pt-BR')} — ${end.toLocaleDateString('pt-BR')} · folga ${task.slack}d`}
                >
                  <span className="text-[11px] font-semibold text-white truncate leading-none">
                    {task.name}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
