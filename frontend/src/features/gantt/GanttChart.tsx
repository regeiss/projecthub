import { useMemo, useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCpmGantt, useUpdateCpmDuration } from '@/hooks/useCpm'
import { useUpdateIssue } from '@/hooks/useIssues'
import { PageSpinner } from '@/components/ui/Spinner'
import type { GanttTask } from '@/types'

interface GanttChartProps {
  projectId: string
}

export interface GanttChartHandle {
  scrollToToday: () => void
  zoomToFit: () => void
}

const DAY_WIDTH = 44
const ROW_HEIGHT = 68
const BAR_HEIGHT = 36
const BAR_TOP = (ROW_HEIGHT - BAR_HEIGHT) / 2
const WEEK_H = 28
const DAY_H = 28
const HEADER_H = WEEK_H + DAY_H
const SIDEBAR_W = 280
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

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Logical arrow — stores day indices, not pixels (pixels depend on zoom)
interface LogicalArrow {
  depTaskId: string   // used to recompute x1 when duration is drafted
  succTaskId: string  // used to recompute x2 when start is drafted
  depStartDay: number // start of the dep task (x1 = depStartDay + effectiveDuration)
  x1Day: number       // original x1 (= depStartDay + origDuration)
  row1: number
  x2Day: number
  row2: number
}

function arrowPath(x1: number, y1: number, x2: number, y2: number): string {
  const STUB = 14
  const R = 5

  if (Math.abs(y1 - y2) < 1) return `M ${x1} ${y1} H ${x2}`

  const vs = y2 > y1 ? 1 : -1
  const sw_cw = vs > 0 ? 1 : 0
  const sw_cc = vs > 0 ? 0 : 1

  if (x2 > x1 + 2 * STUB) {
    return [
      `M ${x1} ${y1}`,
      `H ${x1 + STUB - R}`,
      `a ${R},${R} 0 0,${sw_cw} ${R},${vs * R}`,
      `V ${y2 - vs * R}`,
      `a ${R},${R} 0 0,${sw_cc} ${R},${vs * R}`,
      `H ${x2}`,
    ].join(' ')
  } else {
    const midY = (y1 + y2) / 2
    const exitX = x1 + STUB
    const approachX = x2 - STUB
    return [
      `M ${x1} ${y1}`,
      `H ${exitX - R}`,
      `a ${R},${R} 0 0,${sw_cw} ${R},${vs * R}`,
      `V ${midY - vs * R}`,
      `a ${R},${R} 0 0,${sw_cw} ${-R},${vs * R}`,
      `H ${approachX + R}`,
      `a ${R},${R} 0 0,${sw_cc} ${-R},${vs * R}`,
      `V ${y2 - vs * R}`,
      `a ${R},${R} 0 0,${sw_cc} ${R},${vs * R}`,
      `H ${x2}`,
    ].join(' ')
  }
}

interface GanttDragState {
  taskId: string
  startX: number
  origDuration: number
  dayW: number
}

interface GanttStartDragState {
  taskId: string
  taskStart: string  // ISO date of the task's current start
  startX: number
  origDuration: number
  dayW: number
}

export const GanttChart = forwardRef<GanttChartHandle, GanttChartProps>(
  function GanttChart({ projectId }, ref) {
    const navigate = useNavigate()
    const { data: tasks, isLoading } = useCpmGantt(projectId)
    const updateDuration = useUpdateCpmDuration()
    const updateIssue = useUpdateIssue()
    const [zoom, setZoom] = useState(1.0)
    const scrollRef = useRef<HTMLDivElement>(null)
    const [ganttDrag, setGanttDrag] = useState<GanttDragState | null>(null)
    const [draftDurations, setDraftDurations] = useState<Record<string, number>>({})
    const [ganttStartDrag, setGanttStartDrag] = useState<GanttStartDragState | null>(null)
    const [draftStartOffsets, setDraftStartOffsets] = useState<Record<string, number>>({})

    useEffect(() => {
      if (!ganttDrag) return
      const drag = ganttDrag

      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'ew-resize'

      let currentDuration = drag.origDuration

      function onMouseMove(e: MouseEvent) {
        const deltaDays = Math.round((e.clientX - drag.startX) / drag.dayW)
        const next = Math.max(1, drag.origDuration + deltaDays)
        currentDuration = next
        setDraftDurations((d) => ({ ...d, [drag.taskId]: next }))
      }

      function onMouseUp() {
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        if (currentDuration !== drag.origDuration) {
          updateDuration.mutate(
            { projectId, issueId: drag.taskId, durationDays: currentDuration },
            { onSuccess: () => setDraftDurations((d) => { const n = { ...d }; delete n[drag.taskId]; return n }) },
          )
        }
        setGanttDrag(null)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      return () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
      }
    }, [ganttDrag]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      if (!ganttStartDrag) return
      const drag = ganttStartDrag

      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'ew-resize'

      let currentDelta = 0

      function onMouseMove(e: MouseEvent) {
        const deltaDays = Math.round((e.clientX - drag.startX) / drag.dayW)
        // Clamp: end date stays fixed, so duration = origDuration - delta >= 1
        const clamped = Math.min(deltaDays, drag.origDuration - 1)
        currentDelta = clamped
        setDraftStartOffsets((d) => ({ ...d, [drag.taskId]: clamped }))
      }

      function onMouseUp() {
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        if (currentDelta !== 0) {
          const newStart = addDays(parseLocalDate(drag.taskStart), currentDelta)
          updateIssue.mutate(
            { projectId, issueId: drag.taskId, data: { startDate: toISODate(newStart) } },
            {
              onSuccess: () =>
                setDraftStartOffsets((d) => {
                  const n = { ...d }
                  delete n[drag.taskId]
                  return n
                }),
            },
          )
        }
        setGanttStartDrag(null)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      return () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
      }
    }, [ganttStartDrag]) // eslint-disable-line react-hooks/exhaustive-deps

    const derived = useMemo(() => {
      if (!tasks || tasks.length === 0) return null

      const allDates = tasks.flatMap((t: GanttTask) => [parseLocalDate(t.start), parseLocalDate(t.end)])
      const rawMin = startOfDay(new Date(Math.min(...allDates.map((d) => d.getTime()))))
      const rawMax = startOfDay(new Date(Math.max(...allDates.map((d) => d.getTime()))))
      const minDate = addDays(rawMin, -1)
      const maxDate = addDays(rawMax, 1)
      const totalDays = daysBetween(minDate, maxDate) + 1

      const { days, weeks } = buildDaysAndWeeks(minDate, totalDays)

      const today = startOfDay(new Date())
      const todayOffset = daysBetween(minDate, today)

      const taskMap = new Map<string, number>()
      tasks.forEach((t: GanttTask, i: number) => taskMap.set(t.id, i))

      const arrows: LogicalArrow[] = []
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
            const depStartDay = daysBetween(minDate, parseLocalDate(depTask.start))
            arrows.push({
              depTaskId: depTask.id,
              succTaskId: task.id,
              depStartDay,
              x1Day: daysBetween(minDate, parseLocalDate(depTask.end)) + 1,
              row1: depRow,
              x2Day: daysBetween(minDate, parseLocalDate(task.start)),
              row2: rowIdx,
            })
          })
      })

      return { minDate, totalDays, days, weeks, todayOffset, arrows }
    }, [tasks])

    useImperativeHandle(ref, () => ({
      scrollToToday() {
        if (!scrollRef.current || !derived) return
        const dayW = DAY_WIDTH * zoom
        const target = (derived.todayOffset + 0.5) * dayW - scrollRef.current.clientWidth / 2
        scrollRef.current.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
      },
      zoomToFit() {
        if (!scrollRef.current || !derived) return
        const containerW = scrollRef.current.clientWidth
        const newZoom = containerW / (derived.totalDays * DAY_WIDTH)
        setZoom(Math.max(0.2, Math.min(newZoom, 4)))
      },
    }), [derived, zoom])

    if (isLoading) return <PageSpinner />
    if (!tasks || tasks.length === 0 || !derived) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          Calcule o CPM para ver o Gantt
        </div>
      )
    }

    const { minDate, totalDays, days, weeks, todayOffset, arrows } = derived
    const dayW = DAY_WIDTH * zoom
    const timelineW = totalDays * dayW
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
          {(tasks as GanttTask[]).map((task) => (
            <div
              key={task.id}
              className="flex flex-col justify-center gap-0.5 border-b border-gray-100 dark:border-gray-800 px-3"
              style={{ height: ROW_HEIGHT }}
            >
              {/* Issue name */}
              <div className="flex items-center gap-1.5 min-w-0">
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

              {/* Assignee + status */}
              <div className="flex items-center gap-2 min-w-0">
                {/* Assignee */}
                <div className="flex items-center gap-1 min-w-0">
                  {task.assigneeAvatar ? (
                    <img
                      src={task.assigneeAvatar}
                      alt={task.assigneeName ?? ''}
                      className="h-3.5 w-3.5 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-[8px] font-semibold text-gray-500 dark:text-gray-400">
                      {task.assigneeName ? task.assigneeName.charAt(0).toUpperCase() : '—'}
                    </span>
                  )}
                  <span className="truncate text-[10px] text-gray-400 dark:text-gray-500">
                    {task.assigneeName ?? 'Sem responsável'}
                  </span>
                </div>

                {task.stateName && (
                  <>
                    <span className="text-gray-200 dark:text-gray-700 select-none">·</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: task.stateColor ?? '#9ca3af' }}
                      />
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                        {task.stateName}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable timeline */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
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
                  style={{ width: wk.count * dayW, height: WEEK_H }}
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
                    style={{ width: dayW, height: DAY_H }}
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
                  style={{ left: (i + 1) * dayW - 1 }}
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
                  style={{ left: (todayOffset + 0.5) * dayW }}
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
                {arrows.map((a, i) => {
                  const effectiveX1Day = draftDurations[a.depTaskId] !== undefined
                    ? a.depStartDay + draftDurations[a.depTaskId]
                    : a.x1Day
                  const effectiveX2Day = draftStartOffsets[a.succTaskId] !== undefined
                    ? a.x2Day + draftStartOffsets[a.succTaskId]
                    : a.x2Day
                  const x1 = effectiveX1Day * dayW
                  const y1 = a.row1 * ROW_HEIGHT + ROW_HEIGHT / 2
                  const x2 = effectiveX2Day * dayW
                  const y2 = a.row2 * ROW_HEIGHT + ROW_HEIGHT / 2
                  return (
                    <g key={i}>
                      <path
                        d={arrowPath(x1, y1, x2, y2)}
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="1.5"
                        markerEnd="url(#arrow-head)"
                      />
                      <circle cx={x1} cy={y1} r={3} fill="none" stroke="#9ca3af" strokeWidth="1.5" />
                    </g>
                  )
                })}
              </svg>

              {/* Task bars */}
              {(tasks as GanttTask[]).map((task, rowIdx) => {
                const color = PALETTE[rowIdx % PALETTE.length]
                const startDay = daysBetween(minDate, parseLocalDate(task.start))
                const origDuration = daysBetween(minDate, parseLocalDate(task.end)) - startDay + 1
                const startOffset = draftStartOffsets[task.id] ?? 0
                const effectiveStartDay = startDay + startOffset
                // Right-edge drag: duration changes, start fixed.
                // Left-edge drag: start changes, end fixed → duration = origDuration - offset.
                const effectiveDuration = draftDurations[task.id] ?? (origDuration - startOffset)
                const barLeft = effectiveStartDay * dayW
                const barWidth = effectiveDuration * dayW
                const barTop = rowIdx * ROW_HEIGHT + BAR_TOP
                const initial = task.name.charAt(0).toUpperCase()
                const effectiveStart = addDays(parseLocalDate(task.start), startOffset)
                const startLabel = fmtMonDay(effectiveStart)
                const endLabel = fmtMonDay(addDays(minDate, effectiveStartDay + effectiveDuration - 1))
                const isDragging = ganttDrag?.taskId === task.id || ganttStartDrag?.taskId === task.id

                return (
                  <div key={task.id}>
                    <div
                      className="absolute flex items-center overflow-hidden"
                      style={{
                        left: barLeft,
                        top: barTop,
                        width: barWidth,
                        height: BAR_HEIGHT,
                        borderRadius: BAR_HEIGHT / 2,
                        background: `linear-gradient(90deg, ${color.bar[0]}, ${color.bar[1]})`,
                        boxShadow: isDragging ? '0 4px 16px 0 rgba(0,0,0,0.20)' : '0 2px 8px 0 rgba(0,0,0,0.10)',
                        opacity: isDragging ? 1 : 0.9,
                        cursor: 'pointer',
                      }}
                      title={`${task.name}: ${startLabel} — ${endLabel}`}
                      onClick={() => navigate(`/projects/${projectId}/issues/${task.id}`)}
                    >
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
                      <span
                        className="ml-2 truncate text-xs font-semibold select-none"
                        style={{ color: color.text }}
                      >
                        {task.name}
                      </span>
                      {/* Left-edge resize handle (adjusts start date) */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize rounded-l-full hover:bg-black/20"
                        role="button"
                        aria-label="Ajustar data de início"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setGanttStartDrag({
                            taskId: task.id,
                            taskStart: task.start,
                            startX: e.clientX,
                            origDuration: effectiveDuration,
                            dayW,
                          })
                        }}
                      />
                      {/* Right-edge resize handle (adjusts duration) */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize rounded-r-full hover:bg-black/20"
                        role="button"
                        aria-label="Ajustar duração"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setGanttDrag({ taskId: task.id, startX: e.clientX, origDuration: effectiveDuration, dayW })
                        }}
                      />
                    </div>

                    <div
                      className="absolute text-[10px] font-medium whitespace-nowrap pointer-events-none select-none"
                      style={{
                        left: barLeft,
                        top: barTop - 16,
                        transform: 'translateX(-50%)',
                        color: ganttStartDrag?.taskId === task.id ? color.bar[0] : '#6b7280',
                      }}
                    >
                      {startLabel}
                    </div>

                    <div
                      className="absolute text-[10px] font-medium whitespace-nowrap pointer-events-none select-none"
                      style={{
                        left: barLeft + barWidth,
                        top: barTop - 16,
                        transform: 'translateX(-50%)',
                        color: isDragging ? color.bar[0] : '#6b7280',
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
)
