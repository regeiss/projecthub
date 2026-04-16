import { useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  Settings,
  Plus,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useWorkspaces, useCreateWorkspace } from '@/hooks/useWorkspace'
import { useProjects } from '@/hooks/useProjects'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/Dropdown'

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: React.ElementType
  label: string
}) {
  return (
    <div className="group/nav relative">
      <NavLink
        to={to}
        className={({ isActive }) =>
          cn(
            'flex h-8 w-8 items-center justify-center rounded-md text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100',
            isActive && 'bg-primary-light dark:bg-primary/20 text-primary-text dark:text-primary',
          )
        }
        aria-label={label}
      >
        <Icon className="h-4 w-4" />
      </NavLink>
      <div className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 hidden group-hover/nav:block z-50">
        <div className="rounded bg-primary px-2 py-1 text-xs text-white whitespace-nowrap shadow-md">
          {label}
        </div>
      </div>
    </div>
  )
}

function CreateWorkspaceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const create = useCreateWorkspace()
  const { setWorkspace } = useWorkspaceStore()
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    create.mutate(
      { name },
      {
        onSuccess: (ws) => {
          setWorkspace(ws)
          navigate('/')
          onClose()
          setName('')
        },
        onError: () => setError('Erro ao criar workspace. Tente novamente.'),
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo workspace" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Minha Empresa"
          required
          autoFocus
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={create.isPending}>Criar</Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

export function Sidebar() {
  const { workspace, setWorkspace } = useWorkspaceStore()
  const navigate = useNavigate()
  const { projectId } = useParams()
  const { data: workspaces = [] } = useWorkspaces()
  const { data: projects = [] } = useProjects(workspace?.id ?? '')
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false)

  function selectWorkspace(ws: (typeof workspaces)[0]) {
    setWsDropdownOpen(false)
    setWorkspace(ws)
    navigate('/')
  }

  return (
    <aside className="sidebar-bg flex h-full w-14 flex-col border-r border-gray-200 dark:border-gray-700 dark:bg-gray-900 py-3">
      {/* Workspace selector */}
      <div className="flex justify-center px-2 pb-3">
        <Dropdown open={wsDropdownOpen} onOpenChange={setWsDropdownOpen}>
          <DropdownTrigger asChild>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white text-xs font-bold hover:bg-primary-hover"
              aria-label="Selecionar workspace"
            >
              {workspace?.name?.[0]?.toUpperCase() ?? 'W'}
            </button>
          </DropdownTrigger>
          <DropdownContent align="start" className="ml-2">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                type="button"
                className="flex w-full cursor-pointer select-none items-center px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 outline-none"
                onClick={() => selectWorkspace(ws)}
              >
                {ws.name}
              </button>
            ))}
            <DropdownSeparator />
            <DropdownItem onSelect={() => { setWsDropdownOpen(false); setCreatingWorkspace(true) }}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              Novo workspace
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>

      <div className="mx-2 mb-3 h-px bg-gray-200 dark:bg-gray-700" />

      {/* Main navigation */}
      <nav className="flex flex-1 flex-col items-center gap-1 px-2">
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/projects" icon={FolderKanban} label="Projetos" />
        <NavItem to="/portfolio" icon={BarChart3} label="Portfolio" />
        <NavItem to="/workspace/resources" icon={Users} label="Recursos" />
      </nav>

      {/* Projects quick list */}
      {projects.length > 0 && (
        <>
          <div className="mx-2 my-2 h-px bg-gray-200 dark:bg-gray-700" />
          <div className="flex flex-col items-center gap-1 px-2">
            {projects.slice(0, 6).map((p) => (
              <div key={p.id} className="group/proj relative">
                <NavLink
                  to={`/projects/${p.id}/board`}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded text-xs font-semibold transition-colors',
                    projectId === p.id
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
                  )}
                >
                  {p.identifier}
                </NavLink>
                <div className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 hidden group-hover/proj:block z-50">
                  <div className="rounded bg-primary px-2 py-1 text-xs text-white whitespace-nowrap shadow-md">
                    {p.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mx-2 my-2 h-px bg-gray-200" />

      {/* Settings */}
      <div className="flex flex-col items-center px-2">
        <NavItem to="/workspace/settings" icon={Settings} label="Configurações" />
      </div>

      <CreateWorkspaceModal
        open={creatingWorkspace}
        onClose={() => setCreatingWorkspace(false)}
      />
    </aside>
  )
}
