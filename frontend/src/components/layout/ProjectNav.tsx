import { NavLink, useParams } from 'react-router-dom'
import { BarChart3, KanbanSquare, List, RotateCcw, Network, BookOpen, Flag, ShieldAlert, Layers, Settings, BookMarked, Users, LayoutDashboard, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'

interface ProjectNavProps {
  project: Project
}

const tabs = [
  { path: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { path: 'activity', label: 'Atividade', icon: Activity },
  { path: 'board', label: 'Painel', icon: KanbanSquare },
  { path: 'backlog', label: 'Backlog', icon: List },
  { path: 'epics', label: 'Épicos', icon: BookMarked },
  { path: 'cycles', label: 'Ciclos', icon: RotateCcw },
  { path: 'milestones', label: 'Milestones', icon: Flag },
  { path: 'reports', label: 'Relatórios', icon: BarChart3 },
  { path: 'gantt', label: 'Gantt / CPM', icon: Network },
  { path: 'wiki', label: 'Wiki', icon: BookOpen },
  { path: 'modules', label: 'Módulos', icon: Layers },
  { path: 'risks', label: 'Riscos', icon: ShieldAlert },
  { path: 'resources', label: 'Recursos', icon: Users },
  { path: 'settings', label: 'Configurações', icon: Settings },
]

export function ProjectNav({ project }: ProjectNavProps) {
  const { projectId } = useParams()

  return (
    <div className="flex items-center gap-1">
      <span
        className="mr-3 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
        style={{
          backgroundColor: (project.color ?? '#6366f1') + '22',
          color: project.color ?? '#6366f1',
        }}
      >
        {project.name.replace(/^projeto\s+/i, '')}
      </span>
      <nav className="flex items-center gap-0.5">
        {tabs.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={`/projects/${projectId}/${path}`}
            className={({ isActive }) =>
              cn(
                'flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-primary-light dark:bg-primary/20 text-primary-text dark:text-primary'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200',
              )
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
