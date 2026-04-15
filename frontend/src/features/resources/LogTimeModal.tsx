// frontend/src/features/resources/LogTimeModal.tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCreateTimeEntry } from '@/hooks/useResources'
import { useIssues } from '@/hooks/useIssues'
import { useAuthStore } from '@/stores/authStore'
import { Search } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export function LogTimeModal({ open, onClose }: Props) {
  const { projectId } = useParams<{ projectId: string }>()
  const { user } = useAuthStore()
  // useIssues returns a paginated shape: { results: Issue[], count, ... }
  const { data: issueData } = useIssues(projectId ?? '', {})
  const issues = issueData?.results ?? []
  const create = useCreateTimeEntry()

  const [search, setSearch] = useState('')
  const [selectedIssueId, setSelectedIssueId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState('')
  const [description, setDescription] = useState('')

  const filtered = issues.filter(
    i => i.type !== 'epic' &&
      (search === '' || i.title.toLowerCase().includes(search.toLowerCase()))
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedIssueId || !user) return
    create.mutate(
      {
        issue: selectedIssueId,
        member: user.id,
        date,
        hours: parseFloat(hours),
        description: description || undefined,
      },
      {
        onSuccess: () => {
          setSearch('')
          setSelectedIssueId('')
          setHours('')
          setDescription('')
          onClose()
        },
      },
    )
  }

  const selectedIssue = issues.find(i => i.id === selectedIssueId)

  return (
    <Modal open={open} onClose={onClose} title="Apontar horas">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Issue
          </label>
          {selectedIssue ? (
            <div className="flex items-center justify-between rounded-md border border-indigo-300 bg-white dark:bg-gray-900 px-3 py-2 text-sm">
              <span className="text-gray-700 dark:text-gray-300">
                <span className="font-mono text-xs text-gray-400 mr-1.5">#{selectedIssue.sequenceId}</span>
                {selectedIssue.title}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIssueId('')}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                trocar
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5">
                <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar issue..."
                  className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none"
                />
              </div>
              {search && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
                  {filtered.slice(0, 15).map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() => { setSelectedIssueId(issue.id); setSearch('') }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <span className="font-mono text-xs text-gray-400 shrink-0">#{issue.sequenceId}</span>
                      <span className="truncate text-gray-700 dark:text-gray-300">{issue.title}</span>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="px-3 py-2 text-xs text-gray-400">Nenhuma issue encontrada.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Horas"
            type="number"
            step="0.25"
            min="-24"
            max="24"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="ex: 4.0"
            required
          />
        </div>

        <Input
          label="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="O que foi feito..."
        />

        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            loading={create.isPending}
            disabled={!selectedIssueId || !hours}
          >
            Salvar
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
