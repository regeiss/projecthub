// frontend/src/features/resources/WorkloadGrid.tsx
import React from 'react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import type { MemberWorkload } from '@/types'

interface WorkloadGridProps {
  rows: MemberWorkload[]
  showCost?: boolean
  onRowClick?: (row: MemberWorkload) => void
  expandedMemberId?: string | null
  renderExpanded?: (row: MemberWorkload) => React.ReactNode
}

function UtilizationBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-400">—</span>
  const color =
    pct > 100
      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
      : pct >= 80
      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
      : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', color)}>
      {pct.toFixed(1)}%
    </span>
  )
}

function CapacityBar({ planned, available }: { planned: number; available: number | null }) {
  if (!available) return <span className="text-xs text-gray-400">sem capacidade</span>
  const pct = Math.min((planned / available) * 100, 100)
  const color =
    pct > 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-indigo-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {planned.toFixed(1)} / {available.toFixed(1)}d
      </span>
    </div>
  )
}

export function WorkloadGrid({
  rows,
  showCost = false,
  onRowClick,
  expandedMemberId,
  renderExpanded,
}: WorkloadGridProps) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        Nenhum membro encontrado para o período.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Membro
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Planejado / Disponível
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Real (dias)
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Utilização
            </th>
            {showCost && (
              <>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  Custo plan.
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  Custo real
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <React.Fragment key={row.memberId}>
              <tr
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-gray-100 dark:border-gray-800',
                  onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  expandedMemberId === row.memberId && 'bg-indigo-50/40 dark:bg-indigo-900/10',
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar src={row.memberAvatar} name={row.memberName} size="sm" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {row.memberName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <CapacityBar planned={row.plannedDays} available={row.availableDays} />
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {row.actualDays.toFixed(1)}d
                </td>
                <td className="px-4 py-3">
                  <UtilizationBadge pct={row.utilizationPct} />
                </td>
                {showCost && (
                  <>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {row.plannedCost != null
                        ? `R$\u00A0${row.plannedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {row.actualCost != null
                        ? `R$\u00A0${row.actualCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                  </>
                )}
              </tr>
              {expandedMemberId === row.memberId && renderExpanded && (
                <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                  <td colSpan={showCost ? 6 : 4} className="px-4 py-3">
                    {renderExpanded(row)}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
