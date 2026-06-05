import { useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useWorkspaceAccessRequests, useResolveAccessRequest } from '@/hooks/useAccessRequest'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { AccessRequestDetail } from '@/types/accessRequest'

function useWorkspaceList() {
  const { workspace } = useWorkspaceStore()
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([])
  const [loaded, setLoaded] = useState(false)

  if (!loaded && workspace) {
    setLoaded(true)
    import('@/services/workspace.service').then(({ workspaceService }) => {
      workspaceService.list().then((ws) => setWorkspaces(ws.map((w) => ({ id: w.id, name: w.name }))))
    })
  }

  return workspaces
}

function RequestRow({
  req,
  workspaceSlug,
}: {
  req: AccessRequestDetail
  workspaceSlug: string
}) {
  const resolve = useResolveAccessRequest(workspaceSlug)
  const allWorkspaces = useWorkspaceList()
  const [denying, setDenying] = useState(false)
  const [denialReason, setDenialReason] = useState('')
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>(
    req.workspace ? [req.workspace] : [],
  )
  const [role, setRole] = useState<'admin' | 'member' | 'guest'>('member')

  function toggleWorkspace(id: string) {
    setSelectedWorkspaceIds((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id],
    )
  }

  function handleApprove() {
    const [primary, ...extras] = selectedWorkspaceIds
    if (!primary) return
    resolve.mutate({
      requestId: req.id,
      payload: { action: 'approve', extraWorkspaceIds: extras, role },
    })
  }

  function handleDenyConfirm() {
    if (!denialReason.trim()) return
    resolve.mutate({
      requestId: req.id,
      payload: { action: 'deny', denialReason },
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {req.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{req.email}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {req.secretaria}
            {req.previousDenialCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                {req.previousDenialCount}× negado antes
              </span>
            )}
          </p>
          {req.reason && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic">
              &ldquo;{req.reason}&rdquo;
            </p>
          )}
          <p className="mt-1 text-[11px] text-gray-400">
            {new Date(req.requestedAt).toLocaleString('pt-BR')}
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-indigo-600 dark:text-indigo-400">
          → {req.workspaceName}
        </span>
      </div>

      {!denying ? (
        <div className="flex flex-col gap-2">
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              Conceder acesso a:
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Workspaces disponíveis">
              {allWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => toggleWorkspace(ws.id)}
                  aria-pressed={selectedWorkspaceIds.includes(ws.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                    selectedWorkspaceIds.includes(ws.id)
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400',
                  )}
                >
                  {ws.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor={`role-${req.id}`}
              className="text-xs font-medium text-gray-500 dark:text-gray-400"
            >
              Função:
            </label>
            <select
              id={`role-${req.id}`}
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="member">Membro</option>
              <option value="admin">Admin</option>
              <option value="guest">Convidado</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={selectedWorkspaceIds.length === 0 || resolve.isPending}
              aria-label={`Aprovar solicitação de ${req.name}`}
              className="flex-1"
            >
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDenying(true)}
              disabled={resolve.isPending}
              aria-label={`Negar solicitação de ${req.name}`}
              className="flex-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Negar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label
            htmlFor={`denial-${req.id}`}
            className="text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Motivo da negação <span aria-hidden="true">*</span>
          </label>
          <textarea
            id={`denial-${req.id}`}
            value={denialReason}
            onChange={(e) => setDenialReason(e.target.value)}
            rows={2}
            placeholder="Explique o motivo…"
            aria-required="true"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="danger"
              onClick={handleDenyConfirm}
              disabled={!denialReason.trim() || resolve.isPending}
              aria-label={`Confirmar negação para ${req.name}`}
              className="flex-1"
            >
              Confirmar negação
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDenying(false)}
              aria-label="Cancelar negação"
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function AccessRequestsTab() {
  const { workspace } = useWorkspaceStore()
  const slug = workspace?.slug ?? ''
  const { data, isLoading } = useWorkspaceAccessRequests(slug, 'pending')
  const requests = data?.results ?? []

  if (isLoading) {
    return (
      <div
        className="py-12 text-center text-sm text-gray-400"
        aria-live="polite"
        aria-busy="true"
      >
        Carregando solicitações…
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
        Nenhuma solicitação pendente.
      </div>
    )
  }

  return (
    <div
      className="flex flex-col gap-3"
      role="list"
      aria-label="Solicitações de acesso pendentes"
    >
      {requests.map((req) => (
        <div key={req.id} role="listitem">
          <RequestRow req={req} workspaceSlug={slug} />
        </div>
      ))}
    </div>
  )
}
