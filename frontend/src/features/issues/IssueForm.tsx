import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProjectStates, useProjectLabels, useProjectMembers } from '@/hooks/useProjects'
import { useCreateIssue, useUpdateIssue, useCreateSubtask } from '@/hooks/useIssues'
import { useCycles } from '@/hooks/useCycles'
import { useMilestones } from '@/hooks/useMilestones'
import { cycleService } from '@/services/cycle.service'
import type { Issue, IssueSize, IssueType, Priority } from '@/types'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MiniEditor } from '@/components/editor/MiniEditor'

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
  defaultStateId?: string
  parentIssueId?: string
  typeOverride?: IssueType
}

export function IssueForm({ projectId, open, onClose, issue, defaultStateId, parentIssueId, typeOverride }: IssueFormProps) {
  // typeOverride is accepted (passed by SubtaskList) but currently unused
  // because IssueForm has no type selector field — kept for API compatibility
  const isEdit = !!issue
  const qc = useQueryClient()
  const { data: states = [] } = useProjectStates(projectId)
  const { data: labels = [] } = useProjectLabels(projectId)
  const { data: members = [] } = useProjectMembers(projectId)
  const { data: cycles = [] } = useCycles(projectId)
  const { data: milestones = [] } = useMilestones(projectId)
  const create = useCreateIssue()
  const createSubtask = useCreateSubtask()
  const update = useUpdateIssue()

  const [title, setTitle] = useState(issue?.title ?? '')
  const [description, setDescription] = useState<Record<string, unknown> | null>(issue?.description ?? null)
  const [stateId, setStateId] = useState(issue?.stateId ?? defaultStateId ?? states[0]?.id ?? '')
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
  const [cycleId, setCycleId] = useState(issue?.cycleId ?? '')
  const [continueAdding, setContinueAdding] = useState(false)

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
      const snapshotOldCycleId = issue.cycleId ?? ''
      const snapshotNewCycleId = cycleId
      update.mutate({ projectId, issueId: issue.id, data }, {
        onSuccess: () => {
          onClose()
          if (snapshotNewCycleId !== snapshotOldCycleId) {
            const run = async () => {
              try {
                if (snapshotOldCycleId) await cycleService.removeIssue(snapshotOldCycleId, issue.id)
                if (snapshotNewCycleId) await cycleService.addIssue(snapshotNewCycleId, issue.id)
              } finally {
                qc.invalidateQueries({ queryKey: ['cycles', projectId] })
                qc.invalidateQueries({ queryKey: ['issue', issue.id] })
              }
            }
            run()
          }
        },
      })
    } else if (parentIssueId) {
      createSubtask.mutate({ issueId: parentIssueId, data }, {
        onSuccess: () => {
          if (continueAdding) {
            setTitle('')
            setDescription(null)
            setPriority('none')
            setAssigneeId('')
            setSize('')
            setEstimateDays('')
            setSelectedLabels([])
            setMilestoneId('')
            setCycleId('')
          } else {
            onClose()
          }
        },
      })
    } else {
      create.mutate({ projectId, data }, {
        onSuccess: () => {
          if (continueAdding) {
            setTitle('')
            setDescription(null)
            setPriority('none')
            setAssigneeId('')
            setSize('')
            setEstimateDays('')
            setSelectedLabels([])
            setMilestoneId('')
            setCycleId('')
          } else {
            onClose()
          }
        },
      })
    }
  }

  function toggleLabel(id: string) {
    setSelectedLabels((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id],
    )
  }

  const isPending = create.isPending || createSubtask.isPending || update.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar issue' : 'Nova issue'}
      size="xl"
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

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Descrição
          </label>
          <MiniEditor
            initialContent={description ?? undefined}
            placeholder="Detalhes opcionais…"
            onChange={(html, isEmpty, json) => setDescription(isEmpty ? null : json)}
          />
        </div>

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
            <label
              htmlFor="issue-cycle-select"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Ciclo
            </label>
            <select
              id="issue-cycle-select"
              value={cycleId}
              onChange={(e) => setCycleId(e.target.value)}
              className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— sem ciclo —</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
          {!isEdit && (
            <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={continueAdding}
                onChange={(e) => setContinueAdding(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              Continuar adicionando
            </label>
          )}
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
