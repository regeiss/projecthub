import { useParams, Link } from 'react-router-dom'
import { FileText, GitCommit, MessageSquare, PenLine, RefreshCw } from 'lucide-react'
import { useProjectActivity } from '@/hooks/useActivity'
import { PageSpinner } from '@/components/ui/Spinner'
import type { ActivityEvent } from '@/services/activity.service'

// ─── Verb labels ──────────────────────────────────────────────────────────────

const ISSUE_VERB_LABELS: Record<string, string> = {
  created: 'criou a issue',
  updated_state: 'alterou o estado de',
  assigned: 'atribuiu',
  updated_priority: 'alterou a prioridade de',
  updated_type: 'alterou o tipo de',
  updated_title: 'renomeou',
  updated_due_date: 'alterou a data de entrega de',
  updated_estimate: 'alterou a estimativa de',
  commented: 'comentou em',
}

const WIKI_VERB_LABELS: Record<string, string> = {
  created: 'criou a página',
  updated: 'editou a página',
  commented: 'comentou em',
}

function verbLabel(event: ActivityEvent): string {
  const map = event.type === 'issue_activity' ? ISSUE_VERB_LABELS : WIKI_VERB_LABELS
  return map[event.verb] ?? event.verb
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function ActorAvatar({ name, avatar }: { name: string | null; avatar: string | null }) {
  if (avatar) {
    return <img src={avatar} alt={name ?? ''} className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
  }
  const initials = (name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map(s => s[0])
    .join('')
    .toUpperCase()
  return (
    <div className="h-7 w-7 flex-shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300">
      {initials}
    </div>
  )
}

// ─── Event icon ───────────────────────────────────────────────────────────────

function EventIcon({ event }: { event: ActivityEvent }) {
  const cls = 'h-3.5 w-3.5'
  if (event.type === 'wiki_activity') {
    return event.verb === 'commented'
      ? <MessageSquare className={cls} />
      : <FileText className={cls} />
  }
  if (event.verb === 'created') return <GitCommit className={cls} />
  if (event.verb === 'commented') return <MessageSquare className={cls} />
  return <PenLine className={cls} />
}

// ─── Single event row ─────────────────────────────────────────────────────────

function EventRow({ event, projectId }: { event: ActivityEvent; projectId: string }) {
  const time = new Date(event.createdAt)
  const timeLabel = time.toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  const entityLink =
    event.type === 'issue_activity'
      ? `/projects/${projectId}/issues/${event.entityId}`
      : `/projects/${projectId}/wiki/${event.entityId}`

  const entityLabel =
    event.type === 'issue_activity' && event.entitySequenceId
      ? `#${event.entitySequenceId} ${event.entityTitle}`
      : event.entityTitle

  return (
    <div className="flex gap-3 py-3">
      <div className="flex flex-col items-center">
        <ActorAvatar name={event.actorName} avatar={event.actorAvatar} />
        <div className="mt-1 flex-1 w-px bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="flex-1 min-w-0 pb-2">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
          <span className="font-medium text-gray-900 dark:text-gray-100">{event.actorName ?? 'Sistema'}</span>
          {' '}{verbLabel(event)}{' '}
          <Link
            to={entityLink}
            className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {entityLabel}
          </Link>
        </p>
        {event.field && event.oldValue && event.newValue && (
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            <span className="line-through">{event.oldValue}</span>
            {' → '}
            <span>{event.newValue}</span>
          </p>
        )}
        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <EventIcon event={event} />
          {timeLabel}
        </p>
      </div>
    </div>
  )
}

// ─── Day group header ─────────────────────────────────────────────────────────

function dayKey(createdAt: string): string {
  return createdAt.split('T')[0]
}

function dayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (iso === today.toISOString().split('T')[0]) return 'Hoje'
  if (iso === yesterday.toISOString().split('T')[0]) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProjectActivityPage() {
  const { projectId = '' } = useParams()
  const { data: events = [], isLoading, refetch } = useProjectActivity(projectId)

  // Group by day
  const groups: { day: string; events: ActivityEvent[] }[] = []
  for (const e of events) {
    const day = dayKey(e.createdAt)
    const last = groups[groups.length - 1]
    if (last && last.day === day) {
      last.events.push(e)
    } else {
      groups.push({ day, events: [e] })
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Atividade do projeto</h2>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </button>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : events.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-gray-400">
          Nenhuma atividade registrada.
        </div>
      ) : (
        <div>
          {groups.map((g) => (
            <div key={g.day}>
              <div className="sticky top-0 z-10 -mx-2 mb-1 rounded-md bg-gray-50 dark:bg-gray-900 px-2 py-1.5">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {dayLabel(g.day)}
                </span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {g.events.map((e, i) => (
                  <EventRow key={`${e.entityId}-${e.createdAt}-${i}`} event={e} projectId={projectId} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
