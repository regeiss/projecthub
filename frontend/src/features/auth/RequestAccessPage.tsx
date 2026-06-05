import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { workspaceService } from '@/services/workspace.service'
import { useMyAccessRequest, useSubmitAccessRequest } from '@/hooks/useAccessRequest'
import { Button } from '@/components/ui/Button'
import type { AccessRequest } from '@/types/accessRequest'

function WorkspaceAutocomplete({
  value,
  onChange,
  suggestions,
  disabled,
}: {
  value: string
  onChange: (val: string, id?: string) => void
  suggestions: { id: string; name: string }[]
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const filtered = suggestions.filter((s) =>
    s.name.toLowerCase().includes(value.toLowerCase()),
  )

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
        placeholder="Nome do workspace ou secretaria"
        aria-autocomplete="list"
        aria-label="Workspace"
        className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
      />
      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg text-sm"
        >
          {filtered.map((s) => (
            <li
              key={s.id}
              role="option"
              aria-selected={value === s.name}
              onMouseDown={() => onChange(s.name, s.id)}
              className="cursor-pointer px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PendingScreen({ req }: { req: AccessRequest }) {
  const navigate = useNavigate()
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)
  const user = useAuthStore((s) => s.user)
  const polled = useRef(false)

  useEffect(() => {
    const id = setInterval(async () => {
      if (polled.current) return
      try {
        const { accessRequestService } = await import('@/services/accessRequest.service')
        const latest = await accessRequestService.getMyStatus()
        if (latest.status === 'approved') {
          polled.current = true
          clearInterval(id)
          const workspaces = await workspaceService.list()
          if (workspaces.length > 0) {
            setWorkspace(workspaces[0])
            navigate('/', { replace: true })
          }
        } else if (latest.status === 'denied') {
          polled.current = true
          clearInterval(id)
          navigate('/request-access', { replace: true, state: { denied: latest } })
        }
      } catch {}
    }, 30_000)
    return () => clearInterval(id)
  }, [navigate, setWorkspace])

  return (
    <div className="flex flex-col items-center gap-4 text-center" role="status" aria-live="polite">
      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-amber-600 dark:text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Solicitação enviada</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        Sua solicitação para <strong>{req.workspaceName}</strong> está aguardando aprovação.
        Enviaremos uma notificação para <strong>{user?.email}</strong>.
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Enviada em {new Date(req.requestedAt).toLocaleString('pt-BR')}
      </p>
    </div>
  )
}

function RequestForm({
  deniedReq,
  workspaceSuggestions,
}: {
  deniedReq?: AccessRequest | null
  workspaceSuggestions: { id: string; name: string }[]
}) {
  const user = useAuthStore((s) => s.user)
  const submit = useSubmitAccessRequest()
  const [workspaceName, setWorkspaceName] = useState(deniedReq?.workspaceName ?? '')
  const [workspaceId, setWorkspaceId] = useState<string | undefined>()
  const [secretaria, setSecretaria] = useState('')
  const [reason, setReason] = useState('')

  function handleWorkspaceChange(name: string, id?: string) {
    setWorkspaceName(name)
    setWorkspaceId(id)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit.mutate({ workspaceId, workspaceName, secretaria, reason })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {deniedReq && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400"
        >
          {deniedReq.denialReason
            ? `Solicitação anterior negada: ${deniedReq.denialReason}`
            : 'Sua solicitação anterior foi negada. Você pode tentar novamente.'}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
            htmlFor="req-name"
          >
            Nome
          </label>
          <input
            id="req-name"
            value={user?.name ?? ''}
            readOnly
            aria-readonly="true"
            className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
        </div>
        <div>
          <label
            className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
            htmlFor="req-email"
          >
            E-mail
          </label>
          <input
            id="req-email"
            value={user?.email ?? ''}
            readOnly
            aria-readonly="true"
            className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
        </div>
      </div>

      <div>
        <label
          className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
          htmlFor="req-workspace"
        >
          Workspace <span aria-hidden="true">*</span>
        </label>
        <WorkspaceAutocomplete
          value={workspaceName}
          onChange={handleWorkspaceChange}
          suggestions={workspaceSuggestions}
        />
      </div>

      <div>
        <label
          className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
          htmlFor="req-secretaria"
        >
          Secretaria / Área <span aria-hidden="true">*</span>
        </label>
        <input
          id="req-secretaria"
          value={secretaria}
          onChange={(e) => setSecretaria(e.target.value.slice(0, 120))}
          required
          maxLength={120}
          placeholder="ex: Secretaria de Tecnologia"
          className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label
          className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
          htmlFor="req-reason"
        >
          Motivo (opcional)
        </label>
        <textarea
          id="req-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Descreva brevemente por que precisa de acesso…"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={!workspaceName.trim() || !secretaria.trim() || submit.isPending}
        className="w-full"
      >
        {submit.isPending ? 'Enviando…' : 'Solicitar acesso'}
      </Button>
    </form>
  )
}

export function RequestAccessPage() {
  const { data: currentReq, isLoading } = useMyAccessRequest()
  const [workspaceSuggestions, setWorkspaceSuggestions] = useState<{ id: string; name: string }[]>([])

  const locationState = (window.history.state as { usr?: { denied?: AccessRequest } })?.usr
  const deniedFromNav = locationState?.denied ?? null

  useEffect(() => {
    workspaceService
      .list()
      .then((ws) => setWorkspaceSuggestions(ws.map((w) => ({ id: w.id, name: w.name }))))
      .catch(() => {})
  }, [])

  const isPending = currentReq?.status === 'pending'
  const isDenied = !isPending && (currentReq?.status === 'denied' || !!deniedFromNav)
  const deniedReq = isDenied ? (currentReq ?? deniedFromNav) : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {isPending ? 'Aguardando aprovação' : 'Solicitar acesso'}
          </h1>
          {!isPending && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Preencha o formulário e um administrador revisará sua solicitação.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-400">Carregando…</div>
          ) : isPending ? (
            <PendingScreen req={currentReq!} />
          ) : (
            <RequestForm deniedReq={deniedReq} workspaceSuggestions={workspaceSuggestions} />
          )}
        </div>
      </div>
    </div>
  )
}
