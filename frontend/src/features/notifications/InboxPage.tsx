import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjects } from '@/hooks/useProjects'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import {
  useInboxNotifications,
  useNotificationCounts,
  useArchiveNotification,
  useMarkUnread,
  useInboxMarkRead,
  useMarkAllRead,
} from '@/hooks/useInbox'
import { InboxSidebar } from './InboxSidebar'
import { InboxList } from './InboxList'
import { InboxEmptyState } from './InboxEmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'

type FilterValue = 'all' | 'unread' | 'mentions' | 'assigned' | 'watching' | 'archived'

const FILTER_LABELS: Record<FilterValue, string> = {
  all: 'Tudo',
  unread: 'Não lidas',
  mentions: '@ Menções',
  assigned: 'Atribuídas',
  watching: 'Observando',
  archived: 'Arquivadas',
}

export function InboxPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const filter = (searchParams.get('filter') as FilterValue) || 'all'
  const projectId = searchParams.get('project') ?? undefined
  const unreadOnly = searchParams.get('unread') === '1'

  const { workspace } = useWorkspaceStore()
  const { data: projectsData = [] } = useProjects(workspace?.id ?? '')
  const { data: counts } = useNotificationCounts()

  const { data, isLoading } = useInboxNotifications(
    projectId ? 'all' : filter,
    projectId,
    unreadOnly,
  )
  const notifications = data?.results ?? []

  const archiveMutation = useArchiveNotification()
  const markUnreadMutation = useMarkUnread()
  const markReadMutation = useInboxMarkRead()
  const markAllReadMutation = useMarkAllRead()

  function setFilter(f: FilterValue) {
    setSearchParams({ filter: f })
  }

  function selectProject(id: string) {
    setSearchParams(unreadOnly ? { project: id, unread: '1' } : { project: id })
    setMobileSidebarOpen(false)
  }

  function toggleUnreadOnly(val: boolean) {
    const next = new URLSearchParams(searchParams)
    if (val) next.set('unread', '1')
    else next.delete('unread')
    setSearchParams(next)
  }

  const titleLabel = projectId
    ? projectsData.find((p) => p.id === projectId)?.name ?? 'Projeto'
    : FILTER_LABELS[filter] ?? 'Tudo'

  const emptyFilter: 'all' | 'unread' | 'mentions' | 'assigned' | 'watching' | 'archived' | 'project' =
    projectId ? 'project' : filter

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <InboxSidebar
          activeFilter={projectId ? 'all' : filter}
          activeProjectId={projectId}
          unreadOnly={unreadOnly}
          counts={counts}
          projects={projectsData}
          onFilterChange={setFilter}
          onProjectSelect={selectProject}
          onUnreadOnlyChange={toggleUnreadOnly}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute left-0 top-0 h-full" onClick={(e) => e.stopPropagation()}>
            <InboxSidebar
              activeFilter={projectId ? 'all' : filter}
              activeProjectId={projectId}
              unreadOnly={unreadOnly}
              counts={counts}
              projects={projectsData}
              onFilterChange={(f) => { setFilter(f); setMobileSidebarOpen(false) }}
              onProjectSelect={selectProject}
              onUnreadOnlyChange={toggleUnreadOnly}
            />
          </div>
        </div>
      )}

      {/* Main body */}
      <div className="flex flex-1 flex-col min-h-0">
        {/* Topbar */}
        <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <button
            className="lg:hidden rounded p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Filter className="h-4 w-4" />
          </button>
          <h1 className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{titleLabel}</h1>
          {notifications.length > 0 && filter !== 'archived' && (
            <Button
              variant="ghost"
              size="sm"
              loading={markAllReadMutation.isPending}
              onClick={() => markAllReadMutation.mutate()}
            >
              Marcar tudo como lido
            </Button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : notifications.length === 0 ? (
            <InboxEmptyState filter={emptyFilter} />
          ) : (
            <InboxList
              notifications={notifications}
              onMarkRead={(id) => markReadMutation.mutate(id)}
              onMarkUnread={(id) => markUnreadMutation.mutate(id)}
              onArchive={(id) => archiveMutation.mutate(id)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
