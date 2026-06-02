import {
  LayoutDashboard, SquareKanban, List, RefreshCw, GanttChart,
  BookOpen, BarChart3, CircleDot, Boxes, Flag, AlertTriangle,
  Users, Settings, Keyboard, HelpCircle,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import type { HelpPanel, HelpCategory } from './content/types'

interface CategoryItem {
  id: HelpCategory
  label: string
  icon: ComponentType<{ className?: string }>
}

const CATEGORIES: CategoryItem[] = [
  { id: 'general', label: 'Geral', icon: LayoutDashboard },
  { id: 'board', label: 'Board', icon: SquareKanban },
  { id: 'backlog', label: 'Backlog', icon: List },
  { id: 'cycles', label: 'Ciclos', icon: RefreshCw },
  { id: 'gantt', label: 'Gantt', icon: GanttChart },
  { id: 'wiki', label: 'Wiki', icon: BookOpen },
  { id: 'portfolio', label: 'Portfólio', icon: BarChart3 },
  { id: 'issues', label: 'Issues', icon: CircleDot },
  { id: 'modules', label: 'Módulos', icon: Boxes },
  { id: 'milestones', label: 'Marcos', icon: Flag },
  { id: 'risks', label: 'Riscos', icon: AlertTriangle },
  { id: 'resources', label: 'Recursos', icon: Users },
  { id: 'workspace', label: 'Workspace', icon: Settings },
]

interface Props {
  active: HelpPanel
  onSelect: (panel: HelpPanel) => void
}

export function HelpSidebar({ active, onSelect }: Props) {
  return (
    <nav
      className="flex h-full w-52 shrink-0 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-4"
      aria-label="Categorias de ajuda"
    >
      <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Categorias
      </p>

      <div className="flex flex-col gap-0.5 px-2">
        {CATEGORIES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            aria-current={active === id ? 'page' : undefined}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors text-left',
              active === id
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="mx-3 my-3 h-px bg-gray-200 dark:bg-gray-700" />

      <div className="flex flex-col gap-0.5 px-2">
        <button
          onClick={() => onSelect('shortcuts')}
          aria-current={active === 'shortcuts' ? 'page' : undefined}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors text-left',
            active === 'shortcuts'
              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
          )}
        >
          <Keyboard className="h-4 w-4 shrink-0" aria-hidden="true" />
          Atalhos
        </button>

        <button
          onClick={() => onSelect('faq')}
          aria-current={active === 'faq' ? 'page' : undefined}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors text-left',
            active === 'faq'
              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
          )}
        >
          <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          FAQ
        </button>
      </div>
    </nav>
  )
}
