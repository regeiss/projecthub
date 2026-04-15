// frontend/src/features/resources/ProjectResourcesPage.tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  useProjectWorkload,
  useResourceProfiles,
  useCreateResourceProfile,
  useUpdateResourceProfile,
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

export function ProjectResourcesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const today = new Date()
  const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const [period, setPeriod] = useState(defaultPeriod)
  const [activeTab, setActiveTab] = useState<Tab>('workload')

  const { data: rows = [], isLoading } = useProjectWorkload(projectId ?? '', { period })
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
            projectId ? <RateEditor projectId={projectId} row={row} /> : null
          }
        />
      )}

      {activeTab === 'time-entries' && <TimeEntriesTab />}
    </div>
  )
}
