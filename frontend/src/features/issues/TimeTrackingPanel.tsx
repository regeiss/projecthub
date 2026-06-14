import { useState } from 'react'
import { Clock, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTimeEntries, useLogTime, useDeleteTimeEntry } from '@/hooks/useTimeEntries'
import { useAuthStore } from '@/stores/authStore'

function today() {
  return new Date().toISOString().slice(0, 10)
}

interface Props {
  issueId: string
}

export function TimeTrackingPanel({ issueId }: Props) {
  const { user } = useAuthStore()
  const { data: entries = [], isLoading } = useTimeEntries(issueId)
  const logTime = useLogTime(issueId)
  const deleteEntry = useDeleteTimeEntry(issueId)

  const [hours, setHours] = useState('')
  const [date, setDate] = useState(today)
  const [description, setDescription] = useState('')
  const [showForm, setShowForm] = useState(false)

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const h = parseFloat(hours)
    if (!h || h <= 0) return
    logTime.mutate(
      { hours: h, date, description: description || undefined },
      {
        onSuccess: () => {
          setHours('')
          setDate(today())
          setDescription('')
          setShowForm(false)
        },
      },
    )
  }

  return (
    <section
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
      aria-label="Registro de horas"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Horas registradas
          </h2>
          {totalHours > 0 && (
            <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
              {totalHours.toFixed(1)}h total
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          aria-label="Registrar horas"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Registrar
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="te-hours" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Horas</label>
              <input
                id="te-hours"
                type="number"
                min="0.1"
                step="0.1"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="1.5"
                required
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="te-date" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data</label>
              <input
                id="te-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={logTime.isPending}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {logTime.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">Carregando…</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">Nenhuma hora registrada.</p>
      ) : (
        <ul className="space-y-1" aria-label="Lançamentos de horas">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800">
              <span className="font-semibold text-sm text-blue-700 dark:text-blue-300 w-10 shrink-0">
                {entry.hours.toFixed(1)}h
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{entry.date}</span>
              <span className="flex-1 truncate text-xs text-gray-700 dark:text-gray-300">
                {entry.description ?? ''}
              </span>
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{entry.memberName}</span>
              {(user?.id === entry.memberId || user?.role === 'admin') && (
                <button
                  type="button"
                  onClick={() => deleteEntry.mutate(entry.id)}
                  disabled={deleteEntry.isPending}
                  aria-label="Remover lançamento"
                  className={cn(
                    'shrink-0 rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-red-500',
                    'dark:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-red-400',
                  )}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
