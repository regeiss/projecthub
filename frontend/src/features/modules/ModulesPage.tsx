import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Layers,
  Plus,
  Trash2,
  Calendar,
  User,
  ChevronRight,
  CheckCircle2,
  Circle,
  PauseCircle,
  XCircle,
  LayoutGrid,
} from 'lucide-react'
import {
  useModules,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
} from '@/hooks/useModules'
import { useProjectMembers } from '@/hooks/useProjects'
import type { Module } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { PageSpinner } from '@/components/ui/Spinner'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate } from '@/lib/utils'

type ModuleStatus = Module['status']

const STATUS_CONFIG: Record<
  ModuleStatus,
  { label: string; icon: React.ElementType; pill: string; bar: string }
> = {
  backlog: {
    label: 'Backlog',
    icon: Circle,
    pill: 'bg-gray-100 text-gray-600',
    bar: 'bg-gray-300',
  },
  'in-progress': {
    label: 'Em andamento',
    icon: LayoutGrid,
    pill: 'bg-blue-50 text-blue-700',
    bar: 'bg-blue-500',
  },
  paused: {
    label: 'Pausado',
    icon: PauseCircle,
    pill: 'bg-amber-50 text-amber-700',
    bar: 'bg-amber-400',
  },
  completed: {
    label: 'Concluído',
    icon: CheckCircle2,
    pill: 'bg-green-50 text-green-700',
    bar: 'bg-green-500',
  },
  cancelled: {
    label: 'Cancelado',
    icon: XCircle,
    pill: 'bg-red-50 text-red-600',
    bar: 'bg-red-400',
  },
}

// ─── Create / Edit Modal ────────────────────────────────────────────────────

interface ModuleFormData {
  name: string
  description: string
  status: ModuleStatus
  leadId: string
  startDate: string
  targetDate: string
}

function ModuleModal({
  open,
  onClose,
  projectId,
  initial,
  moduleId,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  initial?: ModuleFormData
  moduleId?: string
}) {
  const isEdit = !!moduleId
  const { data: members = [] } = useProjectMembers(projectId)
  const create = useCreateModule(projectId)
  const update = useUpdateModule(projectId)

  const [form, setForm] = useState<ModuleFormData>(
    initial ?? {
      name: '',
      description: '',
      status: 'backlog',
      leadId: '',
      startDate: '',
      targetDate: '',
    },
  )

  function set<K extends keyof ModuleFormData>(key: K, val: ModuleFormData[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: Partial<Module> = {
      name: form.name,
      description: form.description || null,
      status: form.status,
      leadId: form.leadId || null,
      startDate: form.startDate || null,
      targetDate: form.targetDate || null,
    }
    if (isEdit && moduleId) {
      update.mutate({ moduleId, data: payload }, { onSuccess: onClose })
    } else {
      create.mutate(payload, { onSuccess: onClose })
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar módulo' : 'Novo módulo'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Ex: Módulo de Autenticação"
          required
          autoFocus
        />
        <Textarea
          label="Descrição"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Opcional — descreva o escopo deste módulo"
          rows={2}
        />

        <div className="grid grid-cols-2 gap-3">
          {/* Status */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as ModuleStatus)}
              className="h-9 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {(Object.keys(STATUS_CONFIG) as ModuleStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_CONFIG[s].label}
                </option>
              ))}
            </select>
          </div>

          {/* Lead */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Responsável</label>
            <select
              value={form.leadId}
              onChange={(e) => set('leadId', e.target.value)}
              className="h-9 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— Nenhum —</option>
              {members.map((m) => (
                <option key={m.memberId} value={m.memberId}>
                  {m.memberName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data de início"
            type="date"
            value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
          <Input
            label="Data prevista"
            type="date"
            value={form.targetDate}
            onChange={(e) => set('targetDate', e.target.value)}
          />
        </div>

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

// ─── Module Card ─────────────────────────────────────────────────────────────

function ModuleCard({
  mod,
  projectId,
  onEdit,
}: {
  mod: Module
  projectId: string
  onEdit: (m: Module) => void
}) {
  const remove = useDeleteModule(projectId)
  const update = useUpdateModule(projectId)
  const cfg = STATUS_CONFIG[mod.status]
  const StatusIcon = cfg.icon
  const issueCount = mod.issueCount ?? 0
  const completedCount = mod.completedCount ?? 0
  const progress = issueCount > 0 ? Math.round((completedCount / issueCount) * 100) : 0

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="h-4 w-4 shrink-0 text-indigo-500" />
          <h3
            className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
            onClick={() => onEdit(mod)}
          >
            {mod.name}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Status selector */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.pill}`}
          >
            <StatusIcon className="h-3 w-3" />
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Description */}
      {mod.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{mod.description}</p>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
        {mod.leadDetail && (
          <span className="flex items-center gap-1">
            <Avatar name={mod.leadDetail.name} src={mod.leadDetail.avatarUrl} size="xs" />
            <span className="text-gray-600 dark:text-gray-400">{mod.leadDetail.name}</span>
          </span>
        )}
        {!mod.leadDetail && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            Sem responsável
          </span>
        )}
        {(mod.startDate || mod.targetDate) && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {mod.startDate ? formatDate(mod.startDate) : '—'}
            {' → '}
            {mod.targetDate ? formatDate(mod.targetDate) : '—'}
          </span>
        )}
        <span className="ml-auto">
          {completedCount}/{issueCount} issues
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={`h-full rounded-full transition-all ${cfg.bar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-0.5 flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
          <span>{progress}% completo</span>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2">
        <select
          value={mod.status}
          onChange={(e) =>
            update.mutate({ moduleId: mod.id, data: { status: e.target.value as ModuleStatus } })
          }
          className="h-6 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-1.5 text-[11px] text-gray-600 dark:text-gray-400 focus:outline-none"
        >
          {(Object.keys(STATUS_CONFIG) as ModuleStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_CONFIG[s].label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(mod)}
            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Editar
            <ChevronRight className="h-3 w-3" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Deletar módulo "${mod.name}"?`)) remove.mutate(mod.id)
            }}
            className="rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Grouped sections ────────────────────────────────────────────────────────

const STATUS_ORDER: ModuleStatus[] = ['in-progress', 'backlog', 'paused', 'completed', 'cancelled']

function Section({
  status,
  modules,
  projectId,
  onEdit,
}: {
  status: ModuleStatus
  modules: Module[]
  projectId: string
  onEdit: (m: Module) => void
}) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  if (modules.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${cfg.pill.includes('blue') ? 'text-blue-600' : cfg.pill.includes('green') ? 'text-green-600' : cfg.pill.includes('amber') ? 'text-amber-600' : cfg.pill.includes('red') ? 'text-red-500' : 'text-gray-500'}`} />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {cfg.label}
        </h2>
        <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
          {modules.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((m) => (
          <ModuleCard key={m.id} mod={m} projectId={projectId} onEdit={onEdit} />
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ModulesPage() {
  const { projectId = '' } = useParams()
  const { data: modules = [], isLoading } = useModules(projectId)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Module | null>(null)

  if (isLoading) return <PageSpinner />

  const grouped = STATUS_ORDER.reduce<Record<ModuleStatus, Module[]>>(
    (acc, s) => ({ ...acc, [s]: modules.filter((m) => m.status === s) }),
    {} as Record<ModuleStatus, Module[]>,
  )

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-500" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Módulos</h1>
          <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            {modules.length}
          </span>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          Novo módulo
        </Button>
      </div>

      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-16 text-center">
          <Layers className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhum módulo criado</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Módulos agrupam issues relacionadas em entregas coesas.
          </p>
          <Button className="mt-4" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" />
            Criar primeiro módulo
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {STATUS_ORDER.map((s) => (
            <Section
              key={s}
              status={s}
              modules={grouped[s]}
              projectId={projectId}
              onEdit={setEditing}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <ModuleModal
          open
          onClose={() => setCreating(false)}
          projectId={projectId}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <ModuleModal
          open
          onClose={() => setEditing(null)}
          projectId={projectId}
          moduleId={editing.id}
          initial={{
            name: editing.name,
            description: editing.description ?? '',
            status: editing.status,
            leadId: editing.leadId ?? '',
            startDate: editing.startDate ?? '',
            targetDate: editing.targetDate ?? '',
          }}
        />
      )}
    </div>
  )
}
