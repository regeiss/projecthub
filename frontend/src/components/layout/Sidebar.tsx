import { useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  Settings,
  Plus,
  Users,
  BookOpen,
  Bell,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useWorkspaces } from '@/hooks/useWorkspace'
import { useProjects } from '@/hooks/useProjects'
import { Modal } from '@/components/ui/Modal'
import { WorkspaceWizard } from '@/features/workspace/WorkspaceWizard'
import { GlobalSearch } from '@/features/search'
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
  expanded,
}: {
  to: string
  icon: React.ElementType
  label: string
  expanded: boolean
}) {
  return (
    <div className={cn('group/nav relative', expanded && 'w-full')}>
      <NavLink
        to={to}
        className={({ isActive }) =>
          cn(
            'flex h-8 items-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white',
            expanded ? 'w-full gap-3 px-2' : 'w-8 justify-center',
            isActive && 'bg-white/15 text-white',
          )
        }
        aria-label={label}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {expanded && <span className="truncate text-sm">{label}</span>}
      </NavLink>

      {!expanded && (
        <div className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 hidden group-hover/nav:block z-50">
          <div className="rounded-md bg-black/75 px-2.5 py-1 text-xs text-white whitespace-nowrap shadow-lg">
            {label}
          </div>
        </div>
      )}
    </div>
  )
}

function CreateWorkspaceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} size="md">
      <WorkspaceWizard onDone={onClose} />
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
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem('sidebar-expanded') === 'true' } catch { return false }
  })

  function toggleExpanded() {
    const next = !expanded
    setExpanded(next)
    try { localStorage.setItem('sidebar-expanded', String(next)) } catch {}
  }

  function selectWorkspace(ws: (typeof workspaces)[0]) {
    setWsDropdownOpen(false)
    setWorkspace(ws)
    navigate('/')
  }

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-white/10 bg-sidebar-dark py-3 transition-all duration-200 ease-in-out',
        expanded ? 'w-52' : 'w-14',
      )}
    >
      {/* Workspace selector */}
      <div className={cn('flex pb-3', expanded ? 'px-3' : 'justify-center px-2')}>
        <Dropdown open={wsDropdownOpen} onOpenChange={setWsDropdownOpen}>
          <DropdownTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2.5 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors',
                expanded ? 'w-full px-2.5 py-1.5' : 'h-8 w-8 justify-center',
              )}
              aria-label="Selecionar workspace"
            >
              <span className="shrink-0 text-sm font-bold">
                {workspace?.name?.[0]?.toUpperCase() ?? 'W'}
              </span>
              {expanded && (
                <span className="truncate text-sm font-semibold">
                  {workspace?.name ?? 'Workspace'}
                </span>
              )}
            </button>
          </DropdownTrigger>
          <DropdownContent align="start" className="ml-2">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                type="button"
                className="flex w-full cursor-pointer select-none items-center px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 outline-none"
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

      <div className="mx-2 mb-3 h-px bg-white/10" />

      {/* Search */}
      <div className={cn('mb-1', expanded ? 'px-3' : 'flex justify-center px-2')}>
        <GlobalSearch expanded={expanded} />
      </div>

      {/* Main navigation */}
      <nav
        className={cn(
          'flex flex-1 flex-col gap-1',
          expanded ? 'px-3' : 'items-center px-2',
        )}
      >
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" expanded={expanded} />
        <NavItem to="/projects" icon={FolderKanban} label="Projetos" expanded={expanded} />
        <NavItem to="/portfolio" icon={BarChart3} label="Portfolio" expanded={expanded} />
        <NavItem to="/wiki" icon={BookOpen} label="Wiki" expanded={expanded} />
        <NavItem to="/inbox" icon={Bell} label="Inbox" expanded={expanded} />
        <NavItem to="/workspace/resources" icon={Users} label="Recursos" expanded={expanded} />
      </nav>

      {/* Projects quick list */}
      {projects.length > 0 && (
        <>
          <div className="mx-2 my-2 h-px bg-white/10" />
          {expanded && (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Projetos
            </p>
          )}
          <div
            className={cn(
              'flex flex-col gap-0.5',
              expanded ? 'px-3' : 'items-center px-2',
            )}
          >
            {projects.slice(0, 6).map((p) => (
              <div key={p.id} className={cn('group/proj relative', expanded && 'w-full')}>
                <NavLink
                  to={`/projects/${p.id}/board`}
                  className={cn(
                    'flex items-center rounded transition-colors',
                    expanded
                      ? cn(
                          'w-full gap-2.5 px-2 py-1 text-sm hover:bg-white/10',
                          projectId === p.id
                            ? 'text-white'
                            : 'text-white/50 hover:text-white',
                        )
                      : cn(
                          'h-7 w-7 justify-center text-xs font-semibold',
                          projectId === p.id
                            ? 'bg-white/20 text-white'
                            : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white',
                        ),
                  )}
                >
                  <span
                    className={cn(
                      'shrink-0 text-xs font-semibold',
                      expanded && 'flex h-5 w-8 items-center justify-center rounded bg-white/10 text-white/70',
                    )}
                  >
                    {p.identifier}
                  </span>
                  {expanded && (
                    <span className="truncate text-sm">{p.name}</span>
                  )}
                </NavLink>

                {!expanded && (
                  <div className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 hidden group-hover/proj:block z-50">
                    <div className="rounded-md bg-black/75 px-2.5 py-1 text-xs text-white whitespace-nowrap shadow-lg">
                      {p.name}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mx-2 my-2 h-px bg-white/10" />

      {/* Bottom: settings + toggle */}
      <div
        className={cn(
          'flex flex-col gap-1',
          expanded ? 'px-3' : 'items-center px-2',
        )}
      >
        <NavItem to="/workspace/settings" icon={Settings} label="Configurações" expanded={expanded} />

        <button
          onClick={toggleExpanded}
          className={cn(
            'flex h-8 items-center rounded-md text-white/30 transition-colors hover:bg-white/10 hover:text-white/70',
            expanded ? 'w-full gap-3 px-2' : 'w-8 justify-center',
          )}
          aria-label={expanded ? 'Recolher sidebar' : 'Expandir sidebar'}
        >
          {expanded
            ? <PanelLeftClose className="h-4 w-4 shrink-0" />
            : <PanelLeft className="h-4 w-4 shrink-0" />}
          {expanded && <span className="text-sm">Recolher</span>}
        </button>
      </div>

      <CreateWorkspaceModal
        open={creatingWorkspace}
        onClose={() => setCreatingWorkspace(false)}
      />
    </aside>
  )
}
