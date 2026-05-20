import { useState, useEffect } from 'react'
import { usePortfolioRoadmap, useUpdatePortfolioProject } from '@/hooks/usePortfolio'
import { RagBadge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatDate, cn } from '@/lib/utils'
import type { RoadmapProject } from '@/types'

interface RoadmapViewProps {
  portfolioId: string
}

type Zoom = 'month' | 'quarter' | 'year'
type DragKind = 'move' | 'resize-start' | 'resize-end'

interface DragState {
  kind: DragKind
  projectId: string
  startX: number
  origStart: string
  origEnd: string
  containerWidth: number
  totalMs: number
}

const PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#f97316', '#14b8a6', '#ec4899', '#84cc16',
]

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function projectColor(index: number) { return PALETTE[index % PALETTE.length] }

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Line { key: string; pct: number; label?: string }

function buildLines(minDate: Date, maxDate: Date, zoom: Zoom, pctOf: (d: Date) => number) {
  const primary: Line[] = []
  const secondary: Line[] = []

  if (zoom === 'month') {
    const cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    while (cur <= maxDate) {
      primary.push({ key: cur.toISOString(), pct: pctOf(cur), label: `${MONTH_NAMES[cur.getMonth()]} ${String(cur.getFullYear()).slice(2)}` })
      cur.setMonth(cur.getMonth() + 1)
    }
  } else if (zoom === 'quarter') {
    const qStart = Math.floor(minDate.getMonth() / 3) * 3
    const cur = new Date(minDate.getFullYear(), qStart, 1)
    while (cur <= maxDate) {
      const q = Math.floor(cur.getMonth() / 3) + 1
      primary.push({ key: cur.toISOString(), pct: pctOf(cur), label: `Q${q} ${String(cur.getFullYear()).slice(2)}` })
      cur.setMonth(cur.getMonth() + 3)
    }
    const mCur = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    while (mCur <= maxDate) {
      if (mCur.getMonth() % 3 !== 0) secondary.push({ key: `sec-${mCur.toISOString()}`, pct: pctOf(mCur) })
      mCur.setMonth(mCur.getMonth() + 1)
    }
  } else {
    const yCur = new Date(minDate.getFullYear(), 0, 1)
    while (yCur <= maxDate) {
      primary.push({ key: yCur.toISOString(), pct: pctOf(yCur), label: `${yCur.getFullYear()}` })
      yCur.setFullYear(yCur.getFullYear() + 1)
    }
    const qCur = new Date(minDate.getFullYear(), Math.floor(minDate.getMonth() / 3) * 3, 1)
    while (qCur <= maxDate) {
      if (qCur.getMonth() !== 0) secondary.push({ key: `sec-${qCur.toISOString()}`, pct: pctOf(qCur) })
      qCur.setMonth(qCur.getMonth() + 3)
    }
  }

  return { primary, secondary }
}

const ZOOM_OPTIONS: { value: Zoom; label: string }[] = [
  { value: 'month', label: 'Mensal' },
  { value: 'quarter', label: 'Trimestral' },
  { value: 'year', label: 'Anual' },
]

function ZoomControl({ zoom, onChange }: { zoom: Zoom; onChange: (z: Zoom) => void }) {
  return (
    <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
      {ZOOM_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1 font-medium transition-colors',
            zoom === opt.value
              ? 'bg-primary text-white'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Draggable bar ────────────────────────────────────────────────────────────

function GanttBar({
  pp,
  color,
  pctOf,
  isDragging,
  onMouseDown,
}: {
  pp: RoadmapProject & { _start: string | null; _end: string | null }
  color: string
  pctOf: (d: Date) => number
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent, kind: DragKind) => void
}) {
  const { _start, _end } = pp
  if (!_start || !_end) return null

  const left = `${Math.max(0, pctOf(new Date(_start)))}%`
  const width = `${Math.max(0.5, pctOf(new Date(_end)) - pctOf(new Date(_start)))}%`

  return (
    <div
      className="absolute top-1 h-4 rounded-sm select-none"
      style={{ left, width, backgroundColor: color, opacity: isDragging ? 1 : 0.8 }}
      title={`${formatDate(_start)} — ${formatDate(_end)}`}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-sm hover:bg-black/20"
        onMouseDown={(e) => onMouseDown(e, 'resize-start')}
      />
      {/* Drag body */}
      <div
        className="absolute inset-0 mx-2 cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => onMouseDown(e, 'move')}
      />
      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-sm hover:bg-black/20"
        onMouseDown={(e) => onMouseDown(e, 'resize-end')}
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RoadmapView({ portfolioId }: RoadmapViewProps) {
  const { data, isLoading } = usePortfolioRoadmap(portfolioId)
  const updateProject = useUpdatePortfolioProject()
  const [zoom, setZoom] = useState<Zoom>('month')
  const [drag, setDrag] = useState<DragState | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { startDate: string; endDate: string }>>({})

  useEffect(() => {
    if (!drag) return

    document.body.style.userSelect = 'none'
    document.body.style.cursor = drag.kind === 'move' ? 'grabbing' : 'ew-resize'

    const currentDraft = { startDate: drag.origStart, endDate: drag.origEnd }

    function onMouseMove(e: MouseEvent) {
      const deltaDays = Math.round(
        ((e.clientX - drag.startX) / drag.containerWidth) * drag.totalMs / 86400000,
      )
      const deltaMs = deltaDays * 86400000
      const os = new Date(drag.origStart).getTime()
      const oe = new Date(drag.origEnd).getTime()
      let ns = os, ne = oe

      if (drag.kind === 'move') {
        ns = os + deltaMs
        ne = oe + deltaMs
      } else if (drag.kind === 'resize-start') {
        ns = Math.min(os + deltaMs, oe - 86400000)
      } else {
        ne = Math.max(oe + deltaMs, os + 86400000)
      }

      currentDraft.startDate = toISODate(new Date(ns))
      currentDraft.endDate   = toISODate(new Date(ne))
      setDrafts((d) => ({ ...d, [drag.projectId]: { ...currentDraft } }))
    }

    function onMouseUp() {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      if (
        currentDraft.startDate !== drag.origStart ||
        currentDraft.endDate   !== drag.origEnd
      ) {
        updateProject.mutate(
          { portfolioId, ppId: drag.projectId, data: { startDate: currentDraft.startDate, endDate: currentDraft.endDate } },
          { onSuccess: () => setDrafts((d) => { const n = { ...d }; delete n[drag.projectId]; return n }) },
        )
      }
      setDrag(null)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [drag]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <PageSpinner />

  const projects = data?.projects ?? []

  if (projects.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Nenhum projeto no portfolio
      </div>
    )
  }

  const allDates = projects.flatMap((p) =>
    [p.startDate, p.endDate].filter(Boolean).map((d) => new Date(d!)),
  )
  const rawMin = allDates.length ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date()
  const rawMax = allDates.length ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date(Date.now() + 90 * 86400000)

  const minDate = new Date(rawMin.getFullYear(), rawMin.getMonth(), 1)
  const maxDate = new Date(rawMax.getFullYear(), rawMax.getMonth() + 1, 0)
  const totalMs = Math.max(maxDate.getTime() - minDate.getTime(), 1)

  function pctOf(d: Date) {
    return ((d.getTime() - minDate.getTime()) / totalMs) * 100
  }

  function startDrag(e: React.MouseEvent, pp: RoadmapProject, kind: DragKind) {
    const origStart = drafts[pp.id]?.startDate ?? pp.startDate
    const origEnd   = drafts[pp.id]?.endDate   ?? pp.endDate
    if (!origStart || !origEnd) return
    e.preventDefault()
    e.stopPropagation()
    const container = (e.currentTarget as HTMLElement).closest('[data-tl]') as HTMLElement
    setDrag({
      kind,
      projectId: pp.id,
      startX: e.clientX,
      origStart,
      origEnd,
      containerWidth: container?.getBoundingClientRect().width ?? 600,
      totalMs,
    })
  }

  const { primary, secondary } = buildLines(minDate, maxDate, zoom, pctOf)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Roadmap</h2>
        <ZoomControl zoom={zoom} onChange={setZoom} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950">
              <th className="w-48 px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Projeto
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                <div className="relative h-5">
                  {primary.map(({ key, pct, label }) => (
                    <span
                      key={key}
                      className="absolute top-0 -translate-x-1/2 select-none whitespace-nowrap text-[10px] font-medium text-gray-400 dark:text-gray-500"
                      style={{ left: `${pct}%` }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </th>
              <th className="w-20 px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                RAG
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {projects.map((pp, idx) => {
              const color = projectColor(idx)
              const effectiveStart = drafts[pp.id]?.startDate ?? pp.startDate
              const effectiveEnd   = drafts[pp.id]?.endDate   ?? pp.endDate
              const isDragging = drag?.projectId === pp.id

              return (
                <tr key={pp.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="mr-1.5 font-mono text-xs text-gray-400 dark:text-gray-500">
                      {pp.projectIdentifier}
                    </span>
                    {pp.projectName}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      data-tl
                      className="relative h-6 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden"
                    >
                      {secondary.map(({ key, pct }) => (
                        <div key={key} className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" style={{ left: `${pct}%` }} />
                      ))}
                      {primary.map(({ key, pct }) => (
                        <div key={key} className="absolute top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600" style={{ left: `${pct}%` }} />
                      ))}
                      <GanttBar
                        pp={{ ...pp, _start: effectiveStart, _end: effectiveEnd }}
                        color={color}
                        pctOf={pctOf}
                        isDragging={isDragging}
                        onMouseDown={(e, kind) => startDrag(e, pp, kind)}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <RagBadge status={pp.ragStatus} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
