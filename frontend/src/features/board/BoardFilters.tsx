import { useState } from 'react'
import { Filter, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCreateIssue } from '@/hooks/useIssues'
import { useProjectStates } from '@/hooks/useProjects'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'

function CreateIssueModal({
  open,
  onClose,
  projectId,
}: {
  open: boolean
  onClose: () => void
  projectId: string
}) {
  const [title, setTitle] = useState('')
  const { data: states = [] } = useProjectStates(projectId)
  const [stateId, setStateId] = useState('')
  const [continueAdding, setContinueAdding] = useState(false)
  const create = useCreateIssue()

  const defaultState = states.find((s) => s.category === 'backlog') ?? states[0]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    create.mutate(
      {
        projectId,
        data: {
          title,
          stateId: stateId || defaultState?.id,
          priority: 'none',
        },
      },
      {
        onSuccess: () => {
          if (continueAdding) {
            setTitle('')
          } else {
            onClose()
          }
        },
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova issue" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="O que precisa ser feito?"
          required
          autoFocus
        />
        {states.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
            <select
              value={stateId || defaultState?.id}
              onChange={(e) => setStateId(e.target.value)}
              className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <ModalFooter>
          <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={continueAdding}
              onChange={(e) => setContinueAdding(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
            Continuar adicionando
          </label>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={create.isPending}>
            Criar
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

export function BoardFilters({ projectId }: { projectId: string }) {
  const [creating, setCreating] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setCreating(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Issue
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm">
          <Filter className="h-3.5 w-3.5" />
          Filtrar
        </Button>
      </div>

      <CreateIssueModal
        open={creating}
        onClose={() => setCreating(false)}
        projectId={projectId}
      />
    </>
  )
}
