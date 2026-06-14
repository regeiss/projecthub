export interface IdeaScorecard {
  impact: number
  effort: number
  confidence: number
  reach: number
  score: number
  updatedAt: string
}

export interface IdeaInsight {
  id: string
  kind: 'note' | 'link' | 'feedback'
  title: string
  content: Record<string, unknown>
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface Idea {
  id: string
  title: string
  summary: string | null
  status: 'new' | 'reviewing' | 'planned' | 'building' | 'shipped' | 'parked'
  owner: string | null
  ownerName: string | null
  project: string | null
  promotedIssue: string | null
  createdBy: string
  scorecard?: IdeaScorecard | null
  createdAt: string
  updatedAt: string
}

