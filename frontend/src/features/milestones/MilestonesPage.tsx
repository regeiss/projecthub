import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Flag, Trash2, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone } from '@/hooks/useMilestones'
import type { Milestone, MilestoneStatus } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pendente', icon: Clock,         color: 'text-amber-500' },
  reached: { label: 'Atingido', icon: CheckCircle2,  color: 'text-green-500' },
  missed:  { label: 'Perdido',  icon: XCircle,       color: 'text-red-500'   },
}

function CreateMilestoneModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const create = useCreateMilestone(projectId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    create.mutate(
      { name, description: description || undefined, dueDate: dueDate || undefined },
      { onSuccess: () => { setName(''); setDescription(''); setDueDate(''); onClose() } },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo milestone" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Entrega v1.0" required autoFocus />
        <Input label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
        <Input label="Data prevista" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={create.isPending}>Criar</Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

function MilestoneCard({ milestone, projectId }: { milestone: Milestone; projectId: string }) {
  const update = useUpdateMilestone(projectId)
  const remove = useDeleteMilestone(projectId)
  const cfg = STATUS_CONFIG[milestone.status]
  const Icon = cfg.icon
  const progress = milestone.issueCount > 0
    ? Math.round((milestone.completedCount / milestone.issueCount) * 100)
    : 0

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 shrink-0 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{milestone.name}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={milestone.status}
            onChange={(e) => update.mutate({ milestoneId: milestone.id, data: { status: e.target.value as MilestoneStatus } })}
            className="h-7 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 text-xs focus:outline-none"
          >
            {(Object.keys(STATUS_CONFIG) as MilestoneStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
          <button
            onClick={() => confirm('Deletar milestone?') && remove.mutate(milestone.id)}
            className="text-gray-400 dark:text-gray-500 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {milestone.description && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{milestone.description}</p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${cfg.color}`} />
        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
        {milestone.dueDate && (
          <span className="text-xs text-gray-400 dark:text-gray-500">· {formatDate(milestone.dueDate)}</span>
        )}
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          {milestone.completedCount}/{milestone.issueCount} issues
        </span>
      </div>

      {milestone.issueCount > 0 && (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-0.5 text-right text-[10px] text-gray-400 dark:text-gray-500">{progress}%</p>
        </div>
      )}
    </div>
  )
}

export function MilestonesPage() {
  const { projectId = '' } = useParams()
  const { data: milestones = [], isLoading } = useMilestones(projectId)
  const [creating, setCreating] = useState(false)

  if (isLoading) return <PageSpinner />

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Milestones</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          Novo milestone
        </Button>
      </div>

      {milestones.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <Flag className="mx-auto mb-2 h-8 w-8 text-gray-400 dark:text-gray-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum milestone ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((m) => (
            <MilestoneCard key={m.id} milestone={m} projectId={projectId} />
          ))}
        </div>
      )}

      <CreateMilestoneModal
        projectId={projectId}
        open={creating}
        onClose={() => setCreating(false)}
      />
    </div>
  )
}
