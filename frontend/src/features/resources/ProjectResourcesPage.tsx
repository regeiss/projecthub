// frontend/src/features/resources/ProjectResourcesPage.tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  useProjectWorkload,
  useResourceProfiles,
  useCreateResourceProfile,
  useUpdateResourceProfile,
  useMemberCapacities,
  useCreateCapacity,
  useUpdateCapacity,
} from '@/hooks/useResources'
import { PageSpinner } from '@/components/ui/Spinner'
import { WorkloadGrid } from './WorkloadGrid'
import { TimeEntriesTab } from './TimeEntriesTab'
import { cn } from '@/lib/utils'
import type { MemberWorkload } from '@/types'

type Tab = 'workload' | 'time-entries'

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

function RateEditor({ projectId, row }: { projectId: string; row: MemberWorkload }) {
  const { data: profiles = [] } = useResourceProfiles(projectId)
  const create = useCreateResourceProfile()
  const update = useUpdateResourceProfile()
  const existing = profiles.find(p => p.member === row.memberId)

  const [editing, setEditing] = useState(false)
  const [rate, setRate] = useState<string>(existing?.dailyRateBrl ?? '')

  function handleSave() {
    if (existing) {
      update.mutate({ id: existing.id, dailyRateBrl: rate }, { onSuccess: () => setEditing(false) })
    } else {
      create.mutate(
        { project: projectId, member: row.memberId, dailyRateBrl: rate },
        { onSuccess: () => setEditing(false) },
      )
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setRate(existing?.dailyRateBrl ?? ''); setEditing(true) }}
        className="text-xs text-indigo-600 hover:underline"
      >
        {existing ? `R$${existing.dailyRateBrl}/dia` : '+ Taxa'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        step="0.01"
        min="0"
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        className="w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-0.5 text-xs"
        placeholder="ex: 350.00"
        autoFocus
      />
      <button
        onClick={handleSave}
        disabled={create.isPending || update.isPending}
        className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
      >
        salvar
      </button>
      <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">
        cancelar
      </button>
    </div>
  )
}

function CapacityEditor({ row, year, month }: { row: MemberWorkload; year: number; month: number }) {
  const { data: capacities = [] } = useMemberCapacities({ member: row.memberId, year, month })
  const create = useCreateCapacity()
  const update = useUpdateCapacity()
  const existing = capacities[0] ?? null
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')

  function startEdit() {
    setValue(existing ? String(existing.availableDays) : '')
    setEditing(true)
  }

  function handleSave() {
    const days = parseFloat(value)
    if (isNaN(days) || days < 0) return
    if (existing) {
      update.mutate({ id: existing.id, dto: { availableDays: days } }, { onSuccess: () => setEditing(false) })
    } else {
      create.mutate({ member: row.memberId, year, month, availableDays: days }, { onSuccess: () => setEditing(false) })
    }
  }

  const isPending = create.isPending || update.isPending

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Disponível:</span>
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
        <button onClick={handleSave} disabled={isPending} className="text-xs text-indigo-600 hover:underline disabled:opacity-50">salvar</button>
        <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">cancelar</button>
      </div>
    )
  }

  return (
    <button onClick={startEdit} className="text-xs text-indigo-600 hover:underline" title="Editar capacidade">
      {existing ? `${existing.availableDays.toFixed(1)}d disponível` : '+ Capacidade'}
    </button>
  )
}

export function ProjectResourcesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const today = new Date()
  const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const [period, setPeriod] = useState(defaultPeriod)
  const [activeTab, setActiveTab] = useState<Tab>('workload')

  const { data: rows = [], isLoading } = useProjectWorkload(projectId ?? '', { period })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [year, month] = period.split('-').map(Number)

  function toggleExpand(row: MemberWorkload) {
    setExpandedId(prev => (prev === row.memberId ? null : row.memberId))
  }

  const tabCls = (t: Tab) =>
    cn(
      'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
      activeTab === t
        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
    )

  if (isLoading) return <PageSpinner />

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className={tabCls('workload')} onClick={() => setActiveTab('workload')}>
            Workload
          </button>
          <button className={tabCls('time-entries')} onClick={() => setActiveTab('time-entries')}>
            Apontamentos
          </button>
        </div>
        {activeTab === 'workload' && (
          <PeriodPicker value={period} onChange={setPeriod} />
        )}
      </div>

      {activeTab === 'workload' && (
        <WorkloadGrid
          rows={rows}
          showCost
          onRowClick={toggleExpand}
          expandedMemberId={expandedId}
          renderExpanded={(row) =>
            projectId ? (
              <div className="flex items-center gap-4">
                <CapacityEditor row={row} year={year} month={month} />
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <RateEditor projectId={projectId} row={row} />
              </div>
            ) : null
          }
        />
      )}

      {activeTab === 'time-entries' && <TimeEntriesTab />}
    </div>
  )
}
