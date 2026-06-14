import api from '@/lib/axios'
import type { Idea, IdeaInsight, IdeaScorecard } from '@/types'

export interface IdeaComment {
  id: string
  authorName: string
  authorAvatar: string | null
  body: string
  isEdited: boolean
  createdAt: string
  updatedAt: string
}

interface ScorecardResponse {
  impact: number
  effort: number
  confidence: number
  reach: number
  score: number
  updated_at: string
}

interface InsightResponse {
  id: string
  kind: 'note' | 'link' | 'feedback'
  title: string
  content: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

interface IdeaResponse {
  id: string
  workspace: string
  title: string
  summary: string | null
  status: Idea['status']
  owner: string | null
  owner_name: string | null
  project: string | null
  promoted_issue: string | null
  created_by: string
  scorecard: ScorecardResponse | null
  created_at: string
  updated_at: string
}

function mapScorecard(raw: ScorecardResponse | null): IdeaScorecard | null {
  if (!raw) return null
  return {
    impact: raw.impact,
    effort: raw.effort,
    confidence: raw.confidence,
    reach: raw.reach,
    score: raw.score,
    updatedAt: raw.updated_at,
  }
}

function mapIdea(raw: IdeaResponse): Idea {
  return {
    id: raw.id,
    title: raw.title,
    summary: raw.summary,
    status: raw.status,
    owner: raw.owner,
    ownerName: raw.owner_name,
    project: raw.project,
    promotedIssue: raw.promoted_issue,
    createdBy: raw.created_by,
    scorecard: mapScorecard(raw.scorecard),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

function mapInsight(raw: InsightResponse): IdeaInsight {
  return {
    id: raw.id,
    kind: raw.kind,
    title: raw.title,
    content: raw.content,
    createdBy: raw.created_by,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

function mapComment(raw: Record<string, unknown>): IdeaComment {
  return {
    id: raw.id as string,
    authorName: raw.author_name as string,
    authorAvatar: (raw.author_avatar as string | null) ?? null,
    body: raw.body as string,
    isEdited: raw.is_edited as boolean,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
  }
}

export const discoveryService = {
  listIdeas: () =>
    api.get<IdeaResponse[]>('/discovery/ideas/').then((r) => r.data.map(mapIdea)),

  createIdea: (data: { title: string; summary?: string; status?: Idea['status'] }) =>
    api.post<IdeaResponse>('/discovery/ideas/', data).then((r) => mapIdea(r.data)),

  updateScorecard: (
    ideaId: string,
    data: { impact: number; effort: number; confidence: number; reach: number },
  ) =>
    api
      .patch<ScorecardResponse>(`/discovery/ideas/${ideaId}/scorecard/`, data)
      .then((r) => mapScorecard(r.data)!),

  listInsights: (ideaId: string) =>
    api
      .get<InsightResponse[]>(`/discovery/ideas/${ideaId}/insights/`)
      .then((r) => r.data.map(mapInsight)),

  addInsight: (
    ideaId: string,
    data: { kind: IdeaInsight['kind']; title: string; content?: Record<string, unknown> },
  ) =>
    api
      .post<InsightResponse>(`/discovery/ideas/${ideaId}/insights/`, data)
      .then((r) => mapInsight(r.data)),

  updateIdea: (ideaId: string, data: Partial<{ title: string; summary: string; status: Idea['status'] }>) =>
    api.patch<IdeaResponse>(`/discovery/ideas/${ideaId}/`, data).then((r) => mapIdea(r.data)),

  promoteIdea: (ideaId: string) =>
    api.post<IdeaResponse>(`/discovery/ideas/${ideaId}/promote/`).then((r) => mapIdea(r.data)),

  listComments: (ideaId: string) =>
    api.get<Record<string, unknown>[]>(`/discovery/ideas/${ideaId}/comments/`).then((r) => r.data.map(mapComment)),

  addComment: (ideaId: string, body: string) =>
    api.post<Record<string, unknown>>(`/discovery/ideas/${ideaId}/comments/`, { body }).then((r) => mapComment(r.data)),

  deleteComment: (ideaId: string, commentId: string) =>
    api.delete(`/discovery/ideas/${ideaId}/comments/${commentId}/`),
}
