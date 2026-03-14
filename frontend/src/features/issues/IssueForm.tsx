import { useState } from 'react'
import { useProjectStates, useProjectLabels, useProjectMembers } from '@/hooks/useProjects'
import { useCreateIssue, useUpdateIssue } from '@/hooks/useIssues'
import { useCycles } from '@/hooks/useCycles'
import { useMilestones } from '@/hooks/useMilestones'
import type { Issue, IssueSize, Priority } from '@/types'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'urgent', label: 'Urgente' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
  { value: 'none', label: 'Nenhuma' },
]

const SIZES: { value: IssueSize; label: string }[] = [
  { value: 'xs', label: 'XS — Muito pequeno' },
  { value: 's',  label: 'S — Pequeno' },
  { value: 'm',  label: 'M — Médio' },
  { value: 'l',  label: 'L — Grande' },
  { value: 'xl', label: 'XL — Muito grande' },
]

interface IssueFormProps {
  projectId: string
  open: boolean
  onClose: () => void
  issue?: Issue
}

export function IssueForm({ projectId, open, onClose, issue }: IssueFormProps) {
  const isEdit = !!issue
  const { data: states = [] } = useProjectStates(projectId)
  const { data: labels = [] } = useProjectLabels(projectId)
  const { data: members = [] } = useProjectMembers(projectId)
  const { data: cycles = [] } = useCycles(projectId)
  const { data: milestones = [] } = useMilestones(projectId)
  const create = useCreateIssue()
  const update = useUpdateIssue()

  const [title, setTitle] = useState(issue?.title ?? '')
  const [description, setDescription] = useState(issue?.description ?? '')
  const [stateId, setStateId] = useState(issue?.stateId ?? states[0]?.id ?? '')
  const [priority, setPriority] = useState<Priority>(issue?.priority ?? 'none')
  const [assigneeId, setAssigneeId] = useState(issue?.assigneeId ?? '')
  const [size, setSize] = useState<IssueSize | ''>(issue?.size ?? '')
  const [estimateDays, setEstimateDays] = useState<string>(
    issue?.estimateDays != null ? String(issue.estimateDays) : '',
  )
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    issue?.labels?.map((l) => l.id) ?? [],
  )
  const [milestoneId, setMilestoneId] = useState(issue?.milestoneId ?? '')

  const defaultState =
    states.find((s) => s.category === 'backlog') ?? states[0]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      title,
      description: description || undefined,
      stateId: stateId || defaultState?.id,
      priority,
      assigneeId: assigneeId || undefined,
      size: (size || undefined) as IssueSize | undefined,
      estimateDays: estimateDays ? parseFloat(estimateDays) : undefined,
      labelIds: selectedLabels,
      milestoneId: milestoneId || undefined,
    }
    if (isEdit && issue) {
      update.mutate({ projectId, issueId: issue.id, data }, { onSuccess: onClose })
    } else {
      create.mutate({ projectId, data }, { onSuccess: onClose })
    }
  }

  function toggleLabel(id: string) {
    setSelectedLabels((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id],
    )
  }

  const isPending = create.isPending || update.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar issue' : 'Nova issue'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="O que precisa ser feito?"
          required
          autoFocus
        />

        <Textarea
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes opcionais…"
          rows={4}
        />

        <div className="grid grid-cols-2 gap-3">
          {/* State */}
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

          {/* Priority */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Prioridade</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assignee */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Responsável</label>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— sem responsável —</option>
            {members.map((m) => (
              <option key={m.id} value={m.memberId}>
                {m.memberName}
              </option>
            ))}
          </select>
        </div>

        {/* Size + Estimate */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tamanho</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as IssueSize | '')}
              className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— sem tamanho —</option>
              {SIZES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estimativa (dias)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={estimateDays}
              onChange={(e) => setEstimateDays(e.target.value)}
              placeholder="Ex: 3"
              className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Milestone */}
        {milestones.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Marco</label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— sem marco —</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Cycle */}
        {cycles.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ciclo atual</label>
            <input
              type="text"
              readOnly
              value={issue?.cycleName ?? '— nenhum —'}
              className="h-8 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 text-sm text-gray-500 dark:text-gray-400"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500">Para mover entre ciclos, use a tela de Ciclos do projeto.</p>
          </div>
        )}

        {/* Labels */}
        {labels.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Etiquetas</label>
            <div className="flex flex-wrap gap-2">
              {labels.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleLabel(l.id)}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity"
                  style={{
                    backgroundColor: l.color + '20',
                    color: l.color,
                    border: `1px solid ${l.color}40`,
                    opacity: selectedLabels.includes(l.id) ? 1 : 0.4,
                  }}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? 'Salvar' : 'Criar'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
