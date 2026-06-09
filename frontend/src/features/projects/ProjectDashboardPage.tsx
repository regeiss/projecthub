// frontend/src/features/projects/ProjectDashboardPage.tsx
import { useState, useCallback } from 'react'
import { Settings2, GripVertical } from 'lucide-react'
import {
  StatCardsWidget,
  IssuesByStateWidget,
  IssuesByAssigneeWidget,
  CycleProgressWidget,
  MilestonesWidget,
  RiskSummaryWidget,
  TimeLoggedWidget,
} from './dashboard/widgets'
import { useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'

// ─── Widget registry ─────────────────────────────────────────────────────────

type WidgetId =
  | 'stat-cards'
  | 'issues-by-state'
  | 'issues-by-assignee'
  | 'cycle-progress'
  | 'milestones'
  | 'risk-summary'
  | 'time-logged'

interface WidgetDef {
  id: WidgetId
  label: string
  span: 'full' | 'half'
  component: React.ComponentType
}

const WIDGET_DEFS: WidgetDef[] = [
  { id: 'stat-cards', label: 'Resumo de issues', span: 'full', component: StatCardsWidget },
  { id: 'issues-by-state', label: 'Issues por status', span: 'half', component: IssuesByStateWidget },
  { id: 'issues-by-assignee', label: 'Issues por responsável', span: 'half', component: IssuesByAssigneeWidget },
  { id: 'cycle-progress', label: 'Progresso do ciclo', span: 'half', component: CycleProgressWidget },
  { id: 'milestones', label: 'Marcos', span: 'half', component: MilestonesWidget },
  { id: 'risk-summary', label: 'Riscos', span: 'half', component: RiskSummaryWidget },
  { id: 'time-logged', label: 'Horas apontadas', span: 'half', component: TimeLoggedWidget },
]

// ─── Config persistence ───────────────────────────────────────────────────────

interface WidgetConfig {
  id: WidgetId
  enabled: boolean
}

function loadConfig(projectId: string): WidgetConfig[] {
  try {
    const stored = localStorage.getItem(`dashboard-config-${projectId}`)
    if (stored) {
      const parsed: WidgetConfig[] = JSON.parse(stored)
      // merge with defaults so new widgets appear automatically
      const existing = new Map(parsed.map((w) => [w.id, w.enabled]))
      return WIDGET_DEFS.map((d) => ({ id: d.id, enabled: existing.get(d.id) ?? true }))
    }
  } catch {
    // ignore
  }
  return WIDGET_DEFS.map((d) => ({ id: d.id, enabled: true }))
}

function saveConfig(projectId: string, config: WidgetConfig[]) {
  localStorage.setItem(`dashboard-config-${projectId}`, JSON.stringify(config))
}

// ─── Config Panel ─────────────────────────────────────────────────────────────

function ConfigPanel({
  config,
  onToggle,
  onClose,
}: {
  config: WidgetConfig[]
  onToggle: (id: WidgetId) => void
  onClose: () => void
}) {
  return (
    <div className="absolute right-0 top-10 z-10 w-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-4">
      <p className="mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Widgets visíveis
      </p>
      <ul className="flex flex-col gap-2">
        {config.map((w) => {
          const def = WIDGET_DEFS.find((d) => d.id === w.id)
          if (!def) return null
          return (
            <li key={w.id} className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={w.enabled}
                  onChange={() => onToggle(w.id)}
                  className="h-3.5 w-3.5 rounded accent-indigo-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{def.label}</span>
              </label>
              <GripVertical className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
            </li>
          )
        })}
      </ul>
      <button
        onClick={onClose}
        className="mt-4 w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        Fechar
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProjectDashboardPage() {
  const { projectId = '' } = useParams()
  const [config, setConfig] = useState<WidgetConfig[]>(() => loadConfig(projectId))
  const [showConfig, setShowConfig] = useState(false)

  const toggle = useCallback(
    (id: WidgetId) => {
      setConfig((prev) => {
        const next = prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
        saveConfig(projectId, next)
        return next
      })
    },
    [projectId],
  )

  const enabled = config
    .filter((w) => w.enabled)
    .map((w) => WIDGET_DEFS.find((d) => d.id === w.id)!)
    .filter(Boolean)

  const fullWidgets = enabled.filter((w) => w.span === 'full')
  const halfWidgets = enabled.filter((w) => w.span === 'half')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Visão geral</h2>
        <div className="relative">
          <button
            onClick={() => setShowConfig((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium transition-colors',
              showConfig
                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Configurar
          </button>
          {showConfig && (
            <ConfigPanel config={config} onToggle={toggle} onClose={() => setShowConfig(false)} />
          )}
        </div>
      </div>

      {enabled.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400">
          Nenhum widget habilitado. Clique em "Configurar" para ativar.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Full-width widgets */}
          {fullWidgets.map(({ id, component: Widget }) => (
            <Widget key={id} />
          ))}

          {/* Half-width grid */}
          {halfWidgets.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {halfWidgets.map(({ id, component: Widget }) => (
                <Widget key={id} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
