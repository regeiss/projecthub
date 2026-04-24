// frontend/src/features/resources/ResourcesPage.tsx
import { useState } from 'react'
import { useWorkload, useMemberCapacities, useCreateCapacity, useUpdateCapacity } from '@/hooks/useResources'
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

function CapacityEditor({
  row,
  year,
  month,
}: {
  row: MemberWorkload
  year: number
  month: number
}) {
  const { data: capacities = [] } = useMemberCapacities({ member: row.memberId, year, month })
  const create = useCreateCapacity()
  const update = useUpdateCapacity()

  const existing = capacities[0] ?? null
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState<string>('')

  function startEdit() {
    setValue(existing ? String(existing.availableDays) : '')
    setEditing(true)
  }

  function handleSave() {
    const days = parseFloat(value)
    if (isNaN(days) || days < 0) return
    if (existing) {
      update.mutate(
        { id: existing.id, dto: { availableDays: days } },
        { onSuccess: () => setEditing(false) },
      )
    } else {
      create.mutate(
        { member: row.memberId, year, month, availableDays: days },
        { onSuccess: () => setEditing(false) },
      )
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <div className="flex items-center gap-6 text-sm">
      {/* Disponível — editable */}
      <div>
        <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Disponível</p>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.5"
              min="0"
              max="31"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="dias"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            />
            <button
              onClick={handleSave}
              disabled={isPending}
              className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
            >
              salvar
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">
              cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            title="Clique para editar"
          >
            {existing ? `${existing.availableDays.toFixed(1)}d` : <span className="text-xs text-indigo-500 hover:underline">+ definir</span>}
          </button>
        )}
      </div>

      <div>
        <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Planejado</p>
        <p className="font-medium text-gray-900 dark:text-gray-100">{row.plannedDays.toFixed(1)}d</p>
      </div>

      <div>
        <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Apontado</p>
        <p className="font-medium text-gray-900 dark:text-gray-100">{row.actualDays.toFixed(1)}d</p>
      </div>
    </div>
  )
}

export function ResourcesPage() {
  const today = new Date()
  const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const [period, setPeriod] = useState(defaultPeriod)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: rows = [], isLoading } = useWorkload({ period })

  const [year, month] = period.split('-').map(Number)

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
        renderExpanded={(row) => (
          <CapacityEditor row={row} year={year} month={month} />
        )}
      />
    </div>
  )
}
