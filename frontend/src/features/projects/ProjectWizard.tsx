import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Plus, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import {
  useCreateProject,
  useUpdateProject,
  useAddProjectMember,
  useProjectStates,
  useCreateProjectState,
  useUpdateProjectState,
  useDeleteProjectState,
} from '@/hooks/useProjects'
import { useWorkspaceMembers, useMe } from '@/hooks/useWorkspace'
import { cn } from '@/lib/utils'
import type { Project, WorkspaceMember, IssueState } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ['detalhes', 'time', 'estados', 'datas'] as const

const COLOR_PALETTE = [
  '#6366f1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#06B6D4', '#3B82F6',
  '#84CC16', '#6B7280',
]

const STATE_COLORS = [
  '#6B7280', '#3B82F6', '#F59E0B', '#8B5CF6',
  '#10B981', '#EF4444', '#EC4899', '#06B6D4',
]

// ─── StepDots ─────────────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0" role="progressbar" aria-valuenow={current + 1} aria-valuemax={STEPS.length} aria-label={`Passo ${current + 1} de ${STEPS.length}`}>
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              i < current
                ? 'bg-indigo-600'
                : i === current
                  ? 'bg-indigo-600 ring-[3px] ring-indigo-100'
                  : 'bg-gray-200',
            )}
            aria-label={label}
          />
          {i < STEPS.length - 1 && (
            <div className={cn('w-10 h-px transition-all duration-300', i < current ? 'bg-indigo-600' : 'bg-gray-200')} />
          )}
        </div>
      ))}
      <span className="ml-4 text-xs text-gray-400 font-mono tabular-nums">
        passo {current + 1} / {STEPS.length}
      </span>
    </div>
  )
}

// ─── Step 1: Detalhes ─────────────────────────────────────────────────────────

function deriveIdentifier(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length > 1) return words.map((w) => w[0]).join('').toUpperCase().slice(0, 6)
  return name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)
}

function ProjectDetailsStep({ onSuccess }: { onSuccess: (p: Project) => void }) {
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [identifierTouched, setIdentifierTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLOR_PALETTE[0])
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState('')
  const { workspace } = useWorkspaceStore()
  const create = useCreateProject()

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setName(v)
    if (!identifierTouched) setIdentifier(deriveIdentifier(v))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Informe o nome do projeto.'); return }
    if (!workspace) return
    setError('')
    create.mutate(
      {
        workspaceId: workspace.id,
        data: {
          name: name.trim(),
          identifier: identifier || undefined,
          description: description.trim() || undefined,
          color,
          isPrivate,
        } as Partial<Project>,
      },
      {
        onSuccess,
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error
            ?? 'Erro ao criar projeto. Tente novamente.'
          setError(msg)
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-label="Detalhes do projeto">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Detalhes do projeto</h2>
        <p className="mt-1.5 text-sm text-gray-500">Configure as informações básicas do novo projeto.</p>
      </div>

      <Input
        label="Nome do projeto"
        value={name}
        onChange={handleNameChange}
        placeholder="Ex: Sistema de Contratos"
        autoFocus
        required
        error={error}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="project-identifier" className="text-sm font-medium text-gray-700">Identificador</label>
        <input
          id="project-identifier"
          value={identifier}
          onChange={(e) => {
            setIdentifierTouched(true)
            setIdentifier(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10))
          }}
          placeholder="EX"
          maxLength={10}
          aria-describedby="identifier-hint"
          className="h-8 w-32 rounded-md border border-gray-300 px-3 text-sm font-mono text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p id="identifier-hint" className="text-xs text-gray-400">Prefixo único para as issues (ex: CONT-1)</p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="project-description" className="text-sm font-medium text-gray-700">
          Descrição{' '}
          <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva o objetivo do projeto…"
          rows={3}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-gray-700">Cor</legend>
        <div className="flex items-center gap-2 flex-wrap">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Cor ${c}`}
              aria-pressed={color === c}
              className={cn(
                'w-6 h-6 rounded-full transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gray-400',
                color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <button
          type="button"
          role="switch"
          aria-checked={isPrivate}
          onClick={() => setIsPrivate((v) => !v)}
          className={cn(
            'relative w-10 h-5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
            isPrivate ? 'bg-indigo-600' : 'bg-gray-200',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
              isPrivate ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
          <span className="sr-only">{isPrivate ? 'Projeto privado' : 'Projeto público'}</span>
        </button>
        <span className="text-sm text-gray-700">Projeto privado</span>
      </label>

      <div className="flex justify-end pt-1">
        <Button type="submit" loading={create.isPending} size="lg">
          Próximo
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}

// ─── Step 2: Time ─────────────────────────────────────────────────────────────

interface MemberSelection {
  uid: string
  member: WorkspaceMember
  role: 'admin' | 'member' | 'viewer'
}

function ProjectMembersStep({
  project,
  onBack,
  onNext,
}: {
  project: Project
  onBack: () => void
  onNext: () => void
}) {
  const { workspace } = useWorkspaceStore()
  const { data: wsMembers = [] } = useWorkspaceMembers(workspace?.slug ?? '')
  const { data: me } = useMe()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<MemberSelection[]>([])
  const [submitting, setSubmitting] = useState(false)
  const addMember = useAddProjectMember(project.id)

  const selectable = wsMembers.filter(
    (m) =>
      m.id !== me?.id &&
      !selected.find((s) => s.member.id === m.id) &&
      (m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())),
  )

  function selectMember(m: WorkspaceMember) {
    setSelected((prev) => [...prev, { uid: crypto.randomUUID(), member: m, role: 'member' }])
    setSearch('')
  }

  function updateRole(uid: string, role: 'admin' | 'member' | 'viewer') {
    setSelected((prev) => prev.map((s) => (s.uid === uid ? { ...s, role } : s)))
  }

  function remove(uid: string) {
    setSelected((prev) => prev.filter((s) => s.uid !== uid))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected.length) { onNext(); return }
    setSubmitting(true)
    await Promise.allSettled(
      selected.map((s) => addMember.mutateAsync({ memberId: s.member.id, role: s.role })),
    )
    setSubmitting(false)
    onNext()
  }

  const showDropdown = search.length > 0 && selectable.length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-label="Convite de membros">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Convide o time</h2>
        <p className="mt-1.5 text-sm text-gray-500">Adicione membros do workspace a este projeto.</p>
      </div>

      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => setTimeout(() => setSearch(''), 150)}
          placeholder="Buscar por nome ou e-mail…"
          aria-label="Buscar membros do workspace"
          aria-autocomplete="list"
          aria-controls={showDropdown ? 'member-listbox' : undefined}
          className={cn(
            'w-full h-8 rounded-md border border-gray-300 px-3 text-sm text-gray-900',
            'placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
          )}
        />
        {showDropdown && (
          <ul
            id="member-listbox"
            role="listbox"
            aria-label="Membros encontrados"
            className="absolute z-50 top-full left-0 right-0 mt-1 max-h-44 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
          >
            {selectable.map((m) => (
              <li key={m.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={() => selectMember(m)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <Avatar name={m.name} size="xs" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="truncate text-xs text-gray-500">{m.email}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected.length > 0 && (
        <ul className="space-y-2" aria-label="Membros selecionados">
          {selected.map((s) => (
            <li key={s.uid} className="flex items-center gap-2 h-8 rounded-md border border-gray-200 bg-gray-50 px-2.5">
              <Avatar name={s.member.name} size="xs" />
              <span className="flex-1 truncate text-sm text-gray-800">{s.member.name}</span>
              <select
                value={s.role}
                onChange={(e) => updateRole(s.uid, e.target.value as 'admin' | 'member' | 'viewer')}
                aria-label={`Função de ${s.member.name}`}
                className="h-6 rounded border-0 bg-transparent text-xs text-gray-600 focus:outline-none cursor-pointer"
              >
                <option value="admin">admin</option>
                <option value="member">membro</option>
                <option value="viewer">visualizador</option>
              </select>
              <button
                type="button"
                onClick={() => remove(s.uid)}
                aria-label={`Remover ${s.member.name}`}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="ghost" onClick={onBack} size="lg">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onNext} size="lg">
            Pular
          </Button>
          <Button type="submit" loading={submitting} size="lg">
            Próximo
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}

// ─── Step 3: Estados ──────────────────────────────────────────────────────────

interface DraftState {
  id: string | null
  name: string
  color: string
  category: IssueState['category']
  sequence: number
  deleted?: boolean
}

function ProjectStatesStep({
  project,
  onBack,
  onNext,
}: {
  project: Project
  onBack: () => void
  onNext: () => void
}) {
  const { data: states = [], isLoading } = useProjectStates(project.id)
  const [drafts, setDrafts] = useState<DraftState[]>([])
  const [initialized, setInitialized] = useState(false)
  const [openColorIdx, setOpenColorIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const createState = useCreateProjectState(project.id)
  const updateState = useUpdateProjectState(project.id)
  const deleteState = useDeleteProjectState(project.id)

  useEffect(() => {
    if (!initialized && states.length > 0) {
      setDrafts(
        states.map((s, i) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          category: s.category,
          sequence: s.sequence ?? i,
        })),
      )
      setInitialized(true)
    }
  }, [states, initialized])

  const visible = drafts.filter((d) => !d.deleted)

  function updateDraft(idx: number, patch: Partial<DraftState>) {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)))
  }

  function markDeleted(idx: number) {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, deleted: true } : d)))
    setOpenColorIdx(null)
  }

  function addDraft() {
    setDrafts((prev) => [
      ...prev,
      { id: null, name: '', color: STATE_COLORS[0], category: 'unstarted', sequence: prev.length },
    ])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const ops: Promise<unknown>[] = []

    drafts.forEach((d) => {
      const orig = states.find((s) => s.id === d.id)
      if (d.deleted && d.id) {
        ops.push(deleteState.mutateAsync(d.id))
      } else if (!d.deleted && d.id && orig) {
        if (orig.name !== d.name || orig.color !== d.color || orig.category !== d.category) {
          ops.push(updateState.mutateAsync({ stateId: d.id, data: { name: d.name, color: d.color, category: d.category } }))
        }
      } else if (!d.deleted && !d.id && d.name.trim()) {
        ops.push(createState.mutateAsync({ name: d.name.trim(), color: d.color, category: d.category, sequence: d.sequence } as Partial<IssueState>))
      }
    })

    await Promise.allSettled(ops)
    setSaving(false)
    onNext()
  }

  if (isLoading && !initialized) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Estados do fluxo</h2>
          <p className="mt-1.5 text-sm text-gray-500">Personalize os estados das issues deste projeto.</p>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 rounded-md bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-label="Estados do fluxo">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Estados do fluxo</h2>
        <p className="mt-1.5 text-sm text-gray-500">Personalize os estados das issues deste projeto.</p>
      </div>

      <div className="space-y-2" role="list" aria-label="Lista de estados">
        {visible.map((d) => {
          const realIdx = drafts.indexOf(d)
          const visIdx = visible.indexOf(d)
          return (
            <div key={d.id ?? `new-${visIdx}`} className="flex items-center gap-2" role="listitem">
              <div className="relative shrink-0">
                <button
                  type="button"
                  aria-label={`Selecionar cor do estado${d.name ? ` "${d.name}"` : ''}`}
                  aria-expanded={openColorIdx === realIdx}
                  aria-haspopup="listbox"
                  className="w-5 h-5 rounded-full hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition"
                  style={{ backgroundColor: d.color }}
                  onClick={() => setOpenColorIdx(openColorIdx === realIdx ? null : realIdx)}
                />
                {openColorIdx === realIdx && (
                  <div
                    role="listbox"
                    aria-label="Paleta de cores"
                    className="absolute z-50 top-7 left-0 flex flex-wrap gap-1 p-2 rounded-md border border-gray-200 bg-white shadow-md w-28"
                  >
                    {STATE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="option"
                        aria-selected={d.color === c}
                        aria-label={`Cor ${c}`}
                        onClick={() => { updateDraft(realIdx, { color: c }); setOpenColorIdx(null) }}
                        className={cn(
                          'w-5 h-5 rounded-full hover:scale-110 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gray-400',
                          d.color === c ? 'ring-2 ring-offset-1 ring-gray-400' : '',
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <input
                value={d.name}
                onChange={(e) => updateDraft(realIdx, { name: e.target.value })}
                placeholder="Nome do estado"
                aria-label={`Nome do estado ${visIdx + 1}`}
                className="flex-1 h-8 rounded-md border border-gray-200 px-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              <select
                value={d.category}
                onChange={(e) => updateDraft(realIdx, { category: e.target.value as IssueState['category'] })}
                aria-label={`Categoria do estado${d.name ? ` "${d.name}"` : ''}`}
                className="h-8 rounded-md border border-gray-200 px-2 text-xs text-gray-600 focus:border-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="backlog">backlog</option>
                <option value="unstarted">a fazer</option>
                <option value="started">em andamento</option>
                <option value="completed">concluído</option>
                <option value="cancelled">cancelado</option>
              </select>

              {visible.length > 1 && (
                <button
                  type="button"
                  onClick={() => markDeleted(realIdx)}
                  aria-label={`Remover estado${d.name ? ` "${d.name}"` : ''}`}
                  className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )
        })}

        <button
          type="button"
          onClick={addDraft}
          className={cn(
            'w-full flex items-center gap-2 h-8 rounded-md border-2 border-dashed px-3',
            'text-sm text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          adicionar estado
        </button>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="ghost" onClick={onBack} size="lg">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onNext} size="lg">
            Pular
          </Button>
          <Button type="submit" loading={saving} size="lg">
            Próximo
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}

// ─── Step 4: Datas ────────────────────────────────────────────────────────────

function ProjectDatesStep({
  project,
  onBack,
}: {
  project: Project
  onBack: () => void
}) {
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const update = useUpdateProject()
  const navigate = useNavigate()

  function goToBoard() {
    navigate(`/projects/${project.id}/board`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!startDate && !targetDate) { goToBoard(); return }
    update.mutate(
      {
        id: project.id,
        data: {
          ...(startDate ? { start_date: startDate } : {}),
          ...(targetDate ? { target_date: targetDate } : {}),
        } as Partial<Project>,
      },
      { onSuccess: goToBoard, onError: goToBoard },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-label="Datas do projeto">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Datas do projeto</h2>
        <p className="mt-1.5 text-sm text-gray-500">Defina o período planejado para o projeto.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="proj-start-date" className="text-sm font-medium text-gray-700">
            Data de início{' '}
            <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            id="proj-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 rounded-md border border-gray-300 px-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="proj-target-date" className="text-sm font-medium text-gray-700">
            Data alvo{' '}
            <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            id="proj-target-date"
            type="date"
            value={targetDate}
            min={startDate || undefined}
            onChange={(e) => setTargetDate(e.target.value)}
            className="h-8 rounded-md border border-gray-300 px-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="ghost" onClick={onBack} size="lg">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={goToBoard} size="lg">
            Pular
          </Button>
          <Button type="submit" loading={update.isPending} size="lg">
            Concluído
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}

// ─── Wizard root ──────────────────────────────────────────────────────────────

export function ProjectWizard({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
  const [project, setProject] = useState<Project | null>(null)

  return (
    <div className="space-y-6">
      <StepDots current={step} />

      {step === 0 && (
        <ProjectDetailsStep
          onSuccess={(p) => { setProject(p); setStep(1) }}
        />
      )}

      {step === 1 && project && (
        <ProjectMembersStep
          project={project}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && project && (
        <ProjectStatesStep
          project={project}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && project && (
        <ProjectDatesStep
          project={project}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  )
}
