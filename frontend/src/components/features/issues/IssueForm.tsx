import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProjectStates, useProjectLabels, useProjectMembers } from '@/hooks/useProjects'
import { useCreateIssue, useUpdateIssue, useCreateSubtask, useEpics } from '@/hooks/useIssues'
import { useCycles } from '@/hooks/useCycles'
import { useMilestones } from '@/hooks/useMilestones'
import { cycleService } from '@/services/cycle.service'
import type { Issue, IssueSize, IssueType, Priority } from '@/types'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MiniEditor } from '@/components/editor/MiniEditor'
import { EpicColorPicker } from '@/features/epics/EpicColorPicker'

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'urgent', label: 'Urgente' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
  { value: 'none', label: 'Nenhuma' },
]

const SIZES: { value: IssueSize; label: string }[] = [
  { value: 'xs', label: 'XS - Muito pequeno' },
  { value: 's', label: 'S - Pequeno' },
  { value: 'm', label: 'M - Médio' },
  { value: 'l', label: 'L - Grande' },
  { value: 'xl', label: 'XL - Muito grande' },
]

interface IssueFormProps {
  projectId: string
  open: boolean
  onClose: () => void
  issue?: Issue
  defaultStateId?: string
  parentIssueId?: string
  typeOverride?: IssueType
  defaultEpicId?: string
}

export function IssueForm({
  projectId,
  open,
  onClose,
  issue,
  defaultStateId,
  parentIssueId,
  typeOverride,
  defaultEpicId,
}: IssueFormProps) {
  // typeOverride locks special flows such as epic/subtask creation.
  const isEdit = !!issue
  const qc = useQueryClient()
  const { data: states = [] } = useProjectStates(projectId)
  const {
    data: labels = [],
    isLoading: labelsLoading,
    isError: labelsError,
  } = useProjectLabels(projectId)
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
  const [estimateDays, setEstimateDays] = useState(
    issue?.estimateDays != null ? String(issue.estimateDays) : '',
  )
  const [startDate, setStartDate] = useState(issue?.startDate ?? '')
  const [dueDate, setDueDate] = useState(issue?.dueDate ?? '')
  const [selectedLabels, setSelectedLabels] = useState(
    issue?.labels?.map((label) => label.id) ?? [],
  )
  const [milestoneId, setMilestoneId] = useState(issue?.milestoneId ?? '')
  const [cycleId, setCycleId] = useState(issue?.cycleId ?? '')
  const [epicId, setEpicId] = useState<string | null>(issue?.epicId ?? defaultEpicId ?? null)
  const [color, setColor] = useState<string | null>(issue?.color ?? '#6366f1')
  const [continueAdding, setContinueAdding] = useState(false)

  const { data: epics = [] } = useEpics(typeOverride !== 'epic' ? projectId : undefined)
  const availableLabels = labels.length > 0 ? labels : (issue?.labels ?? [])
  const showLabelLoading = labelsLoading && availableLabels.length === 0
  const showLabelError = labelsError && availableLabels.length === 0
  const showLabelEmpty = !labelsLoading && !labelsError && availableLabels.length === 0

  const defaultState = states.find((state) => state.category === 'backlog') ?? states[0]

  function resetFormAfterCreate() {
    setTitle('')
    setDescription(null)
    setPriority('none')
    setAssigneeId('')
    setSize('')
    setEstimateDays('')
    setStartDate('')
    setDueDate('')
    setSelectedLabels([])
    setMilestoneId('')
    setCycleId('')
    setEpicId(null)
    setColor('#6366f1')
  }

  function resetSubtaskFormAfterCreate() {
    setTitle('')
    setDescription(null)
    setPriority('none')
    setAssigneeId('')
    setSize('')
    setEstimateDays('')
    setStartDate('')
    setDueDate('')
    setSelectedLabels([])
    setMilestoneId('')
    setCycleId('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const data = {
      title,
      description: description || undefined,
      stateId: stateId || defaultState?.id,
      priority,
      type: typeOverride,
      assigneeId: assigneeId || undefined,
      size: (size || undefined) as IssueSize | undefined,
      estimateDays: estimateDays ? parseFloat(estimateDays) : undefined,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      labelIds: selectedLabels,
      milestoneId: milestoneId || undefined,
      ...(typeOverride !== 'epic' && epicId !== (issue?.epicId ?? null) ? { epicId } : {}),
      ...(typeOverride === 'epic' && color ? { color } : {}),
    }

    if (isEdit && issue) {
      const snapshotOldCycleId = issue.cycleId ?? ''
      const snapshotNewCycleId = cycleId
      update.mutate(
        { projectId, issueId: issue.id, data },
        {
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
        },
      )
      return
    }

    if (parentIssueId) {
      createSubtask.mutate(
        { issueId: parentIssueId, data },
        {
          onSuccess: () => {
            if (continueAdding) {
              resetSubtaskFormAfterCreate()
            } else {
              onClose()
            }
          },
        },
      )
      return
    }

    create.mutate(
      { projectId, data },
      {
        onSuccess: () => {
          if (continueAdding) {
            resetFormAfterCreate()
          } else {
            onClose()
          }
        },
      },
    )
  }

  function toggleLabel(id: string) {
    setSelectedLabels((prev) =>
      prev.includes(id) ? prev.filter((labelId) => labelId !== id) : [...prev, id],
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
            placeholder="Detalhes opcionais... (digite [[ para inserir um link de página wiki)"
            onChange={(html, isEmpty, json) => setDescription(isEmpty ? null : json)}
            projectId={projectId}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
            <select
              value={stateId || defaultState?.id}
              onChange={(e) => setStateId(e.target.value)}
              className="h-8 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Prioridade</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="h-8 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              {PRIORITIES.map((priorityOption) => (
                <option key={priorityOption.value} value={priorityOption.value}>
                  {priorityOption.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Responsável</label>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="h-8 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="">- sem responsável -</option>
            {members.map((member) => (
              <option key={member.id} value={member.memberId}>
                {member.memberName}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tamanho</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as IssueSize | '')}
              className="h-8 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">- sem tamanho -</option>
              {SIZES.map((sizeOption) => (
                <option key={sizeOption.value} value={sizeOption.value}>
                  {sizeOption.label}
                </option>
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
              className="h-8 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data de início"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Data de entrega"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {milestones.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Marco</label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="h-8 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">- sem marco -</option>
              {milestones.map((milestone) => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
              className="h-8 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">- sem ciclo -</option>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {typeOverride !== 'epic' && epics.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Épico</label>
            <select
              value={epicId ?? ''}
              onChange={(e) => setEpicId(e.target.value || null)}
              className="h-8 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">- nenhum épico -</option>
              {epics.map((epic) => (
                <option key={epic.id} value={epic.id}>
                  #{epic.sequenceId} {epic.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {typeOverride === 'epic' && (
          <EpicColorPicker value={color} onChange={setColor} />
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Etiquetas</label>
          {showLabelLoading ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">Carregando etiquetas...</p>
          ) : showLabelError ? (
            <p className="text-xs text-red-500 dark:text-red-400">Nao foi possivel carregar as etiquetas.</p>
          ) : showLabelEmpty ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">Nenhuma etiqueta disponivel neste projeto.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableLabels.map((label) => {
                const selected = selectedLabels.includes(label.id)
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    aria-pressed={selected}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all"
                    style={{
                      backgroundColor: selected ? label.color + '28' : label.color + '16',
                      color: label.color,
                      border: `1px solid ${selected ? label.color : label.color + '40'}`,
                      boxShadow: selected ? `0 0 0 1px ${label.color}35` : 'none',
                    }}
                  >
                    {label.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <ModalFooter>
          {!isEdit && (
            <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={continueAdding}
                onChange={(e) => setContinueAdding(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600"
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
