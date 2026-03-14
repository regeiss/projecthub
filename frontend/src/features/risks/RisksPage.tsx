import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, ShieldAlert, Trash2, Edit2 } from 'lucide-react'
import { useRisks, useDeleteRisk } from '@/hooks/useRisks'
import type { Risk, RiskStatus, RiskCategory } from '@/types'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { RiskMatrix } from './RiskMatrix'
import { RiskForm } from './RiskForm'

const STATUS_LABEL: Record<RiskStatus, string> = {
  identified: 'Identificado',
  analyzing:  'Em análise',
  mitigating: 'Mitigando',
  monitoring: 'Monitorando',
  closed:     'Fechado',
  accepted:   'Aceito',
  occurred:   'Ocorreu',
}

const CATEGORY_LABEL: Record<RiskCategory, string> = {
  technical:   'Técnico',
  schedule:    'Prazo',
  cost:        'Custo',
  resource:    'Recurso',
  external:    'Externo',
  stakeholder: 'Stakeholder',
}

function scoreBadgeClass(score: number): string {
  if (score <= 6)  return 'bg-green-100 text-green-700'
  if (score <= 14) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function scoreLabel(score: number): string {
  if (score <= 6)  return 'Baixo'
  if (score <= 14) return 'Médio'
  return 'Crítico'
}

const ACTIVE_STATUSES: RiskStatus[] = ['identified', 'analyzing', 'mitigating', 'monitoring']

export function RisksPage() {
  const { projectId = '' } = useParams()
  const { data: risks = [], isLoading } = useRisks(projectId)
  const deleteRisk = useDeleteRisk(projectId)

  const [creating,       setCreating]       = useState(false)
  const [editingRisk,    setEditingRisk]    = useState<Risk | null>(null)
  const [filterStatus,   setFilterStatus]   = useState<RiskStatus | ''>('')
  const [filterCategory, setFilterCategory] = useState<RiskCategory | ''>('')

  if (isLoading) return <PageSpinner />

  const activeRisks   = risks.filter((r) => ACTIVE_STATUSES.includes(r.status))
  const criticalCount = activeRisks.filter((r) => r.score >= 15).length

  const filtered = risks.filter((r) => {
    if (filterStatus   && r.status   !== filterStatus)   return false
    if (filterCategory && r.category !== filterCategory) return false
    return true
  })

  const matrixRisks = activeRisks

  function handleDelete(risk: Risk) {
    if (!confirm(`Deletar "${risk.title}"?`)) return
    deleteRisk.mutate(risk.id)
  }

  const selectCls = "h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-indigo-500 focus:outline-none"

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Registro de Riscos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {activeRisks.length} risco{activeRisks.length !== 1 ? 's' : ''} ativo{activeRisks.length !== 1 ? 's' : ''}
            {criticalCount > 0 && (
              <span className="ml-2 font-medium text-red-600">· {criticalCount} crítico{criticalCount !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          Novo risco
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as RiskStatus | '')} className={selectCls}>
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_LABEL) as RiskStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as RiskCategory | '')} className={selectCls}>
          <option value="">Todas as categorias</option>
          {(Object.keys(CATEGORY_LABEL) as RiskCategory[]).map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </select>
      </div>

      {risks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-gray-400 dark:text-gray-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum risco registrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_380px] gap-6 items-start">
          <div className="space-y-2">
            {filtered.sort((a, b) => b.score - a.score).map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${scoreBadgeClass(r.score)}`}>
                        {r.score} — {scoreLabel(r.score)}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{CATEGORY_LABEL[r.category]}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">·</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{STATUS_LABEL[r.status]}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.title}</p>
                    {r.description && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{r.description}</p>
                    )}
                    {r.ownerName && (
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Responsável: {r.ownerName}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setEditingRisk(r)}
                      className="rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      className="rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">Nenhum risco com estes filtros</p>
            )}
          </div>

          <div className="sticky top-4">
            <RiskMatrix risks={matrixRisks} onRiskClick={(r) => setEditingRisk(r)} />
          </div>
        </div>
      )}

      <RiskForm projectId={projectId} open={creating} onClose={() => setCreating(false)} />
      {editingRisk && (
        <RiskForm
          key={editingRisk.id}
          projectId={projectId}
          open={!!editingRisk}
          onClose={() => setEditingRisk(null)}
          risk={editingRisk}
        />
      )}
    </div>
  )
}
