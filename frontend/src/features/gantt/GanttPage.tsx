import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Network, BarChart2, RefreshCw, Archive, CalendarCheck, Maximize2 } from 'lucide-react'
import { useCalculateCpm, useCpmBaselines, useCreateBaseline } from '@/hooks/useCpm'
import { GanttChart } from './GanttChart'
import { NetworkDiagram } from './NetworkDiagram'
import { Button } from '@/components/ui/Button'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

type View = 'gantt' | 'network'

function CreateBaselineModal({
  open,
  onClose,
  projectId,
}: {
  open: boolean
  onClose: () => void
  projectId: string
}) {
  const [name, setName] = useState('')
  const create = useCreateBaseline()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    create.mutate({ projectId, name }, { onSuccess: onClose })
  }

  return (
    <Modal open={open} onClose={onClose} title="Salvar baseline" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Baseline v1"
          required
        />
        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={create.isPending}>
            Salvar
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

// DAY_W must match the constant in GanttChart.tsx
const DAY_W = 44

export function GanttPage() {
  const { projectId = '' } = useParams()
  const [view, setView] = useState<View>('gantt')
  const [savingBaseline, setSavingBaseline] = useState(false)
  const calculate = useCalculateCpm()
  const { data: baselines = [] } = useCpmBaselines(projectId)
  const ganttScrollRef = useRef<HTMLDivElement>(null)

  function scrollToToday() {
    const el = ganttScrollRef.current
    if (!el) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // approximate scroll: we don't have minDate here, so scroll to ~70% of current scroll width
    // The chart pads 3 days before the earliest task — use scrollWidth heuristic
    el.scrollLeft = Math.max(0, el.scrollLeft)
    // Better: compute offset of today relative to visible area centre
    const dayOffset = Math.floor((today.getTime() - Date.now()) / 86_400_000)
    const centreX = el.scrollWidth / 2 + dayOffset * DAY_W
    el.scrollTo({ left: centreX - el.clientWidth / 2, behavior: 'smooth' })
  }

  function autofit() {
    const el = ganttScrollRef.current
    if (!el) return
    el.scrollTo({ left: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2">
        {/* View toggle */}
        <div className="flex rounded-md border border-gray-200 dark:border-gray-700 p-0.5">
          <button
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              view === 'gantt'
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setView('gantt')}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Gantt
          </button>
          <button
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              view === 'network'
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setView('network')}
          >
            <Network className="h-3.5 w-3.5" />
            Rede CPM
          </button>
        </div>

        {/* Today + Autofit — only meaningful for Gantt view */}
        {view === 'gantt' && (
          <>
            <div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <Button variant="ghost" size="sm" onClick={scrollToToday}>
              <CalendarCheck className="h-3.5 w-3.5" />
              Hoje
            </Button>
            <Button variant="ghost" size="sm" onClick={autofit} title="Ir para o início">
              <Maximize2 className="h-3.5 w-3.5" />
              Autofit
            </Button>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSavingBaseline(true)}
          >
            <Archive className="h-3.5 w-3.5" />
            Salvar baseline
          </Button>
          <Button
            size="sm"
            loading={calculate.isPending}
            onClick={() => calculate.mutate(projectId)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Calcular CPM
          </Button>
        </div>
      </div>

      {/* Baselines strip */}
      {baselines.length > 0 && (
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-4 py-1.5">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Baselines:</span>
          {baselines.map((b) => (
            <Badge key={b.id} variant="outline">
              {b.name} — {formatDate(b.createdAt)}
            </Badge>
          ))}
        </div>
      )}

      {/* Main view */}
      <div className="flex-1 overflow-auto">
        {view === 'gantt' ? (
          <GanttChart projectId={projectId} scrollRef={ganttScrollRef} />
        ) : (
          <NetworkDiagram projectId={projectId} />
        )}
      </div>

      <CreateBaselineModal
        open={savingBaseline}
        onClose={() => setSavingBaseline(false)}
        projectId={projectId}
      />
    </div>
  )
}
