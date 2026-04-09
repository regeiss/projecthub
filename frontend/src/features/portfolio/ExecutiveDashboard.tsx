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
import { RefreshCw, Plus, Trash2, Edit2, Check, X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
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

// ─── Financial Report ─────────────────────────────────────────────────────────

function VarianceChip({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-green-600 dark:text-green-400 font-medium">
        <TrendingDown className="h-3.5 w-3.5" />
        {formatCurrency(value)}
      </span>
    )
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-red-500 dark:text-red-400 font-medium">
        <TrendingUp className="h-3.5 w-3.5" />
        {formatCurrency(Math.abs(value))}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-0.5 text-gray-400 dark:text-gray-500">
      <Minus className="h-3.5 w-3.5" />
      {formatCurrency(0)}
    </span>
  )
}

function BudgetBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100)
  const color =
    pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="min-w-[2.5rem] text-right text-xs font-medium"
        style={{ color }}
      >
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}

function FinancialReport({ projects }: { projects: PortfolioDashboardProject[] }) {
  if (projects.length === 0) return null

  // Aggregate from per-project EVM
  const totalBudget  = projects.reduce((s, p) => s + (p.evm?.budgetPlanned ?? 0), 0)
  const totalAC      = projects.reduce((s, p) => s + (p.evm?.ac ?? 0), 0)
  const totalEV      = projects.reduce((s, p) => s + (p.evm?.ev ?? 0), 0)
  const costVariance = totalEV - totalAC                              // positive = savings
  const portfolioCPI = totalAC > 0 ? totalEV / totalAC : 1
  const eac          = portfolioCPI > 0 ? totalBudget / portfolioCPI : totalBudget  // EAC = BAC / CPI

  const summaryCards = [
    { label: 'Orçamento total',          value: formatCurrency(totalBudget), sub: 'planejado' },
    { label: 'Custo real (AC)',           value: formatCurrency(totalAC),     sub: 'realizado até hoje' },
    { label: 'Variância de custo',        value: formatCurrency(Math.abs(costVariance)),
      sub: costVariance >= 0 ? '✓ abaixo do orçamento' : '⚠ acima do orçamento',
      highlight: costVariance >= 0 ? 'green' : 'red' },
    { label: 'Estimativa no término (EAC)', value: formatCurrency(eac),
      sub: `CPI portfolio: ${portfolioCPI.toFixed(2)}` },
  ] as const

  return (
    <div className="mt-8">
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
        Situação Financeira
      </h3>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryCards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {c.label}
            </p>
            <p
              className="mt-1 text-xl font-semibold"
              style={{
                color:
                  'highlight' in c
                    ? c.highlight === 'green'
                      ? '#10b981'
                      : '#ef4444'
                    : undefined,
              }}
            >
              {c.value}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Per-project financial breakdown */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Projeto</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Orçamento</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Custo real</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Valor agregado (EV)</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">CPI</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Variância</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 pl-6">% utilizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {projects.map((pp) => {
              const budget  = pp.evm?.budgetPlanned ?? 0
              const ac      = pp.evm?.ac ?? 0
              const ev      = pp.evm?.ev ?? 0
              const cpi     = pp.evm?.cpi ?? 1
              const variance = budget - ac
              const pctUsed = budget > 0 ? (ac / budget) * 100 : 0

              return (
                <tr key={pp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    <span className="mr-1.5 font-mono text-xs text-gray-400 dark:text-gray-500">
                      {pp.projectIdentifier}
                    </span>
                    {pp.projectName}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                    {formatCurrency(budget)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                    {formatCurrency(ac)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                    {formatCurrency(ev)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="font-medium"
                      style={{ color: cpi >= 1 ? '#10b981' : '#ef4444' }}
                    >
                      {cpi.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <VarianceChip value={variance} />
                  </td>
                  <td className="px-4 py-3 pl-6">
                    <BudgetBar pct={pctUsed} />
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 font-semibold">
              <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400">Total</td>
              <td className="px-4 py-2.5 text-right text-xs text-gray-900 dark:text-gray-100">{formatCurrency(totalBudget)}</td>
              <td className="px-4 py-2.5 text-right text-xs text-gray-900 dark:text-gray-100">{formatCurrency(totalAC)}</td>
              <td className="px-4 py-2.5 text-right text-xs text-gray-900 dark:text-gray-100">{formatCurrency(totalEV)}</td>
              <td className="px-4 py-2.5 text-right text-xs">
                <span style={{ color: portfolioCPI >= 1 ? '#10b981' : '#ef4444' }}>
                  {portfolioCPI.toFixed(2)}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right text-xs">
                <VarianceChip value={totalBudget - totalAC} />
              </td>
              <td className="px-4 py-2.5 pl-6">
                <BudgetBar pct={totalBudget > 0 ? (totalAC / totalBudget) * 100 : 0} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
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
        <EvmCard label="PV (Planned Value)" value={formatCurrency(aggPV)} />
        <EvmCard label="EV (Earned Value)"  value={formatCurrency(aggEV)} />
        <EvmCard
          label="CPI"
          value={aggCPI.toFixed(2)}
          sub={aggCPI >= 1 ? '✓ Abaixo do orçamento' : '⚠ Acima do orçamento'}
        />
        <EvmCard
          label="SPI"
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
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">PV</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">EV</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">CPI</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">SPI</th>
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

      <FinancialReport projects={projects} />

      <AddProjectModal
        open={adding}
        onClose={() => setAdding(false)}
        portfolioId={portfolioId}
        existingProjectIds={existingProjectIds}
      />
    </div>
  )
}
