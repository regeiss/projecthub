import { useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowLeft,
  X,
  Link2,
  Check,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { useKeycloakUsers, useAddWorkspaceMember } from '@/hooks/useWorkspace'
import { useCreateProject } from '@/hooks/useProjects'
import { useDebounce } from '@/hooks/useDebounce'
import { WorkspaceCreateForm } from './WorkspaceCreateForm'
import { cn } from '@/lib/utils'
import type { Workspace, KeycloakUser } from '@/types'

const STEPS = ['workspace', 'time', 'projeto'] as const

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((_, i) => (
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
          />
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                'w-10 h-px transition-all duration-300',
                i < current ? 'bg-indigo-600' : 'bg-gray-200',
              )}
            />
          )}
        </div>
      ))}
      <span className="ml-4 text-xs text-gray-400 font-mono tabular-nums">
        passo {current + 1} / {STEPS.length}
      </span>
    </div>
  )
}

interface InviteEntry {
  id: string
  user: KeycloakUser | null
  role: 'member' | 'admin'
}

function MemberRow({
  workspaceSlug,
  entry,
  canRemove,
  onChange,
  onRemove,
}: {
  workspaceSlug: string
  entry: InviteEntry
  canRemove: boolean
  onChange: (user: KeycloakUser | null, role: 'member' | 'admin') => void
  onRemove: () => void
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 300)
  const inputId = useId()

  const { data: users = [], isLoading } = useKeycloakUsers(workspaceSlug, debouncedSearch)

  function selectUser(u: KeycloakUser) {
    onChange(u, entry.role)
    setSearch('')
    setOpen(false)
  }

  function clearUser() {
    onChange(null, entry.role)
  }

  function handleRoleChange(r: 'member' | 'admin') {
    onChange(entry.user, r)
  }

  const showDropdown = open && debouncedSearch.length >= 2

  return (
    <div className="flex items-center gap-2">
      {entry.user ? (
        <div className="flex flex-1 items-center gap-2 h-8 rounded-md border border-gray-300 bg-gray-50 px-2.5">
          <Avatar name={entry.user.name} size="xs" />
          <span className="flex-1 truncate text-sm text-gray-800">{entry.user.name}</span>
          <button
            type="button"
            onClick={clearUser}
            aria-label="Remover usuário"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="relative flex-1">
          <input
            id={inputId}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
            onFocus={() => search.length >= 2 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Buscar por nome ou e-mail…"
            className={cn(
              'w-full h-8 rounded-md border border-gray-300 px-3 text-sm text-gray-900',
              'placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
            )}
          />
          {showDropdown && (
            <ul
              role="listbox"
              aria-label="Usuários encontrados"
              className="absolute z-50 top-full left-0 right-0 mt-1 max-h-44 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
            >
              {isLoading && (
                <li className="px-3 py-2 text-sm text-gray-400">Buscando…</li>
              )}
              {!isLoading && users.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-400">Nenhum resultado</li>
              )}
              {users.map((u) => (
                <li key={u.sub} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={() => selectUser(u)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                  >
                    <Avatar name={u.name} size="xs" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="truncate text-xs text-gray-500">{u.email}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <select
        value={entry.role}
        onChange={(e) => handleRoleChange(e.target.value as 'member' | 'admin')}
        aria-label="Função do membro"
        className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="member">membro</option>
        <option value="admin">admin</option>
      </select>

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover linha"
          className="text-gray-300 hover:text-gray-500 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function InviteStep({
  workspace,
  onBack,
  onNext,
}: {
  workspace: Workspace
  onBack: () => void
  onNext: () => void
}) {
  const [entries, setEntries] = useState<InviteEntry[]>([
    { id: crypto.randomUUID(), user: null, role: 'member' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const addMember = useAddWorkspaceMember()

  const settingsUrl = `${window.location.origin}/workspace/settings`

  function handleCopy() {
    navigator.clipboard.writeText(settingsUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function addRow() {
    setEntries((prev) => [...prev, { id: crypto.randomUUID(), user: null, role: 'member' }])
  }

  function updateEntry(id: string, user: KeycloakUser | null, role: 'member' | 'admin') {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, user, role } : e)))
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const toAdd = entries.filter((en) => en.user !== null)
    if (!toAdd.length) { onNext(); return }
    setSubmitting(true)
    await Promise.allSettled(
      toAdd.map((en) =>
        addMember.mutateAsync({
          slug: workspace.slug,
          keycloakSub: en.user!.sub,
          email: en.user!.email,
          name: en.user!.name,
          role: en.role,
        }),
      ),
    )
    setSubmitting(false)
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Convide o time</h2>
        <p className="mt-1.5 text-sm text-gray-500">
          Busque colegas pelo nome ou e-mail e defina a função de cada um.
        </p>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => (
          <MemberRow
            key={entry.id}
            workspaceSlug={workspace.slug}
            entry={entry}
            canRemove={entries.length > 1}
            onChange={(user, role) => updateEntry(entry.id, user, role)}
            onRemove={() => removeEntry(entry.id)}
          />
        ))}

        <button
          type="button"
          onClick={addRow}
          className={cn(
            'w-full flex items-center gap-2 h-8 rounded-md border-2 border-dashed px-3',
            'text-sm text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          adicionar outro
        </button>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5" />
          ou compartilhe um link de convite
        </p>
        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <code className="flex-1 truncate font-mono text-xs text-gray-500">{settingsUrl}</code>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copiar link de convite"
            className={cn(
              'shrink-0 flex items-center gap-1 text-xs font-medium transition-colors',
              copied ? 'text-green-600' : 'text-indigo-600 hover:text-indigo-700',
            )}
          >
            {copied ? <><Check className="h-3 w-3" /> copiado</> : 'copiar'}
          </button>
        </div>
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
          <Button type="submit" loading={submitting} size="lg">
            Próximo
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}

const TEMPLATES = [
  { id: 'software', label: 'Software' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'design', label: 'Design' },
  { id: 'blank', label: 'Em branco' },
] as const

function TemplateDiamond({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        'w-3 h-3 rotate-45 rounded-sm transition-colors',
        active ? 'bg-indigo-600' : 'bg-gray-400',
      )}
    />
  )
}

function FirstProjectStep({
  workspace,
  onBack,
  onSkip,
}: {
  workspace: Workspace
  onBack: () => void
  onSkip?: () => void
}) {
  const [template, setTemplate] = useState<string>('software')
  const [projectName, setProjectName] = useState('')
  const [error, setError] = useState('')
  const create = useCreateProject()
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!projectName.trim()) { setError('Informe o nome do projeto.'); return }
    setError('')
    create.mutate(
      { workspaceId: workspace.id, data: { name: projectName.trim() } },
      {
        onSuccess: (project) => navigate(`/projects/${project.id}/board`),
        onError: () => setError('Erro ao criar projeto. Tente novamente.'),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Crie seu primeiro projeto
        </h2>
        <p className="mt-1.5 text-sm text-gray-500">
          Comece de um modelo ou em branco — mais projetos podem ser criados depois.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Comece de um modelo
        </label>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => {
            const active = template === t.id
            const isBlank = t.id === 'blank'

            if (isBlank) {
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className={cn(
                    'flex items-center justify-center h-16 rounded-md border-2 border-dashed transition-colors',
                    active
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                      : 'border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-500',
                  )}
                >
                  <span className="text-sm font-medium">
                    {active ? 'em branco ✓' : '+ em branco'}
                  </span>
                </button>
              )
            }

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                className={cn(
                  'flex flex-col gap-2 p-3 rounded-md border-2 text-left transition-colors',
                  active ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <TemplateDiamond active={active} />
                <span className={cn('text-xs font-medium transition-colors', active ? 'text-indigo-600' : 'text-gray-600')}>
                  {t.label}{active ? ' ✓' : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <Input
        label="Nome do projeto"
        value={projectName}
        onChange={(e) => { setProjectName(e.target.value); setError('') }}
        placeholder="Ex: Plataforma Cidadão"
        autoFocus
        error={error}
      />

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="ghost" onClick={onBack} size="lg">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex gap-2">
          {onSkip && (
            <Button type="button" variant="outline" onClick={onSkip} size="lg">
              Pular
            </Button>
          )}
          <Button type="submit" loading={create.isPending} size="lg">
            Criar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}

export function WorkspaceWizard({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)

  return (
    <div className="space-y-6">
      <StepDots current={step} />

      {step === 0 && (
        <WorkspaceCreateForm
          onSuccess={(ws) => { setWorkspace(ws); setStep(1) }}
        />
      )}

      {step === 1 && workspace && (
        <InviteStep
          workspace={workspace}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && workspace && (
        <FirstProjectStep
          workspace={workspace}
          onBack={() => setStep(1)}
          onSkip={onDone}
        />
      )}
    </div>
  )
}
