import { useState } from 'react'
import { UserPlus, Pencil, Trash2 } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useWorkspaceMembers, useUpdateMemberRole, useUpdateWorkspace, useMe, useRemoveMember } from '@/hooks/useWorkspace'
import type { WorkspaceMember } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { AddMemberModal } from './AddMemberModal'
import { cn } from '@/lib/utils'

const ROLES: { value: WorkspaceMember['role']; label: string; description: string }[] = [
  { value: 'admin',  label: 'Admin',      description: 'Acesso total — pode gerenciar membros e configurações.' },
  { value: 'member', label: 'Membro',     description: 'Pode criar e editar projetos e issues.' },
  { value: 'guest',  label: 'Convidado',  description: 'Acesso somente-leitura ao workspace.' },
]

function EditMemberModal({
  member,
  workspaceSlug,
  onClose,
}: {
  member: WorkspaceMember
  workspaceSlug: string
  onClose: () => void
}) {
  const [role, setRole] = useState<WorkspaceMember['role']>(member.role)
  const [confirming, setConfirming] = useState(false)
  const update = useUpdateMemberRole()
  const remove = useRemoveMember()
  const { data: me } = useMe()

  const isSelf = me?.id === member.id
  const unchanged = role === member.role

  function handleSave() {
    update.mutate(
      { slug: workspaceSlug, memberId: member.id, role },
      { onSuccess: onClose },
    )
  }

  function handleRemove() {
    remove.mutate(
      { slug: workspaceSlug, memberId: member.id },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal open onClose={onClose} title="Editar membro" size="sm">
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
        <Avatar src={member.avatarUrl} name={member.name} size="md" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{member.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
        </div>
      </div>

      {confirming ? (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
            Remover {member.name}?
          </p>
          <p className="text-xs text-red-600 dark:text-red-500">
            Esta ação removerá o acesso deste membro ao workspace permanentemente.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={remove.isPending}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={remove.isPending}
              onClick={handleRemove}
            >
              Confirmar remoção
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Função
          </p>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                disabled={isSelf && r.value !== 'admin'}
                onClick={() => setRole(r.value)}
                className={cn(
                  'w-full text-left rounded-lg border px-3 py-2.5 transition-colors',
                  role === r.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.label}</span>
                  {role === r.value && (
                    <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.description}</p>
              </button>
            ))}
          </div>

          {isSelf && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              Não é possível rebaixar sua própria conta.
            </p>
          )}

          <ModalFooter>
            {!isSelf && (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="mr-auto flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover do workspace
              </button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={unchanged || update.isPending}
              loading={update.isPending}
              onClick={handleSave}
            >
              Salvar
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  )
}

export function WorkspaceSettings() {
  const { workspace, setWorkspace } = useWorkspaceStore()
  const { data: members = [] } = useWorkspaceMembers(workspace?.slug ?? '')
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<WorkspaceMember | null>(null)
  const [editingInfo, setEditingInfo] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const updateWorkspace = useUpdateWorkspace()

  if (!workspace) return null

  function startEditInfo() {
    setNameValue(workspace!.name)
    setEditingInfo(true)
  }

  function cancelEditInfo() {
    setEditingInfo(false)
  }

  function saveInfo() {
    if (!nameValue.trim() || nameValue === workspace!.name) {
      setEditingInfo(false)
      return
    }
    updateWorkspace.mutate(
      { slug: workspace!.slug, data: { name: nameValue.trim() } },
      {
        onSuccess: (updated) => {
          setWorkspace(updated)
          setEditingInfo(false)
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Configurações do Workspace
      </h1>

      <section className="mb-8">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Informações</h2>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {editingInfo ? (
            <div className="p-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Nome
                </label>
                <input
                  autoFocus
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveInfo(); if (e.key === 'Escape') cancelEditInfo() }}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Slug
                </label>
                <p className="text-sm text-gray-400 dark:text-gray-500">{workspace.slug}</p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={cancelEditInfo}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!nameValue.trim() || updateWorkspace.isPending}
                  loading={updateWorkspace.isPending}
                  onClick={saveInfo}
                >
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEditInfo}
              className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{workspace.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{workspace.slug}</p>
                </div>
                <Pencil className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Membros ({members.length})
          </h2>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setAddOpen(true)}
            aria-label="Adicionar membro ao workspace"
          >
            <UserPlus className="h-4 w-4" />
            Adicionar membro
          </Button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setEditing(m)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <Avatar src={m.avatarUrl} name={m.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
              </div>
              <Badge variant={m.role === 'admin' ? 'info' : 'default'}>
                {m.role}
              </Badge>
            </button>
          ))}
        </div>
      </section>

      <AddMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        workspaceSlug={workspace.slug}
      />

      {editing && (
        <EditMemberModal
          member={editing}
          workspaceSlug={workspace.slug}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
