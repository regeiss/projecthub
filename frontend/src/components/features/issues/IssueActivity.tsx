import { useIssueActivities } from '@/hooks/useIssues'
import { Avatar } from '@/components/ui/Avatar'
import { priorityLabel, relativeTime } from '@/lib/utils'
import type { IssueActivity as IssueActivityType } from '@/types'

function formatActivityText(a: IssueActivityType): { action: string; target: string | null } {
  const display = a.newIdentifier ?? a.newValue
  switch (a.verb) {
    case 'created':
      return { action: 'criou esta issue', target: null }
    case 'updated_state':
      return { action: 'alterou o estado para', target: display }
    case 'assigned':
      return { action: display ? 'atribuiu para' : 'removeu a atribuição', target: display }
    case 'updated_priority':
      return { action: 'alterou a prioridade para', target: display ? priorityLabel(display) : null }
    case 'updated_type':
      return { action: 'alterou o tipo para', target: display }
    case 'updated_title':
      return { action: 'alterou o título para', target: display }
    case 'updated_start_date':
      return { action: 'alterou a data de início para', target: display }
    case 'updated_due_date':
      return { action: 'alterou a data de vencimento para', target: display }
    case 'updated_estimate_points':
      return { action: 'alterou a estimativa para', target: display ? `${display} pts` : null }
    case 'updated_parent':
      return { action: 'alterou a issue pai', target: null }
    default:
      return { action: a.verb, target: display }
  }
}

export function IssueActivity({ projectId, issueId }: { projectId: string; issueId: string }) {
  const { data: activities = [] } = useIssueActivities(projectId, issueId)

  if (activities.length === 0) return null

  return (
    <div className="mt-6">
      <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Atividade</h3>
      <ol className="space-y-3">
        {activities.map((a) => {
          const { action, target } = formatActivityText(a)
          return (
            <li key={a.id} className="flex items-start gap-2.5">
              <Avatar
                src={a.actor?.avatarUrl}
                name={a.actor?.name ?? '?'}
                size="xs"
                className="mt-0.5 shrink-0"
              />
              <div className="flex-1 text-sm">
                <span className="font-medium text-gray-900 dark:text-gray-100">{a.actor?.name ?? 'Sistema'}</span>{' '}
                <span className="text-gray-600 dark:text-gray-400">{action}</span>
                {target && (
                  <> <span className="font-medium text-gray-900 dark:text-gray-100">{target}</span></>
                )}
              </div>
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                {relativeTime(a.createdAt)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
