import api from '@/lib/axios'

export interface ActivityEvent {
  type: 'issue_activity' | 'wiki_activity'
  verb: string
  actorName: string | null
  actorAvatar: string | null
  entityId: string
  entityTitle: string
  entitySequenceId?: number | null
  projectId: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  createdAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvent(r: any): ActivityEvent {
  return {
    type: r.type,
    verb: r.verb,
    actorName: r.actor_name ?? null,
    actorAvatar: r.actor_avatar ?? null,
    entityId: r.entity_id,
    entityTitle: r.entity_title,
    entitySequenceId: r.entity_sequence_id ?? null,
    projectId: r.project_id,
    field: r.field ?? null,
    oldValue: r.old_value ?? null,
    newValue: r.new_value ?? null,
    createdAt: r.created_at,
  }
}

export const activityService = {
  getProjectActivity(projectId: string, limit = 100): Promise<ActivityEvent[]> {
    return api
      .get(`/projects/${projectId}/activity/`, { params: { limit } })
      .then(r => r.data.map(mapEvent))
  },
}
