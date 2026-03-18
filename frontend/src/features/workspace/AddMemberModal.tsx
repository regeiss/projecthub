import { useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import { useKeycloakUsers, useAddWorkspaceMember } from '@/hooks/useWorkspace'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import type { KeycloakUser } from '@/types'
import { useDebounce } from '@/hooks/useDebounce'

interface Props {
  open: boolean
  onClose: () => void
  workspaceSlug: string
}

const ROLES = [
  { value: 'member', label: 'Membro' },
  { value: 'admin', label: 'Administrador' },
  { value: 'guest', label: 'Convidado' },
]

export function AddMemberModal({ open, onClose, workspaceSlug }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<KeycloakUser | null>(null)
  const [role, setRole] = useState('member')
  const debouncedSearch = useDebounce(search, 300)

  const { data: users = [], isLoading } = useKeycloakUsers(workspaceSlug, debouncedSearch)
  const addMember = useAddWorkspaceMember()

  const handleClose = useCallback(() => {
    setSearch('')
    setSelected(null)
    setRole('member')
    onClose()
  }, [onClose])

  function handleConfirm() {
    if (!selected) return
    addMember.mutate(
      { slug: workspaceSlug, keycloakSub: selected.sub, email: selected.email, name: selected.name, role },
      { onSuccess: handleClose },
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Adicionar membro" size="md">
      <div className="space-y-4">
        <Input
          type="search"
          aria-label="Buscar usuário"
          placeholder="Buscar por nome ou e-mail…"
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSelected(null) }}
        />

        {search.length >= 2 && (
          <ul
            role="list"
            className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
          >
            {isLoading && (
              <li className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">Buscando…</li>
            )}
            {!isLoading && users.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">Nenhum usuário encontrado</li>
            )}
            {users.map((u) => (
              <li
                key={u.sub}
                role="listitem"
                tabIndex={0}
                aria-selected={selected?.sub === u.sub}
                onClick={() => setSelected(u)}
                onKeyDown={(e) => e.key === 'Enter' && setSelected(u)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${
                  selected?.sub === u.sub
                    ? 'bg-indigo-50 dark:bg-indigo-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Avatar name={u.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-gray-100">{u.name}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {selected && (
          <div className="flex items-center gap-2">
            <label htmlFor="role-select" className="text-sm text-gray-700 dark:text-gray-300 shrink-0">
              Papel:
            </label>
            <select
              id="role-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        )}

        {addMember.error && (
          <p role="alert" className="text-sm text-red-500">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(addMember.error as any)?.response?.data?.detail === 'already_member'
              ? 'Este usuário já é membro do workspace.'
              : 'Ocorreu um erro. Tente novamente.'}
          </p>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={handleClose}>Cancelar</Button>
        <Button
          size="sm"
          disabled={!selected || addMember.isPending}
          onClick={handleConfirm}
          aria-label="Adicionar membro selecionado"
        >
          Adicionar
        </Button>
      </ModalFooter>
    </Modal>
  )
}
