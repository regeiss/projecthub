import { NavLink, useParams } from 'react-router-dom'
import { KanbanSquare, List, RotateCcw, Network, BookOpen, Flag, ShieldAlert, Layers, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'

interface ProjectNavProps {
  project: Project
}

const tabs = [
  { path: 'board', label: 'Painel', icon: KanbanSquare },
  { path: 'backlog', label: 'Backlog', icon: List },
  { path: 'cycles', label: 'Ciclos', icon: RotateCcw },
  { path: 'milestones', label: 'Milestones', icon: Flag },
  { path: 'gantt', label: 'Gantt / CPM', icon: Network },
  { path: 'wiki', label: 'Wiki', icon: BookOpen },
  { path: 'modules', label: 'Módulos', icon: Layers },
  { path: 'risks', label: 'Riscos', icon: ShieldAlert },
  { path: 'settings', label: 'Configurações', icon: Settings },
]

export function ProjectNav({ project }: ProjectNavProps) {
  const { projectId } = useParams()

  return (
    <div className="flex items-center gap-1">
      <span className="mr-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
        {project.name}
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
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
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
