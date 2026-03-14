export type RiskCategory =
  | 'technical'
  | 'schedule'
  | 'cost'
  | 'resource'
  | 'external'
  | 'stakeholder'

export type RiskStatus =
  | 'identified'
  | 'analyzing'
  | 'mitigating'
  | 'monitoring'
  | 'closed'
  | 'accepted'
  | 'occurred'

export type RiskResponseType = 'avoid' | 'transfer' | 'mitigate' | 'accept'

export interface Risk {
  id: string
  projectId: string
  title: string
  description: string | null
  category: RiskCategory
  probability: number   // 1-5
  impact: number        // 1-5
  score: number         // probability * impact (1-25)
  status: RiskStatus
  responseType: RiskResponseType | null
  ownerId: string | null
  ownerName: string | null
  mitigationPlan: string | null
  contingencyPlan: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateRiskDto {
  title: string
  description?: string
  category: RiskCategory
  probability: number
  impact: number
  status?: RiskStatus
  responseType?: RiskResponseType
  ownerId?: string
  mitigationPlan?: string
  contingencyPlan?: string
  dueDate?: string
}

export type UpdateRiskDto = Partial<CreateRiskDto>
