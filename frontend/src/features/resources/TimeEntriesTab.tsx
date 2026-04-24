// frontend/src/features/resources/TimeEntriesTab.tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTimeEntries, useDeleteTimeEntry } from '@/hooks/useResources'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { LogTimeModal } from './LogTimeModal'
import { Trash2, Plus } from 'lucide-react'

export function TimeEntriesTab() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { data: entries = [], isLoading } = useTimeEntries({ project: projectId })
  const deleteEntry = useDeleteTimeEntry()
  const [logging, setLogging] = useState(false)

  if (isLoading) return <PageSpinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {entries.length} apontamento{entries.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={() => setLogging(true)}>
          <Plus className="h-3.5 w-3.5" />
          Apontar horas
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          Nenhum apontamento registrado.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                {['Data', 'Membro', 'Issue', 'Horas', 'Descrição', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{entry.date}</td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{entry.memberName}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => navigate(`/projects/${projectId}/issues/${entry.issue}`)}
                      className="font-mono text-xs text-indigo-600 hover:underline"
                    >
                      #{entry.issueSequenceId}
                    </button>
                    <span className="ml-1.5 text-gray-600 dark:text-gray-400 truncate max-w-xs inline-block align-middle">
                      {entry.issueTitle}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium">
                    {entry.hours.toFixed(2)}h
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {entry.description ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => deleteEntry.mutate(entry.id)}
                      disabled={deleteEntry.isPending}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:opacity-40"
                      title="Excluir apontamento"
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

      {logging && <LogTimeModal open={logging} onClose={() => setLogging(false)} />}
    </div>
  )
}
