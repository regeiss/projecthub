import { useState } from 'react'
import {
  usePortfolioObjectives,
  useCreateObjective,
  useUpdateObjective,
  useDeleteObjective,
} from '@/hooks/usePortfolio'
import { PageSpinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Target, Plus, Edit2, Trash2 } from 'lucide-react'
import type { PortfolioObjective } from '@/types'

interface OkrPanelProps {
  portfolioId: string
}

// ─── Objective Modal ──────────────────────────────────────────────────────────

interface ObjForm {
  title: string
  description: string
  targetValue: string
  currentValue: string
  unit: string
  dueDate: string
}

function ObjectiveModal({
  open,
  onClose,
  portfolioId,
  editing,
}: {
  open: boolean
  onClose: () => void
  portfolioId: string
  editing?: PortfolioObjective
}) {
  const create = useCreateObjective(portfolioId)
  const update = useUpdateObjective(portfolioId)

  const [form, setForm] = useState<ObjForm>({
    title:        editing?.title ?? '',
    description:  editing?.description ?? '',
    targetValue:  editing?.targetValue ?? '100',
    currentValue: editing?.currentValue ?? '0',
    unit:         editing?.unit ?? '%',
    dueDate:      editing?.dueDate ?? '',
  })

  function set<K extends keyof ObjForm>(k: K, v: ObjForm[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: Partial<PortfolioObjective> = {
      title:        form.title,
      description:  form.description || null,
      targetValue:  form.targetValue,
      currentValue: form.currentValue,
      unit:         form.unit || null,
      dueDate:      form.dueDate || null,
    }
    if (editing) {
      update.mutate({ objId: editing.id, data: payload }, { onSuccess: onClose })
    } else {
      create.mutate(payload, { onSuccess: onClose })
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar objetivo' : 'Novo objetivo'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Título"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Ex: Aumentar a satisfação dos cidadãos"
          required
          autoFocus
        />
        <Input
          label="Descrição"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Opcional"
        />
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Meta"
            type="number"
            value={form.targetValue}
            onChange={(e) => set('targetValue', e.target.value)}
            required
          />
          <Input
            label="Atual"
            type="number"
            value={form.currentValue}
            onChange={(e) => set('currentValue', e.target.value)}
            required
          />
          <Input
            label="Unidade"
            value={form.unit}
            onChange={(e) => set('unit', e.target.value)}
            placeholder="%"
          />
        </div>
        <Input
          label="Prazo"
          type="date"
          value={form.dueDate}
          onChange={(e) => set('dueDate', e.target.value)}
        />
        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isPending}>
            {editing ? 'Salvar' : 'Criar'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

// ─── Objective Card ───────────────────────────────────────────────────────────

function ObjectiveCard({
  obj,
  portfolioId,
  onEdit,
}: {
  obj: PortfolioObjective
  portfolioId: string
  onEdit: (o: PortfolioObjective) => void
}) {
  const remove = useDeleteObjective(portfolioId)
  const pct = obj.progressPct ?? 0
  const current = parseFloat(String(obj.currentValue ?? 0)) || 0
  const target = parseFloat(String(obj.targetValue ?? 100)) || 100
  const barColor =
    pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-indigo-500'

  return (
    <div className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Target className="h-4 w-4 shrink-0 text-indigo-500" />
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{obj.title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onEdit(obj)}
            className="rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-400"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() =>
              confirm(`Deletar objetivo "${obj.title}"?`) && remove.mutate(obj.id)
            }
            className="rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {obj.description && (
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{obj.description}</p>
      )}

      <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {current} / {target}
          {obj.unit ? ` ${obj.unit}` : ''}
        </span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {obj.dueDate && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Prazo: {new Date(obj.dueDate).toLocaleDateString('pt-BR')}
          </span>
        )}
        {obj.linkedProjects && obj.linkedProjects.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {obj.linkedProjects.map((p) => (
              <span
                key={p.project}
                className="inline-flex items-center rounded bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 text-xs text-indigo-700 dark:text-indigo-400"
              >
                {p.projectName}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function OkrPanel({ portfolioId }: OkrPanelProps) {
  const { data: objectives, isLoading } = usePortfolioObjectives(portfolioId)
  const [creating, setCreating] = useState(false)
  const [editingObj, setEditingObj] = useState<PortfolioObjective | null>(null)

  if (isLoading) return <PageSpinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Objetivos (OKR)</h2>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          Novo objetivo
        </Button>
      </div>

      {!objectives || objectives.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
          <Target className="h-8 w-8" />
          <p className="text-sm">Nenhum objetivo cadastrado</p>
          <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" />
            Criar objetivo
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {objectives.map((obj) => (
            <ObjectiveCard
              key={obj.id}
              obj={obj}
              portfolioId={portfolioId}
              onEdit={setEditingObj}
            />
          ))}
        </div>
      )}

      {creating && (
        <ObjectiveModal open onClose={() => setCreating(false)} portfolioId={portfolioId} />
      )}
      {editingObj && (
        <ObjectiveModal
          open
          onClose={() => setEditingObj(null)}
          portfolioId={portfolioId}
          editing={editingObj}
        />
      )}
    </div>
  )
}
