import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useProject,
  useProjectMembers,
  useProjectStates,
  useProjectLabels,
  useAddProjectMember,
  useRemoveProjectMember,
  useUpdateProject,
} from '@/hooks/useProjects'
import { useWorkspaceMembers } from '@/hooks/useWorkspace'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { projectService } from '@/services/project.service'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageSpinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import type { IssueState, Label } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PRESET_COLORS = [
  '#6b7280', '#64748b', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
]

const CATEGORIES: Array<{ value: IssueState['category']; label: string }> = [
  { value: 'backlog',   label: 'Backlog' },
  { value: 'unstarted', label: 'Não iniciado' },
  { value: 'started',   label: 'Em progresso' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
]

// ---------------------------------------------------------------------------
// SortableStateRow
// ---------------------------------------------------------------------------
function SortableStateRow({
  state,
  onDelete,
}: {
  state: IssueState
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: state.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  const cat = CATEGORIES.find((c) => c.value === state.category)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
    >
      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 active:cursor-grabbing"
        aria-label="Arrastar para reorganizar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Color dot */}
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: state.color }}
      />

      {/* Name */}
      <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{state.name}</span>

      {/* Category */}
      <Badge>{cat?.label ?? state.category}</Badge>

      {/* Delete */}
      <button
        onClick={() => onDelete(state.id)}
        className="ml-1 rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
        aria-label={`Excluir estado ${state.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatesSection
// ---------------------------------------------------------------------------
function StatesSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient()
  const { data: raw = [] } = useProjectStates(projectId)
  const [localStates, setLocalStates] = useState<IssueState[]>([])

  // keep local list in sync when server data changes (but not during drag)
  useEffect(() => {
    setLocalStates([...raw].sort((a, b) => a.sequence - b.sequence))
  }, [raw])

  // mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<IssueState>) => projectService.createState(projectId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-states', projectId] }),
  })
  const updateMutation = useMutation({
    mutationFn: ({ stateId, data }: { stateId: string; data: Partial<IssueState> }) =>
      projectService.updateState(projectId, stateId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-states', projectId] }),
  })
  const deleteMutation = useMutation({
    mutationFn: (stateId: string) => projectService.deleteState(projectId, stateId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-states', projectId] }),
  })

  // add-state form
  const [addName, setAddName] = useState('')
  const [addColor, setAddColor] = useState(PRESET_COLORS[5])
  const [addCategory, setAddCategory] = useState<IssueState['category']>('unstarted')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return

    const oldIndex = localStates.findIndex((s) => s.id === active.id)
    const newIndex = localStates.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(localStates, oldIndex, newIndex)
    setLocalStates(reordered)

    // compute new sequence for the moved item from its neighbours
    const prev = reordered[newIndex - 1]
    const next = reordered[newIndex + 1]
    let newSeq: number
    if (!prev) newSeq = (next?.sequence ?? 1000) - 1000
    else if (!next) newSeq = (prev?.sequence ?? 0) + 1000
    else newSeq = (prev.sequence + next.sequence) / 2

    updateMutation.mutate({ stateId: active.id as string, data: { sequence: newSeq } })
  }

  function handleDelete(stateId: string) {
    const state = localStates.find((s) => s.id === stateId)
    if (!confirm(`Excluir o estado "${state?.name}"? As issues com este estado não serão excluídas.`)) return
    deleteMutation.mutate(stateId)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addName.trim()) return
    const maxSeq = localStates.reduce((m, s) => Math.max(m, s.sequence), 0)
    createMutation.mutate(
      { name: addName.trim(), color: addColor, category: addCategory, sequence: maxSeq + 1000 },
      {
        onSuccess: () => {
          setAddName('')
          setAddColor(PRESET_COLORS[5])
          setAddCategory('unstarted')
        },
      },
    )
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Estados ({localStates.length})
      </h2>

      {/* Sortable list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localStates.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5 mb-3">
            {localStates.map((s) => (
              <SortableStateRow key={s.id} state={s} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add state form */}
      <form
        onSubmit={handleAdd}
        className="rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-3"
      >
        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Novo estado</p>
        <div className="flex items-end gap-2">
          {/* Color picker */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">Cor</span>
            <div className="flex items-center gap-1 flex-wrap w-36">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAddColor(c)}
                  className={cn(
                    'h-5 w-5 rounded-full border-2 transition-transform hover:scale-110',
                    addColor === c
                      ? 'border-gray-700 dark:border-white scale-110'
                      : 'border-transparent',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="flex-1">
            <Input
              label="Nome"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Ex: Em revisão"
              required
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Categoria</label>
            <select
              value={addCategory}
              onChange={(e) => setAddCategory(e.target.value as IssueState['category'])}
              className="h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <Button type="submit" size="sm" loading={createMutation.isPending} disabled={!addName.trim()}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>
      </form>
    </section>
  )
}

// ---------------------------------------------------------------------------
// LabelsSection
// ---------------------------------------------------------------------------
const LABEL_PRESET_COLORS = [
  '#6b7280', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
]

function LabelRow({
  label,
  projectId,
  onDeleted,
}: {
  label: Label
  projectId: string
  onDeleted: () => void
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(label.name)
  const [color, setColor] = useState(label.color)

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Label>) => projectService.updateLabel(projectId, label.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-labels', projectId] })
      setEditing(false)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: () => projectService.deleteLabel(projectId, label.id),
    onSuccess: onDeleted,
  })

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    updateMutation.mutate({ name: name.trim(), color })
  }

  function handleDelete() {
    if (!confirm(`Excluir a etiqueta "${label.name}"?`)) return
    deleteMutation.mutate()
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSave}
        className="flex items-center gap-2 rounded-md border border-primary/40 bg-white dark:bg-gray-900 px-3 py-2"
      >
        {/* Color picker */}
        <div className="flex items-center gap-0.5 flex-wrap w-28 shrink-0">
          {LABEL_PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                'h-4 w-4 rounded-full border-2 transition-transform hover:scale-110',
                color === c ? 'border-gray-700 dark:border-white scale-110' : 'border-transparent',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Preview + name */}
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-0.5 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-primary"
        />

        <Button size="sm" type="submit" loading={updateMutation.isPending} disabled={!name.trim()}>
          Salvar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={() => { setName(label.name); setColor(label.color); setEditing(false) }}
        >
          ✕
        </Button>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: label.color + '20', color: label.color, border: `1px solid ${label.color}40` }}
      >
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
        {label.name}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => setEditing(true)}
          className="rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-xs"
        >
          Editar
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors disabled:opacity-40"
          aria-label={`Excluir etiqueta ${label.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function LabelsSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient()
  const { data: labels = [] } = useProjectLabels(projectId)

  const [addName, setAddName] = useState('')
  const [addColor, setAddColor] = useState(LABEL_PRESET_COLORS[5])

  const createMutation = useMutation({
    mutationFn: (data: Partial<Label>) => projectService.createLabel(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-labels', projectId] })
      setAddName('')
      setAddColor(LABEL_PRESET_COLORS[5])
    },
  })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addName.trim()) return
    createMutation.mutate({ name: addName.trim(), color: addColor })
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Etiquetas ({labels.length})
      </h2>

      <div className="space-y-1.5 mb-3">
        {labels.map((l) => (
          <LabelRow
            key={l.id}
            label={l}
            projectId={projectId}
            onDeleted={() => qc.invalidateQueries({ queryKey: ['project-labels', projectId] })}
          />
        ))}
        {labels.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">Nenhuma etiqueta criada ainda.</p>
        )}
      </div>

      {/* Add label form */}
      <form
        onSubmit={handleAdd}
        className="rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-3"
      >
        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Nova etiqueta</p>
        <div className="flex items-end gap-2">
          {/* Color picker */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">Cor</span>
            <div className="flex items-center gap-1 flex-wrap w-32">
              {LABEL_PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAddColor(c)}
                  className={cn(
                    'h-5 w-5 rounded-full border-2 transition-transform hover:scale-110',
                    addColor === c ? 'border-gray-700 dark:border-white scale-110' : 'border-transparent',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview + name */}
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Nome</label>
            <div className="flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 h-9">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: addColor }} />
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Ex: bug crítico"
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          <Button type="submit" size="sm" loading={createMutation.isPending} disabled={!addName.trim()}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>
      </form>
    </section>
  )
}

// ---------------------------------------------------------------------------
// ProjectSettings
// ---------------------------------------------------------------------------
export function ProjectSettings() {
  const { projectId = '' } = useParams()
  const { data: project, isLoading } = useProject(projectId)
  const { data: members = [] } = useProjectMembers(projectId)
  const currentWorkspace = useWorkspaceStore((s) => s.workspace)
  const { data: wsMembers = [] } = useWorkspaceMembers(currentWorkspace?.slug ?? '')
  const addMember = useAddProjectMember(projectId)
  const removeMember = useRemoveProjectMember(projectId)

  const updateProject = useUpdateProject()
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedRole, setSelectedRole] = useState('member')

  useEffect(() => {
    if (project) {
      setName(project.name)
      setIdentifier(project.identifier)
    }
  }, [project])

  const memberIds = new Set(members.map((m) => m.memberId))
  const availableMembers = wsMembers.filter((wm) => !memberIds.has(wm.id))

  if (isLoading) return <PageSpinner />
  if (!project) return null

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Configurações — {project.name}
      </h1>

      {/* General */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Geral</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim() || !identifier.trim()) return
            updateProject.mutate({ id: projectId, data: { name: name.trim(), identifier: identifier.trim().toUpperCase() } })
          }}
          className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
        >
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
          <div>
            <Input
              label="Identificador"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
              required
              aria-describedby="identifier-hint"
            />
            <p id="identifier-hint" className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Máx. 10 caracteres, letras maiúsculas e números. Prefixo dos IDs das issues (ex.: PROJ-1).
            </p>
          </div>
          <div className="flex items-center justify-between pt-1">
            {updateProject.isError && (
              <p className="text-xs text-red-500" role="alert">Erro ao salvar. O identificador pode já estar em uso.</p>
            )}
            {updateProject.isSuccess && (
              <p className="text-xs text-green-600 dark:text-green-400" role="status">Salvo com sucesso.</p>
            )}
            {!updateProject.isError && !updateProject.isSuccess && <span />}
            <Button
              type="submit"
              size="sm"
              loading={updateProject.isPending}
              disabled={!name.trim() || !identifier.trim() || (name === project.name && identifier === project.identifier)}
            >
              Salvar
            </Button>
          </div>
        </form>
      </section>

      {/* States — full CRUD + drag-to-reorder */}
      <StatesSection projectId={projectId} />

      {/* Labels — full CRUD */}
      <LabelsSection projectId={projectId} />

      {/* Members */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Membros ({members.length})
        </h2>

        {availableMembers.length === 0 && wsMembers.length > 0 && (
          <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
            Todos os membros do workspace já estão neste projeto.
          </p>
        )}
        {availableMembers.length > 0 && (
          <div className="mb-4 flex gap-2">
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Selecionar membro...</option>
              {availableMembers.map((wm) => (
                <option key={wm.id} value={wm.id}>{wm.name} ({wm.email})</option>
              ))}
            </select>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="member">Membro</option>
              <option value="admin">Admin</option>
              <option value="viewer">Visualizador</option>
            </select>
            <Button
              size="sm"
              disabled={!selectedMemberId || addMember.isPending}
              onClick={() => {
                if (!selectedMemberId) return
                addMember.mutate(
                  { memberId: selectedMemberId, role: selectedRole },
                  { onSuccess: () => { setSelectedMemberId(''); setSelectedRole('member') } },
                )
              }}
            >
              Adicionar
            </Button>
          </div>
        )}

        <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={m.memberAvatar} name={m.memberName} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.memberName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{m.memberEmail}</p>
              </div>
              <Badge variant={m.role === 'admin' ? 'info' : 'default'}>{m.role}</Badge>
              <button
                className="ml-2 text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                disabled={removeMember.isPending}
                onClick={() => removeMember.mutate(m.memberId)}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
