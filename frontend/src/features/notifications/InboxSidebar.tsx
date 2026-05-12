import { Inbox, Circle, AtSign, UserCheck, Eye, Archive, FolderKanban } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationCounts } from '@/types'
import type { Project } from '@/types'

type FilterValue = 'all' | 'unread' | 'mentions' | 'assigned' | 'watching' | 'archived'

interface FilterItem {
  value: FilterValue
  label: string
  icon: React.ElementType
}

const FILTERS: FilterItem[] = [
  { value: 'all', label: 'Tudo', icon: Inbox },
  { value: 'unread', label: 'Não lidas', icon: Circle },
  { value: 'mentions', label: '@ Menções', icon: AtSign },
  { value: 'assigned', label: 'Atribuídas', icon: UserCheck },
  { value: 'watching', label: 'Observando', icon: Eye },
]

interface Props {
  activeFilter: FilterValue | string   // string when it's a project UUID
  activeProjectId: string | undefined
  unreadOnly: boolean
  counts: NotificationCounts | undefined
  projects: Project[]
  onFilterChange: (filter: FilterValue) => void
  onProjectSelect: (projectId: string) => void
  onUnreadOnlyChange: (val: boolean) => void
}

export function InboxSidebar({
  activeFilter,
  activeProjectId,
  unreadOnly,
  counts,
  projects,
  onFilterChange,
  onProjectSelect,
  onUnreadOnlyChange,
}: Props) {
  function countFor(filter: FilterValue): number | undefined {
    if (!counts) return undefined
    return counts[filter] > 0 ? counts[filter] : undefined
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-white py-4">
      <div className="px-4 pb-3">
        <p className="text-sm font-semibold text-gray-800">🔔 Inbox</p>
      </div>

      {/* Main filters */}
      <nav className="flex flex-col gap-0.5 px-2">
        {FILTERS.map(({ value, label, icon: Icon }) => {
          const isActive = activeFilter === value && !activeProjectId
          const count = countFor(value)
          return (
            <button
              key={value}
              onClick={() => onFilterChange(value)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {count !== undefined && (
                <span className="ml-auto font-mono text-xs">{count}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Projects section */}
      {projects.length > 0 && (
        <div className="mt-4 flex flex-col">
          <div className="flex items-center px-5 py-2">
            <span className="flex-1 text-[10px] font-mono uppercase tracking-widest text-gray-400">
              Projetos
            </span>
            <label className="flex cursor-pointer items-center gap-1 text-[10px] text-gray-400">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={unreadOnly}
                onChange={(e) => onUnreadOnlyChange(e.target.checked)}
              />
              Não lidas
            </label>
          </div>
          <div className="flex flex-col gap-0.5 px-2">
            {projects.map((p) => {
              const isActive = activeProjectId === p.id
              const projCount = counts?.by_project?.[p.id]
              return (
                <button
                  key={p.id}
                  onClick={() => onProjectSelect(p.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-gray-600 hover:bg-gray-100',
                  )}
                >
                  <FolderKanban className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-left">{p.name}</span>
                  {projCount !== undefined && projCount > 0 && (
                    <span className="ml-auto font-mono text-xs">{projCount}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Archived — pushed to bottom */}
      <div className="mt-auto px-2 pt-2 border-t border-gray-100">
        <button
          onClick={() => onFilterChange('archived')}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
            activeFilter === 'archived' && !activeProjectId
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-gray-600 hover:bg-gray-100',
          )}
        >
          <Archive className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Arquivadas</span>
          {counts?.archived !== undefined && counts.archived > 0 && (
            <span className="ml-auto font-mono text-xs">{counts.archived}</span>
          )}
        </button>
      </div>
    </aside>
  )
}
