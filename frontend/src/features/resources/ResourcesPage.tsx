// frontend/src/features/resources/ResourcesPage.tsx
import { useState } from 'react'
import { useWorkload } from '@/hooks/useResources'
import { PageSpinner } from '@/components/ui/Spinner'
import { WorkloadGrid } from './WorkloadGrid'
import type { MemberWorkload } from '@/types'

function PeriodPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="month"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  )
}

function MemberWorkloadDetail({ row }: { row: MemberWorkload }) {
  return (
    <dl className="grid grid-cols-3 gap-4 text-sm">
      <div>
        <dt className="text-xs text-gray-500 dark:text-gray-400">Disponível</dt>
        <dd className="font-medium text-gray-900 dark:text-gray-100">
          {row.availableDays != null ? `${row.availableDays.toFixed(1)}d` : '—'}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-gray-500 dark:text-gray-400">Planejado</dt>
        <dd className="font-medium text-gray-900 dark:text-gray-100">
          {row.plannedDays.toFixed(1)}d
        </dd>
      </div>
      <div>
        <dt className="text-xs text-gray-500 dark:text-gray-400">Apontado</dt>
        <dd className="font-medium text-gray-900 dark:text-gray-100">
          {row.actualDays.toFixed(1)}d
        </dd>
      </div>
    </dl>
  )
}

export function ResourcesPage() {
  const today = new Date()
  const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const [period, setPeriod] = useState(defaultPeriod)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: rows = [], isLoading } = useWorkload({ period })

  function toggleExpand(row: MemberWorkload) {
    setExpandedId(prev => (prev === row.memberId ? null : row.memberId))
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Recursos — Workspace
        </h1>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>
      <WorkloadGrid
        rows={rows}
        onRowClick={toggleExpand}
        expandedMemberId={expandedId}
        renderExpanded={(row) => <MemberWorkloadDetail row={row} />}
      />
    </div>
  )
}
