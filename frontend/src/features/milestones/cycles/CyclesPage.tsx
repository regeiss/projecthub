import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, RotateCcw } from 'lucide-react'
import { useCycles, useCreateCycle } from '@/hooks/useCycles'
import { Button } from '@/components/ui/Button'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import type { Cycle } from '@/types'

function statusVariant(status: Cycle['status']) {
  return status === 'active'
    ? ('success' as const)
    : status === 'completed'
    ? ('info' as const)
    : ('default' as const)
}

function CreateCycleModal({
  open,
  onClose,
  projectId,
}: {
  open: boolean
  onClose: () => void
  projectId: string
}) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const create = useCreateCycle()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    create.mutate(
      { projectId, data: { name, startDate, endDate, status: 'draft' } },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo ciclo" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Sprint 1"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Início"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <Input
            label="Fim"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <ModalFooter>
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

export function CyclesPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const { data: cycles = [], isLoading } = useCycles(projectId)
  const [creating, setCreating] = useState(false)

  if (isLoading) return <PageSpinner />

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Ciclos</h2>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          Novo ciclo
        </Button>
      </div>

      {cycles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <RotateCcw className="mx-auto mb-2 h-8 w-8 text-gray-400 dark:text-gray-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum ciclo criado ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map((c) => (
            <button
              key={c.id}
              className="flex w-full items-center gap-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => navigate(c.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(c.startDate)} — {formatDate(c.endDate)}
                </p>
              </div>
              <Badge variant={statusVariant(c.status)}>
                {c.status === 'active'
                  ? 'Ativo'
                  : c.status === 'completed'
                  ? 'Concluído'
                  : 'Rascunho'}
              </Badge>
              {typeof c.issueCount === 'number' && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {c.completedCount ?? 0}/{c.issueCount} issues
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <CreateCycleModal
        open={creating}
        onClose={() => setCreating(false)}
        projectId={projectId}
      />
    </div>
  )
}
