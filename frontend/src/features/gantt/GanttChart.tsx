import { useMemo } from 'react'
import { useCpmGantt } from '@/hooks/useCpm'
import { PageSpinner } from '@/components/ui/Spinner'
import type { GanttTask } from '@/types'

interface GanttChartProps {
  projectId: string
}

const DAY_WIDTH = 44
const ROW_HEIGHT = 68
const BAR_HEIGHT = 36
const BAR_TOP = (ROW_HEIGHT - BAR_HEIGHT) / 2
const WEEK_H = 28
const DAY_H = 28
const HEADER_H = WEEK_H + DAY_H
const SIDEBAR_W = 220
const AVATAR_R = 14

const PALETTE = [
  { bar: ['#ec4899', '#f43f5e'], text: '#fff', avatar: '#be185d' },
  { bar: ['#fda4af', '#fecdd3'], text: '#9f1239', avatar: '#fb7185' },
  { bar: ['#3b82f6', '#60a5fa'], text: '#fff', avatar: '#1d4ed8' },
  { bar: ['#a78bfa', '#c4b5fd'], text: '#fff', avatar: '#7c3aed' },
  { bar: ['#34d399', '#6ee7b7'], text: '#fff', avatar: '#059669' },
  { bar: ['#fb923c', '#fbbf24'], text: '#fff', avatar: '#c2410c' },
  { bar: ['#38bdf8', '#818cf8'], text: '#fff', avatar: '#0369a1' },
  { bar: ['#f472b6', '#c084fc'], text: '#fff', avatar: '#a21caf' },
]

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isoWeek(d: Date) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// Parse "YYYY-MM-DD" (or "YYYY-MM-DDTHH:mm:ssZ") as a local date, avoiding
// UTC-midnight → previous-day shift in negative-offset timezones (e.g. UTC-3).
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtMonDay(d: Date) {
  return d.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
}

function fmtDay(d: Date) {
  return String(d.getDate())
}

function fmtMonAbbr(d: Date) {
  return d.toLocaleDateString('pt-BR', { month: 'short' })
}

function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000)
}

interface WeekGroup {
  label: string
  startDay: number
  count: number
}

function buildDaysAndWeeks(minDate: Date, totalDays: number) {
  const days: Date[] = []
  for (let i = 0; i < totalDays; i++) days.push(addDays(minDate, i))

  const weeks: WeekGroup[] = []
  let wStart = 0
  let wNum = isoWeek(days[0])
  for (let i = 1; i <= days.length; i++) {
    const w = i < days.length ? isoWeek(days[i]) : -1
    if (w !== wNum || i === days.length) {
      const from = days[wStart]
      const to = days[i - 1]
      weeks.push({
        label: `${fmtMonDay(from)} – ${fmtMonDay(to)}  W${wNum}`,
        startDay: wStart,
        count: i - wStart,
      })
      wStart = i
      wNum = w
    }
  }
  return { days, weeks }
}

interface Arrow {
  x1: number
  y1: number
  x2: number
  y2: number
}

// Gera um caminho ortogonal com cantos arredondados:
// saída horizontal → vertical → entrada horizontal (nunca sobrepõe barras)
function arrowPath(x1: number, y1: number, x2: number, y2: number): string {
  const STUB = 14  // distância horizontal antes de virar
  const R = 5      // raio do canto

  if (Math.abs(y1 - y2) < 1) return `M ${x1} ${y1} H ${x2}`

  // Se há espaço, vira logo após x1; senão, vira antes de x2 (rota em Z)
  const viaX = x2 > x1 + 2 * STUB ? x1 + STUB : x2 - STUB
  const vs = y2 > y1 ? 1 : -1   // sinal vertical: +1 para baixo, -1 para cima
  const hr1 = viaX >= x1 ? 1 : -1   // sinal do 1º segmento horizontal
  const hr2 = x2 >= viaX ? 1 : -1   // sinal do 2º segmento horizontal

  // sweep do arco 1 (horizontal→vertical): 1 quando hr1 e vs têm mesmo sinal
  const sw1 = hr1 * vs > 0 ? 1 : 0
  // sweep do arco 2 (vertical→horizontal): 1 quando vs e hr2 têm sinais opostos
  const sw2 = vs * hr2 < 0 ? 1 : 0

  return [
    `M ${x1} ${y1}`,
    `H ${viaX - hr1 * R}`,
    `a ${R},${R} 0 0,${sw1} ${hr1 * R},${vs * R}`,
    `V ${y2 - vs * R}`,
    `a ${R},${R} 0 0,${sw2} ${hr2 * R},${vs * R}`,
    `H ${x2}`,
  ].join(' ')
}

export function GanttChart({ projectId }: GanttChartProps) {
  const { data: tasks, isLoading } = useCpmGantt(projectId)

  const derived = useMemo(() => {
    if (!tasks || tasks.length === 0) return null

    const allDates = tasks.flatMap((t: GanttTask) => [parseLocalDate(t.start), parseLocalDate(t.end)])
    const rawMin = startOfDay(new Date(Math.min(...allDates.map((d) => d.getTime()))))
    const rawMax = startOfDay(new Date(Math.max(...allDates.map((d) => d.getTime()))))
    // Pad 1 day each side
    const minDate = addDays(rawMin, -1)
    const maxDate = addDays(rawMax, 1)
    const totalDays = daysBetween(minDate, maxDate) + 1

    const { days, weeks } = buildDaysAndWeeks(minDate, totalDays)

    const today = startOfDay(new Date())
    const todayOffset = daysBetween(minDate, today)

    const taskMap = new Map<string, number>()
    tasks.forEach((t: GanttTask, i: number) => taskMap.set(t.id, i))

    const arrows: Arrow[] = []
    tasks.forEach((task: GanttTask, rowIdx: number) => {
      if (!task.dependencies) return
      task.dependencies
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .forEach((depId: string) => {
          const depRow = taskMap.get(depId)
          if (depRow === undefined) return
          const depTask = tasks[depRow]
          const depEndDay = daysBetween(minDate, parseLocalDate(depTask.end))
          const taskStartDay = daysBetween(minDate, parseLocalDate(task.start))
          const x1 = (depEndDay + 1) * DAY_WIDTH
          const y1 = depRow * ROW_HEIGHT + ROW_HEIGHT / 2
          const x2 = taskStartDay * DAY_WIDTH
          const y2 = rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2
          arrows.push({ x1, y1, x2, y2 })
        })
    })

    return { minDate, totalDays, days, weeks, todayOffset, arrows }
  }, [tasks])

  if (isLoading) return <PageSpinner />
  if (!tasks || tasks.length === 0 || !derived) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Calcule o CPM para ver o Gantt
      </div>
    )
  }

  const { minDate, totalDays, days, weeks, todayOffset, arrows } = derived
  const timelineW = totalDays * DAY_WIDTH
  const timelineH = tasks.length * ROW_HEIGHT

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10"
        style={{ width: SIDEBAR_W }}
      >
        <div
          className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950"
          style={{ height: HEADER_H }}
        />
        {(tasks as GanttTask[]).map((task, i) => (
          <div
            key={task.id}
            className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-4"
            style={{ height: ROW_HEIGHT }}
          >
            {task.isCritical && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
            )}
            <span
              className="truncate text-xs font-medium text-gray-700 dark:text-gray-300"
              title={task.name}
            >
              {task.name}
            </span>
          </div>
        ))}
      </div>

      {/* Scrollable timeline */}
      <div className="flex-1 overflow-auto">
        <div style={{ width: timelineW, minWidth: '100%' }}>
          {/* Week header */}
          <div
            className="flex sticky top-0 z-10 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-700"
            style={{ height: WEEK_H }}
          >
            {weeks.map((wk, i) => (
              <div
                key={i}
                className="flex items-center justify-start pl-2 border-r border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 overflow-hidden whitespace-nowrap"
                style={{ width: wk.count * DAY_WIDTH, height: WEEK_H }}
              >
                {wk.label}
              </div>
            ))}
          </div>

          {/* Day header */}
          <div
            className="flex sticky z-10 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-700"
            style={{ top: WEEK_H, height: DAY_H }}
          >
            {days.map((day, i) => {
              const isFirst = i === 0 || day.getDate() === 1
              return (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center border-r border-gray-100 dark:border-gray-800 overflow-hidden"
                  style={{ width: DAY_WIDTH, height: DAY_H }}
                >
                  {isFirst && (
                    <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500 leading-none">
                      {fmtMonAbbr(day)}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">
                    {fmtDay(day)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Body */}
          <div className="relative" style={{ height: timelineH }}>
            {/* Vertical grid lines */}
            {days.map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-r border-gray-100 dark:border-gray-800"
                style={{ left: (i + 1) * DAY_WIDTH - 1 }}
              />
            ))}

            {/* Horizontal row lines */}
            {(tasks as GanttTask[]).map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-800"
                style={{ top: (i + 1) * ROW_HEIGHT - 1 }}
              />
            ))}

            {/* Today indicator */}
            {todayOffset >= 0 && todayOffset < totalDays && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: (todayOffset + 0.5) * DAY_WIDTH }}
              >
                <div className="h-full w-px bg-rose-500 opacity-80" />
              </div>
            )}

            {/* Dependency arrows */}
            <svg
              className="absolute inset-0 pointer-events-none z-10"
              width={timelineW}
              height={timelineH}
              style={{ overflow: 'visible' }}
            >
              <defs>
                <marker
                  id="arrow-head"
                  markerWidth="6"
                  markerHeight="6"
                  refX="3"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L0,6 L6,3 z" fill="#9ca3af" />
                </marker>
              </defs>
              {arrows.map((a, i) => (
                <g key={i}>
                  <path
                    d={arrowPath(a.x1, a.y1, a.x2, a.y2)}
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="1.5"
                    markerEnd="url(#arrow-head)"
                  />
                  <circle cx={a.x1} cy={a.y1} r={3} fill="none" stroke="#9ca3af" strokeWidth="1.5" />
                </g>
              ))}
            </svg>

            {/* Task bars */}
            {(tasks as GanttTask[]).map((task, rowIdx) => {
              const color = PALETTE[rowIdx % PALETTE.length]
              const startDay = daysBetween(minDate, parseLocalDate(task.start))
              const endDay = daysBetween(minDate, parseLocalDate(task.end))
              const durationDays = endDay - startDay + 1
              const barLeft = startDay * DAY_WIDTH
              const barWidth = durationDays * DAY_WIDTH
              const barTop = rowIdx * ROW_HEIGHT + BAR_TOP
              const initial = task.name.charAt(0).toUpperCase()
              const startLabel = fmtMonDay(parseLocalDate(task.start))
              const endLabel = fmtMonDay(parseLocalDate(task.end))

              return (
                <div key={task.id}>
                  {/* Bar */}
                  <div
                    className="absolute flex items-center overflow-hidden"
                    style={{
                      left: barLeft,
                      top: barTop,
                      width: barWidth,
                      height: BAR_HEIGHT,
                      borderRadius: BAR_HEIGHT / 2,
                      background: `linear-gradient(90deg, ${color.bar[0]}, ${color.bar[1]})`,
                      boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
                    }}
                    title={`${task.name}: ${startLabel} — ${endLabel}`}
                  >
                    {/* Avatar */}
                    <div
                      className="flex-shrink-0 flex items-center justify-center rounded-full border-2 border-white/60 font-bold select-none"
                      style={{
                        width: AVATAR_R * 2,
                        height: AVATAR_R * 2,
                        marginLeft: 4,
                        fontSize: 11,
                        background: color.avatar,
                        color: '#fff',
                      }}
                    >
                      {initial}
                    </div>
                    {/* Task name */}
                    <span
                      className="ml-2 truncate text-xs font-semibold"
                      style={{ color: color.text }}
                    >
                      {task.name}
                    </span>
                  </div>

                  {/* Start date label */}
                  <div
                    className="absolute text-[10px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap pointer-events-none select-none"
                    style={{
                      left: barLeft,
                      top: barTop - 16,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {startLabel}
                  </div>

                  {/* End date label */}
                  <div
                    className="absolute text-[10px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap pointer-events-none select-none"
                    style={{
                      left: barLeft + barWidth,
                      top: barTop - 16,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {endLabel}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
