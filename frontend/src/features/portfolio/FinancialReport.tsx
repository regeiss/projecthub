// frontend/src/features/portfolio/FinancialReport.tsx
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { usePortfolioDashboard } from '@/hooks/usePortfolio'
import { PageSpinner } from '@/components/ui/Spinner'
import type { PortfolioDashboardProject } from '@/types'

interface FinancialReportProps {
  portfolioId: string
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v)
}

// ─── Variance chip ────────────────────────────────────────────────────────────

function VarianceChip({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-0.5 font-medium text-green-600 dark:text-green-400">
        <TrendingDown className="h-3.5 w-3.5" />
        {formatCurrency(value)}
      </span>
    )
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-0.5 font-medium text-red-500 dark:text-red-400">
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

// ─── Budget bar ───────────────────────────────────────────────────────────────

function BudgetBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100)
  const color = pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <span className="min-w-[2.5rem] text-right text-xs font-medium" style={{ color }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string
  value: string
  sub: string
  valueColor?: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold" style={{ color: valueColor }}>
        {value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>
    </div>
  )
}

// ─── Inner report (receives already-loaded projects) ─────────────────────────

function Report({ projects }: { projects: PortfolioDashboardProject[] }) {
  if (projects.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Nenhum projeto no portfolio
      </div>
    )
  }

  const totalBudget  = projects.reduce((s, p) => s + (p.evm?.budgetPlanned ?? 0), 0)
  const totalAC      = projects.reduce((s, p) => s + (p.evm?.ac ?? 0), 0)
  const totalEV      = projects.reduce((s, p) => s + (p.evm?.ev ?? 0), 0)
  const costVariance = totalEV - totalAC
  const portfolioCPI = totalAC > 0 ? totalEV / totalAC : 1
  const eac          = portfolioCPI > 0 ? totalBudget / portfolioCPI : totalBudget
  const pctUsedTotal = totalBudget > 0 ? (totalAC / totalBudget) * 100 : 0

  return (
    <>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Orçamento total"
          value={formatCurrency(totalBudget)}
          sub="planejado"
        />
        <SummaryCard
          label="Custo real (AC)"
          value={formatCurrency(totalAC)}
          sub="realizado até hoje"
        />
        <SummaryCard
          label="Variância de custo"
          value={formatCurrency(Math.abs(costVariance))}
          sub={costVariance >= 0 ? '✓ abaixo do orçamento' : '⚠ acima do orçamento'}
          valueColor={costVariance >= 0 ? '#10b981' : '#ef4444'}
        />
        <SummaryCard
          label="Estimativa no término (EAC)"
          value={formatCurrency(eac)}
          sub={`CPI portfolio: ${portfolioCPI.toFixed(2)}`}
        />
      </div>

      {/* Per-project breakdown */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950">
              <th className="px-4 py-2.5 text-left   text-xs font-medium text-gray-500 dark:text-gray-400">Projeto</th>
              <th className="px-4 py-2.5 text-right  text-xs font-medium text-gray-500 dark:text-gray-400">Orçamento</th>
              <th className="px-4 py-2.5 text-right  text-xs font-medium text-gray-500 dark:text-gray-400">Custo real</th>
              <th className="px-4 py-2.5 text-right  text-xs font-medium text-gray-500 dark:text-gray-400">Valor agregado (EV)</th>
              <th className="px-4 py-2.5 text-right  text-xs font-medium text-gray-500 dark:text-gray-400">CPI</th>
              <th className="px-4 py-2.5 text-right  text-xs font-medium text-gray-500 dark:text-gray-400">Variância</th>
              <th className="px-4 py-2.5 pl-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400">% utilizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {projects.map((pp) => {
              const budget   = pp.evm?.budgetPlanned ?? 0
              const ac       = pp.evm?.ac ?? 0
              const ev       = pp.evm?.ev ?? 0
              const cpi      = pp.evm?.cpi ?? 1
              const variance = budget - ac
              const pctUsed  = budget > 0 ? (ac / budget) * 100 : 0

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
                <BudgetBar pct={pctUsedTotal} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

export function FinancialReport({ portfolioId }: FinancialReportProps) {
  const { data, isLoading } = usePortfolioDashboard(portfolioId)

  if (isLoading) return <PageSpinner />

  return (
    <div>
      <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
        Situação Financeira
      </h2>
      <Report projects={data?.projects ?? []} />
    </div>
  )
}
