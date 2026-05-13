// frontend/src/features/resources/TimeByIssueReport.tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useTimeReport } from '@/hooks/useResources'
import { useProjectMembers } from '@/hooks/useProjects'
import { PageSpinner } from '@/components/ui/Spinner'
import type { TimeReportParams, TimeReportRow } from '@/types'

function csvEscape(v: string | number): string {
  const s = String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}

function exportCsv(rows: TimeReportRow[], totalHours: number) {
  const header = ['#', 'Título', 'Status', 'Responsável', 'Estimado (dias)', 'Apontado (h)', 'Apontamentos']
  const lines = [
    header.join(','),
    ...rows.map(r =>
      [
        csvEscape(r.issueSequenceId),
        csvEscape(r.issueTitle),
        csvEscape(r.stateName),
        csvEscape(r.assigneeName),
        csvEscape(r.estimateDays),
        csvEscape(r.totalHours.toFixed(2)),
        csvEscape(r.entriesCount),
      ].join(','),
    ),
    ['', 'TOTAL', '', '', '', csvEscape(totalHours.toFixed(2)), ''].join(','),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'relatorio-tempo-por-issue.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function TimeByIssueReport() {
  const { projectId = '' } = useParams<{ projectId: string }>()
  const today = new Date()
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

  const [dateFrom, setDateFrom] = useState(firstDay)
  const [dateTo, setDateTo] = useState(lastDayStr)
  const [memberId, setMemberId] = useState('')

  const params: TimeReportParams = {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    member: memberId || undefined,
  }

  const { data, isLoading } = useTimeReport(projectId, params)
  const { data: members = [] } = useProjectMembers(projectId)

  const rows = data?.rows ?? []
  const totalHours = data?.totalHours ?? 0

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">De</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Até</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Membro</label>
          <select
            value={memberId}
            onChange={e => setMemberId(e.target.value)}
            className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos</option>
            {members.map(m => (
              <option key={m.memberId} value={m.memberId}>
                {m.memberName}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => exportCsv(rows, totalHours)}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <PageSpinner />
      ) : rows.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-gray-400">
          Nenhum apontamento no período.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">#</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Título</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Responsável</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estimado</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Apontado (h)</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Qtd.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
              {rows.map(row => (
                <tr key={row.issueId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 tabular-nums">
                    #{row.issueSequenceId}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate">
                    {row.issueTitle}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: row.stateColor }}
                      />
                      <span className="text-gray-600 dark:text-gray-300 text-xs">{row.stateName}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                    {row.assigneeName || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300 tabular-nums">
                    {row.estimateDays > 0 ? `${row.estimateDays}d` : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                    {row.totalHours.toFixed(2)}h
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                    {row.entriesCount}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-700">
              <tr>
                <td colSpan={5} className="px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Total — {rows.length} issue{rows.length !== 1 ? 's' : ''}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                  {totalHours.toFixed(2)}h
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
