import { useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import {
  AtSign, Bell, CheckCircle, ChevronRight, Diamond,
  MessageSquare, Settings2, UserCheck,
} from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useAuthStore } from '@/stores/authStore'
import { useProjects } from '@/hooks/useProjects'
import { useMyWork } from '@/hooks/useIssues'
import { useNotifications, useMarkNotificationRead } from '@/hooks/useNotifications'
import { useNotificationStore } from '@/stores/notificationStore'
import { activityService, type ActivityEvent } from '@/services/activity.service'
import { cycleService } from '@/services/cycle.service'
import { milestoneService } from '@/services/milestone.service'
import { Avatar } from '@/components/ui/Avatar'
import { cn, relativeTime } from '@/lib/utils'
import type { Issue, Cycle, Notification } from '@/types'
import type { Milestone } from '@/types/milestone'

// ─── helpers ──────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'bom dia'
  if (h >= 12 && h < 18) return 'boa tarde'
  return 'boa noite'
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 }
const PRIORITY_LABEL: Record<string, string> = { urgent: 'P1', high: 'P2', medium: 'P3', low: 'P4', none: 'P4' }

function weekOffset(dateStr: string): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  return Math.floor((new Date(dateStr).getTime() - startOfWeek.getTime()) / msPerWeek)
}

function notifChip(type: string) {
  switch (type) {
    case 'issue_mentioned':
    case 'wiki_mentioned':
      return { Icon: AtSign, accent: true }
    case 'issue_assigned':
      return { Icon: UserCheck, accent: false }
    case 'issue_state_changed':
      return { Icon: CheckCircle, accent: false }
    case 'issue_commented':
      return { Icon: MessageSquare, accent: false }
    case 'cpm_critical_alert':
      return { Icon: Diamond, accent: true }
    default:
      return { Icon: Bell, accent: false }
  }
}

// ─── tile shell ───────────────────────────────────────────────────────────────

function Tile({
  title,
  badge,
  onHeaderClick,
  rowSpan,
  footer,
  children,
}: {
  title: string
  badge?: string | number
  onHeaderClick?: () => void
  rowSpan?: boolean
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        'flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 overflow-hidden',
        rowSpan && 'row-span-2',
      )}
    >
      <button
        type="button"
        onClick={onHeaderClick}
        disabled={!onHeaderClick}
        className={cn(
          'flex items-baseline gap-2 text-left mb-3',
          onHeaderClick && 'group cursor-pointer',
        )}
        aria-label={onHeaderClick ? `Ir para ${title}` : undefined}
      >
        <span className={cn(
          'text-sm font-semibold text-gray-900 dark:text-gray-100',
          onHeaderClick && 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
        )}>
          {title}
        </span>
        {badge !== undefined && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{badge}</span>
        )}
        {onHeaderClick && (
          <ChevronRight
            className="ml-auto h-3.5 w-3.5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400"
            aria-hidden="true"
          />
        )}
      </button>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
        {children}
      </div>

      {footer && (
        <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-2">
          {footer}
        </div>
      )}
    </section>
  )
}

function TileSkeleton({ rowSpan }: { rowSpan?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4',
        rowSpan && 'row-span-2',
      )}
    >
      <div className="animate-pulse space-y-2.5">
        <div className="h-4 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 rounded bg-gray-50 dark:bg-gray-800/60" />
        ))}
      </div>
    </div>
  )
}

// ─── My Work tile ─────────────────────────────────────────────────────────────

function MyWorkTile({ issues, isLoading }: { issues: Issue[]; isLoading: boolean }) {
  const navigate = useNavigate()
  const sorted = [...issues].sort((a, b) => {
    const pd = (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4)
    if (pd !== 0) return pd
    if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return 0
  })

  const open = sorted.filter(i => i.stateCategory !== 'completed' && i.stateCategory !== 'cancelled')

  return (
    <Tile
      title="meu trabalho"
      badge={open.length > 0 ? `${open.length} aberta${open.length !== 1 ? 's' : ''}` : undefined}
      rowSpan
      footer={
        open.length > 0 ? (
          <button
            onClick={() => navigate('/issues')}
            className="text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            aria-label="Ver todas as minhas issues"
          >
            ver tudo
          </button>
        ) : undefined
      }
    >
      {isLoading && (
        <div className="space-y-1.5" aria-busy="true" aria-label="Carregando issues">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse h-8 rounded bg-gray-50 dark:bg-gray-800/60" />
          ))}
        </div>
      )}

      {!isLoading && open.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center" role="status">
          você está em dia ✓
        </p>
      )}

      {!isLoading && open.map((issue) => {
        const label = PRIORITY_LABEL[issue.priority] ?? 'P4'
        const solid = issue.priority === 'urgent'
        return (
          <button
            key={issue.id}
            type="button"
            onClick={() => navigate(`/projects/${issue.projectId}/issues/${issue.id}`)}
            className="flex w-full items-center gap-2 rounded border border-gray-100 dark:border-gray-800 px-2.5 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={`${label} — ${issue.title}`}
          >
            <span
              className={cn(
                'shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded',
                solid
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400',
              )}
              aria-label={`Prioridade ${label}`}
            >
              {label}
            </span>
            <span className="truncate text-sm text-gray-800 dark:text-gray-200">{issue.title}</span>
          </button>
        )
      })}
    </Tile>
  )
}

// ─── Activity tile ────────────────────────────────────────────────────────────

function activityDescription(event: ActivityEvent): string {
  const actor = event.actorName ?? 'Alguém'
  const title = event.entityTitle ? `"${event.entityTitle}"` : ''
  switch (event.verb) {
    case 'created': return `${actor} criou ${title}`
    case 'commented': return `${actor} comentou em ${title}`
    case 'resolved': return `${actor} resolveu ${title}`
    case 'closed': return `${actor} fechou ${title}`
    case 'assigned': return `${actor} atribuiu ${title}`
    case 'updated': return `${actor} atualizou ${title}`
    case 'status_changed':
      return event.newValue
        ? `${actor} mudou status de ${title} para ${event.newValue}`
        : `${actor} mudou status de ${title}`
    default: return `${actor} ${event.verb} ${title}`
  }
}

function ActivityTile({ events, isLoading }: { events: ActivityEvent[]; isLoading: boolean }) {
  return (
    <Tile title="activity" badge="hoje">
      {isLoading && (
        <div className="space-y-2" aria-busy="true" aria-label="Carregando atividade">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse flex gap-2 items-center">
              <div className="h-5 w-5 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0" />
              <div className="h-3 flex-1 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && events.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center" role="status">
          nada novo por aqui
        </p>
      )}

      {!isLoading && events.map((ev, i) => (
        <div key={i} className="flex items-start gap-2">
          <Avatar name={ev.actorName ?? '?'} src={ev.actorAvatar} size="xs" aria-hidden="true" />
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug line-clamp-2">
            {activityDescription(ev)}
          </p>
        </div>
      ))}
    </Tile>
  )
}

// ─── Cycles tile ──────────────────────────────────────────────────────────────

function CyclesTile({
  cycles,
  isLoading,
}: {
  cycles: Array<Cycle & { progress: number }>
  isLoading: boolean
}) {
  const navigate = useNavigate()
  return (
    <Tile
      title="ciclos"
      badge={`${cycles.length} ativo${cycles.length !== 1 ? 's' : ''}`}
    >
      {isLoading && (
        <div className="space-y-1.5" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-7 rounded bg-gray-50 dark:bg-gray-800/60" />
          ))}
        </div>
      )}

      {!isLoading && cycles.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center" role="status">
          nenhum ciclo ativo
        </p>
      )}

      {!isLoading && cycles.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => navigate(`/projects/${c.projectId}/cycles/${c.id}`)}
          className="flex w-full items-center gap-2 rounded border border-gray-100 dark:border-gray-800 px-2.5 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label={`Ciclo ${c.name}, ${c.progress}% concluído`}
        >
          <span className="truncate flex-1 text-sm text-gray-800 dark:text-gray-200">{c.name}</span>
          <span className="shrink-0 text-[10px] font-medium border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded px-1.5 py-0.5">
            {c.progress}%
          </span>
        </button>
      ))}
    </Tile>
  )
}

// ─── Notifications tile ───────────────────────────────────────────────────────

function NotificationsTile({
  notifications,
  isLoading,
  unreadCount,
}: {
  notifications: Notification[]
  isLoading: boolean
  unreadCount: number
}) {
  const navigate = useNavigate()
  const markRead = useMarkNotificationRead()

  function handleClick(n: Notification) {
    if (!n.isRead) markRead.mutate(n.id)
    if (n.actionUrl) navigate(n.actionUrl)
  }

  return (
    <Tile
      title="notificações"
      badge={unreadCount > 0 ? `${unreadCount} nova${unreadCount !== 1 ? 's' : ''}` : undefined}
      onHeaderClick={() => navigate('/notifications')}
    >
      {isLoading && (
        <div className="space-y-1.5" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-7 rounded bg-gray-50 dark:bg-gray-800/60" />
          ))}
        </div>
      )}

      {!isLoading && notifications.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center" role="status">
          sem notificações novas
        </p>
      )}

      {!isLoading && notifications.slice(0, 4).map((n) => {
        const { Icon, accent } = notifChip(n.type)
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => handleClick(n)}
            className="flex w-full items-center gap-2 rounded border border-gray-100 dark:border-gray-800 px-2.5 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={n.title}
          >
            <span
              className={cn(
                'shrink-0 flex items-center justify-center w-5 h-5 rounded-full',
                accent
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
              )}
              aria-hidden="true"
            >
              <Icon className="h-2.5 w-2.5" />
            </span>
            <span className="truncate text-sm text-gray-800 dark:text-gray-200">{n.title}</span>
          </button>
        )
      })}
    </Tile>
  )
}

// ─── Milestones bar chart tile ────────────────────────────────────────────────

const WEEKS = 8

function MilestonesTile({ milestones, isLoading }: { milestones: Milestone[]; isLoading: boolean }) {
  const navigate = useNavigate()

  const counts = Array.from({ length: WEEKS }, (_, i) => ({
    week: i,
    count: milestones.filter(
      (m) => m.dueDate && weekOffset(m.dueDate) === i && m.status !== 'reached',
    ).length,
  }))
  const maxCount = Math.max(...counts.map((c) => c.count), 1)

  return (
    <Tile
      title="próximos"
      badge="marcos"
      onHeaderClick={() => navigate('/portfolio')}
    >
      {isLoading && (
        <div className="animate-pulse flex items-end gap-1 h-16 px-1" aria-busy="true">
          {[40, 65, 80, 45, 70, 30, 55, 50].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-gray-100 dark:bg-gray-800"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      )}

      {!isLoading && (
        <div
          className="flex items-end gap-1 h-16 px-1"
          role="img"
          aria-label={`Marcos nas próximas ${WEEKS} semanas`}
        >
          {counts.map(({ week, count }) => {
            const height = count === 0 ? 8 : Math.round((count / maxCount) * 100)
            const isCurrent = week === 0
            return (
              <div
                key={week}
                className={cn(
                  'flex-1 rounded-sm transition-all',
                  isCurrent
                    ? 'bg-indigo-500 dark:bg-indigo-400'
                    : count > 0
                      ? 'bg-gray-300 dark:bg-gray-600'
                      : 'bg-gray-100 dark:bg-gray-800',
                )}
                style={{ height: `${height}%` }}
                aria-label={`Semana ${week + 1}: ${count} marco${count !== 1 ? 's' : ''}`}
                title={`Semana ${week + 1}: ${count} marco${count !== 1 ? 's' : ''}`}
              />
            )
          })}
        </div>
      )}

      {!isLoading && milestones.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">
          nenhum marco nos próximos {WEEKS} semanas
        </p>
      )}
    </Tile>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function WorkspacePage() {
  const { workspace } = useWorkspaceStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { unreadCount } = useNotificationStore()

  const { data: projects = [] } = useProjects(workspace?.id ?? '')
  const projectIds = projects.map((p) => p.id)

  const { data: myIssues = [], isLoading: loadingWork } = useMyWork(user?.id)
  const { data: notifPage, isLoading: loadingNotifs } = useNotifications(true)
  const unreadNotifs = notifPage?.results ?? []

  // Parallel queries per project
  const activityResults = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: ['project-activity', id],
      queryFn: () => activityService.getProjectActivity(id, 10),
      enabled: !!id,
      staleTime: 60_000,
    })),
  })

  const cycleResults = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: ['cycles', id],
      queryFn: () => cycleService.list(id),
      enabled: !!id,
      staleTime: 60_000,
    })),
  })

  const milestoneResults = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: ['milestones', id],
      queryFn: () => milestoneService.list(id),
      enabled: !!id,
      staleTime: 60_000,
    })),
  })

  const recentActivity = activityResults
    .flatMap((r) => (r.data as ActivityEvent[] | undefined) ?? [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  const activeCycles: Array<Cycle & { progress: number }> = cycleResults
    .flatMap((r) => (r.data as Cycle[] | undefined) ?? [])
    .filter((c) => c.status === 'active')
    .map((c) => ({
      ...c,
      progress: c.issueCount
        ? Math.round(((c.completedCount ?? 0) / c.issueCount) * 100)
        : 0,
    }))

  const upcomingMilestones: Milestone[] = milestoneResults
    .flatMap((r) => (r.data as Milestone[] | undefined) ?? [])
    .filter((m) => m.dueDate && weekOffset(m.dueDate) >= 0 && weekOffset(m.dueDate) < WEEKS)

  const loadingActivity = activityResults.some((r) => r.isLoading) && recentActivity.length === 0
  const loadingCycles = cycleResults.some((r) => r.isLoading) && activeCycles.length === 0
  const loadingMilestones = milestoneResults.some((r) => r.isLoading) && upcomingMilestones.length === 0

  if (!workspace) return null

  const firstName = user?.name?.split(' ')[0] ?? ''

  return (
    <div className="flex flex-col h-full p-6 min-h-0">
      {/* Topbar */}
      <div className="flex items-end justify-between mb-5 shrink-0">
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
            {greeting()}, {firstName}
          </p>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Início</h1>
        </div>
        <button
          type="button"
          onClick={() => {}}
          className="flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Personalizar dashboard"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
          personalizar
        </button>
      </div>

      {/* Tile grid */}
      <div
        className="flex-1 min-h-0 grid gap-3"
        style={{
          gridTemplateColumns: '1.4fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr',
        }}
      >
        {/* 1 — My Work (spans 2 rows) */}
        {loadingWork ? (
          <TileSkeleton rowSpan />
        ) : (
          <MyWorkTile issues={myIssues} isLoading={loadingWork} />
        )}

        {/* 2 — Activity */}
        {loadingActivity ? (
          <TileSkeleton />
        ) : (
          <ActivityTile events={recentActivity} isLoading={loadingActivity} />
        )}

        {/* 3 — Cycles */}
        {loadingCycles ? (
          <TileSkeleton />
        ) : (
          <CyclesTile cycles={activeCycles} isLoading={loadingCycles} />
        )}

        {/* 4 — Notifications */}
        {loadingNotifs ? (
          <TileSkeleton />
        ) : (
          <NotificationsTile
            notifications={unreadNotifs}
            isLoading={loadingNotifs}
            unreadCount={unreadCount}
          />
        )}

        {/* 5 — Upcoming Milestones */}
        {loadingMilestones ? (
          <TileSkeleton />
        ) : (
          <MilestonesTile milestones={upcomingMilestones} isLoading={loadingMilestones} />
        )}
      </div>
    </div>
  )
}
