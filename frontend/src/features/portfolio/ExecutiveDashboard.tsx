import { useState } from 'react'
import {
  usePortfolioDashboard,
  useRecalculateRag,
  useUpdatePortfolioProject,
  useAddPortfolioProject,
  useRemovePortfolioProject,
} from '@/hooks/usePortfolio'
import { useProjects } from '@/hooks/useProjects'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { RagBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { PageSpinner } from '@/components/ui/Spinner'
import { RefreshCw, Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import type { PortfolioDashboardProject, RagStatus } from '@/types'

interface Props {
  portfolioId: string
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v)
}

// ─── Add Project Modal ────────────────────────────────────────────────────────

function AddProjectModal({
  open,
  onClose,
  portfolioId,
  existingProjectIds,
}: {
  open: boolean
  onClose: () => void
  portfolioId: string
  existingProjectIds: string[]
}) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const { data: allProjects = [] } = useProjects(workspaceId)
  const add = useAddPortfolioProject(portfolioId)
  const [projectId, setProjectId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [budget, setBudget] = useState('')

  const available = allProjects.filter((p) => !existingProjectIds.includes(p.id))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    add.mutate(
      {
        project: projectId,
        startDate: startDate || null,
        endDate: endDate || null,
        budgetPlanned: budget || '0.00',
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar projeto ao portfolio" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Projeto</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required
            className="h-9 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— Selecione —</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.identifier}] {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data início"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Data fim"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <Input
          label="Orçamento previsto (R$)"
          type="number"
          min="0"
          step="0.01"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="0.00"
        />
        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={add.isPending} disabled={!projectId}>
            Adicionar
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

// ─── RAG Override inline editor ───────────────────────────────────────────────

function RagOverrideCell({
  pp,
  portfolioId,
}: {
  pp: PortfolioDashboardProject
  portfolioId: string
}) {
  const update = useUpdatePortfolioProject()
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState<RagStatus>(pp.ragStatus)

  function save() {
    update.mutate(
      { portfolioId, ppId: pp.id, data: { ragStatus: status, ragOverride: true } },
      { onSuccess: () => setEditing(false) },
    )
  }

  function reset() {
    update.mutate(
      { portfolioId, ppId: pp.id, data: { ragOverride: false } },
      { onSuccess: () => setEditing(false) },
    )
  }

  if (editing) {
    return (
      <div className="flex items-center justify-center gap-1">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as RagStatus)}
          className="h-6 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-1 text-xs focus:outline-none"
        >
          <option value="GREEN">Verde</option>
          <option value="AMBER">Âmbar</option>
          <option value="RED">Vermelho</option>
        </select>
        <button onClick={save} className="rounded p-0.5 text-green-600 hover:bg-green-50">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setEditing(false)} className="rounded p-0.5 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
          <X className="h-3.5 w-3.5" />
        </button>
        {pp.ragOverride && (
          <button onClick={reset} className="text-[10px] text-gray-400 dark:text-gray-500 underline hover:text-gray-600 dark:hover:text-gray-400">
            auto
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="group/rag flex items-center justify-center gap-1">
      <RagBadge status={pp.ragStatus} />
      {pp.ragOverride && <span className="text-[9px] text-gray-400 dark:text-gray-500">manual</span>}
      <button
        onClick={() => setEditing(true)}
        className="rounded p-0.5 text-gray-400 dark:text-gray-500 opacity-0 hover:text-gray-600 dark:hover:text-gray-400 group-hover/rag:opacity-100"
      >
        <Edit2 className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── EVM Card ─────────────────────────────────────────────────────────────────

function EvmCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  )
}

// ─── Project status badge ─────────────────────────────────────────────────────

function projectStatus(
  startDate: string | null,
  endDate: string | null,
  ragStatus: string,
): { label: string; color: string; bg: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (!startDate) return { label: '—', color: '#9ca3af', bg: '#f3f4f6' }

  const start = new Date(startDate)
  if (today < start)
    return { label: 'Não iniciado', color: '#6366f1', bg: '#eef2ff' }

  if (endDate) {
    const end = new Date(endDate)
    if (today > end) {
      if (ragStatus === 'RED')
        return { label: 'Atrasado', color: '#ef4444', bg: '#fef2f2' }
      return { label: 'Concluído', color: '#10b981', bg: '#f0fdf4' }
    }
  }

  return { label: 'Em andamento', color: '#3b82f6', bg: '#eff6ff' }
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ─── Burn-Up Chart ───────────────────────────────────────────────────────────

function BurnUpChart({ projects }: { projects: PortfolioDashboardProject[] }) {
  const dated = projects.filter((p) => p.startDate && p.endDate)
  if (dated.length === 0) return null

  const minTime = Math.min(...dated.map((p) => new Date(p.startDate!).getTime()))
  const maxTime = Math.max(...dated.map((p) => new Date(p.endDate!).getTime()))
  if (minTime >= maxTime) return null

  const totalScope = projects.reduce((s, p) => s + (p.evm?.totalIssues ?? 0), 0)
  const totalDone  = projects.reduce((s, p) => s + (p.evm?.completedIssues ?? 0), 0)
  if (totalScope === 0) return null

  const W = 760, H = 150, ML = 42, MR = 16, MT = 14, MB = 28
  const SVG_W = W + ML + MR
  const SVG_H = H + MT + MB

  const today = Date.now()
  const todayClamped = Math.max(minTime, Math.min(today, maxTime))
  const isInRange = today >= minTime && today <= maxTime

  const xOf = (t: number) => ML + ((t - minTime) / (maxTime - minTime)) * W
  const yOf = (n: number) => MT + H - (n / totalScope) * H

  const ticks: { x: number; label: string }[] = []
  const cur = new Date(minTime)
  cur.setDate(1)
  const endDate = new Date(maxTime)
  while (cur <= endDate) {
    const t = cur.getTime()
    const mon = cur.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    const yr  = String(cur.getFullYear()).slice(2)
    ticks.push({ x: xOf(t), label: `${mon}/${yr}` })
    cur.setMonth(cur.getMonth() + 1)
  }
  const step = ticks.length > 9 ? Math.ceil(ticks.length / 9) : 1
  const visibleTicks = ticks.filter((_, i) => i % step === 0)

  const todayX = xOf(todayClamped)
  const todayY = yOf(totalDone)

  return (
    <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        Burn-Up do Portfolio
      </p>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = yOf(totalScope * pct)
          return (
            <g key={pct}>
              <line x1={ML} y1={y} x2={ML + W} y2={y}
                stroke="currentColor" strokeOpacity={0.08} strokeWidth={1}
                className="text-gray-600 dark:text-gray-300" />
              <text x={ML - 5} y={y + 3.5} textAnchor="end" style={{ fontSize: '7px' }}
                className="fill-gray-400 dark:fill-gray-500">
                {Math.round(totalScope * pct)}
              </text>
            </g>
          )
        })}

        {/* X axis baseline */}
        <line x1={ML} y1={MT + H} x2={ML + W} y2={MT + H}
          stroke="currentColor" strokeOpacity={0.12}
          className="text-gray-500" />

        {/* X ticks */}
        {visibleTicks.map((tick) => (
          <g key={tick.x}>
            <line x1={tick.x} y1={MT + H} x2={tick.x} y2={MT + H + 4}
              stroke="currentColor" strokeOpacity={0.25} className="text-gray-400" />
            <text x={tick.x} y={MT + H + 13} textAnchor="middle" style={{ fontSize: '6.5px' }}
              className="fill-gray-400 dark:fill-gray-500">
              {tick.label}
            </text>
          </g>
        ))}

        {/* Today vertical marker */}
        {isInRange && (
          <>
            <line x1={todayX} y1={MT} x2={todayX} y2={MT + H}
              stroke="#818cf8" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.7} />
            <text x={todayX + 3} y={MT + 9} style={{ fontSize: '6px' }} fill="#818cf8" opacity={0.8}>
              hoje
            </text>
          </>
        )}

        {/* Scope line — dashed horizontal */}
        <line x1={ML} y1={yOf(totalScope)} x2={ML + W} y2={yOf(totalScope)}
          stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 3" />
        <text x={ML + W - 2} y={yOf(totalScope) - 5} textAnchor="end" style={{ fontSize: '6.5px' }} fill="#94a3b8">
          Escopo ({totalScope})
        </text>

        {/* Ideal/planned line */}
        <line
          x1={xOf(minTime)} y1={yOf(0)}
          x2={xOf(maxTime)} y2={yOf(totalScope)}
          stroke="#cbd5e1" strokeWidth={1.5}
        />

        {/* Actual line — from start to today */}
        <line
          x1={xOf(minTime)} y1={yOf(0)}
          x2={todayX} y2={todayY}
          stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round"
        />

        {/* Actual endpoint dot */}
        <circle cx={todayX} cy={todayY} r={3.5} fill="#6366f1" />
        <text x={todayX + 7} y={todayY + 4} style={{ fontSize: '7px' }} fill="#6366f1" fontWeight="600">
          {totalDone}/{totalScope}
        </text>

        {/* Legend */}
        <g transform={`translate(${ML + W - 118}, ${MT + 4})`}>
          <line x1={0} y1={5} x2={14} y2={5} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 3" />
          <text x={18} y={8} style={{ fontSize: '6.5px' }} fill="#94a3b8">Escopo total</text>
          <line x1={0} y1={18} x2={14} y2={18} stroke="#cbd5e1" strokeWidth={1.5} />
          <text x={18} y={21} style={{ fontSize: '6.5px' }} fill="#94a3b8">Planejado</text>
          <line x1={0} y1={31} x2={14} y2={31} stroke="#6366f1" strokeWidth={2} />
          <circle cx={7} cy={31} r={2.5} fill="#6366f1" />
          <text x={18} y={34} style={{ fontSize: '6.5px' }} fill="#6366f1">Realizado</text>
        </g>
      </svg>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ExecutiveDashboard({ portfolioId }: Props) {
  const { data, isLoading } = usePortfolioDashboard(portfolioId)
  const recalculate = useRecalculateRag()
  const remove = useRemovePortfolioProject(portfolioId)
  const [adding, setAdding] = useState(false)

  if (isLoading) return <PageSpinner />
  if (!data) return null

  const { projects } = data
  const existingProjectIds = projects.map((p) => p.projectId)

  // Aggregate EVM totals from projects (backend totals are incomplete)
  const aggPV  = projects.reduce((s, p) => s + (p.evm?.pv ?? 0), 0)
  const aggEV  = projects.reduce((s, p) => s + (p.evm?.ev ?? 0), 0)
  const aggAC  = projects.reduce((s, p) => s + (p.evm?.ac ?? 0), 0)
  const aggCPI = aggAC > 0 ? aggEV / aggAC : 1
  const aggSPI = aggPV > 0 ? aggEV / aggPV : 1

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Dashboard</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={recalculate.isPending}
            onClick={() => recalculate.mutate(portfolioId)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Recalcular RAG
          </Button>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar projeto
          </Button>
        </div>
      </div>

      {/* EVM totals — aggregated from projects */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        <EvmCard label="VP — Valor Planejado" value={formatCurrency(aggPV)} />
        <EvmCard label="VA — Valor Agregado"  value={formatCurrency(aggEV)} />
        <EvmCard
          label="IDC — Índice de Custo"
          value={aggCPI.toFixed(2)}
          sub={aggCPI >= 1 ? '✓ Abaixo do orçamento' : '⚠ Acima do orçamento'}
        />
        <EvmCard
          label="IDP — Índice de Prazo"
          value={aggSPI.toFixed(2)}
          sub={aggSPI >= 1 ? '✓ Adiantado' : '⚠ Atrasado'}
        />
      </div>

      {/* Project table */}
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center text-sm text-gray-400 dark:text-gray-500">
          Nenhum projeto no portfolio.{' '}
          <button onClick={() => setAdding(true)} className="text-indigo-600 hover:underline">
            Adicionar o primeiro.
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Projeto</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Início</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Término</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Abertas</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Atraso</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Concluído</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">VP</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">VA</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">IDC</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">IDP</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">RAG</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Riscos</th>
                <th className="w-8 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {projects.map((pp) => (
                <tr key={pp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    <span className="mr-1.5 font-mono text-xs text-gray-400 dark:text-gray-500">
                      {pp.projectIdentifier}
                    </span>
                    {pp.projectName}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const s = projectStatus(pp.startDate, pp.endDate, pp.ragStatus)
                      return (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: s.bg, color: s.color }}
                        >
                          {s.label}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600 dark:text-gray-400">
                    {fmtDate(pp.startDate)}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600 dark:text-gray-400">
                    {fmtDate(pp.endDate)}
                  </td>
                  {/* Open issues */}
                  <td className="px-4 py-3 text-center">
                    {pp.openIssueCount > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {pp.openIssueCount}
                      </span>
                    ) : (
                      <span className="text-xs text-green-600 dark:text-green-500">✓ 0</span>
                    )}
                  </td>
                  {/* Days late */}
                  <td className="px-4 py-3 text-center">
                    {pp.daysLate > 0 ? (
                      <span className="text-xs font-medium text-red-600 dark:text-red-500">
                        {pp.daysLate}d
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  {/* % concluded */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${pp.evm?.pctIssuesCompleted ?? 0}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-gray-600 dark:text-gray-400">
                        {Math.round(pp.evm?.pctIssuesCompleted ?? 0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                    {formatCurrency(pp.evm?.pv ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                    {formatCurrency(pp.evm?.ev ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                    {(pp.evm?.cpi ?? 1).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                    {(pp.evm?.spi ?? 1).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <RagOverrideCell pp={pp} portfolioId={portfolioId} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {pp.criticalRiskCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                        🔴 {pp.criticalRiskCount} crítico{pp.criticalRiskCount !== 1 ? 's' : ''}
                      </span>
                    ) : pp.riskCount > 0 ? (
                      <span className="text-xs text-amber-600">
                        {pp.riskCount} ativo{pp.riskCount !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-green-600">✓ sem riscos</span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <button
                      onClick={() =>
                        confirm(`Remover "${pp.projectName}" do portfolio?`) &&
                        remove.mutate(pp.id)
                      }
                      className="rounded p-1 text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Burn-up chart */}
      <div className="mt-6">
        <BurnUpChart projects={projects} />
      </div>

      <AddProjectModal
        open={adding}
        onClose={() => setAdding(false)}
        portfolioId={portfolioId}
        existingProjectIds={existingProjectIds}
      />
    </div>
  )
}
