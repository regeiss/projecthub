import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderKanban, Search } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useProjects, useCreateProject } from '@/hooks/useProjects'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

function CreateProjectModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')
  const { workspace } = useWorkspaceStore()
  const create = useCreateProject()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!workspace) {
      setError('Workspace não encontrado. Verifique a conexão com o servidor.')
      return
    }
    create.mutate(
      { workspaceId: workspace.id, data: { name, identifier } },
      {
        onSuccess: onClose,
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
    <Modal open={open} onClose={onClose} title="Novo projeto" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (!identifier) {
              setIdentifier(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 6),
              )
            }
          }}
          placeholder="Ex: Sistema de Contratos"
          required
        />
        <Input
          label="Identificador"
          value={identifier}
          onChange={(e) =>
            setIdentifier(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
          }
          placeholder="Ex: CONT"
          required
        />
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={create.isPending}>
            Criar projeto
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

export function ProjectsPage() {
  const { workspace } = useWorkspaceStore()
  const navigate = useNavigate()
  const { data: projects = [], isLoading } = useProjects(workspace?.id ?? '')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Projetos</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          Novo projeto
        </Button>
      </div>

      <div className="mb-4">
        <Input
          leftIcon={<Search className="h-3.5 w-3.5" />}
          placeholder="Buscar projetos…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <FolderKanban className="mx-auto mb-2 h-8 w-8 text-gray-400 dark:text-gray-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum projeto encontrado</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}/board`)}
              className="flex w-full items-center text-left hover:bg-gray-50 dark:hover:bg-gray-800 divide-x divide-gray-300 dark:divide-gray-600"
            >
              <div className="flex items-center justify-center px-4 py-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-bold text-white"
                  style={{ backgroundColor: p.color ?? '#6366f1' }}
                >
                  {p.identifier}
                </div>
              </div>
              <div className="min-w-0 flex-1 px-4 py-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Atualizado {formatDate(p.updatedAt)}
                </p>
              </div>
              <div className="px-4 py-3">
                <Badge variant={p.isPrivate ? 'outline' : 'default'}>
                  {p.isPrivate ? 'Privado' : 'Público'}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateProjectModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
