export type RagStatus = 'GREEN' | 'AMBER' | 'RED'

export interface Portfolio {
  id: string
  workspaceId: string
  name: string
  description: string | null
  ownerId: string
  ownerDetail: { id: string; name: string; avatarUrl: string | null }
  projectCount: number
  createdAt: string
  updatedAt: string
}

export interface PortfolioProject {
  id: string
  portfolioId: string
  projectId: string
  projectName: string
  projectIdentifier: string
  startDate: string | null
  endDate: string | null
  budgetPlanned: string
  budgetActual: string
  ragStatus: RagStatus
  ragLabel: string
  ragOverride: boolean
  ragNote: string | null
  createdAt: string
  updatedAt: string
}

export interface EvmData {
  pctIssuesCompleted: number
  pctTimeElapsed: number
  totalIssues: number
  completedIssues: number
  pv: number
  ev: number
  ac: number
  cpi: number
  spi: number
  budgetPlanned: number
  budgetActual: number
  varianceCost: number
  varianceSchedule: number
}

export interface PortfolioDashboardProject extends PortfolioProject {
  evm: EvmData
  riskCount: number
  criticalRiskCount: number
}

export interface PortfolioObjective {
  id: string
  portfolioId: string
  title: string
  description: string | null
  targetValue: string
  currentValue: string
  unit: string | null
  dueDate: string | null
  progressPct: number
  linkedProjects: Array<{ project: string; projectName: string; weight: string }>
  createdAt: string
  updatedAt: string
}

export interface RoadmapProject {
  id: string
  project: string
  projectName: string
  projectIdentifier: string
  projectColor: string
  startDate: string | null
  endDate: string | null
  ragStatus: RagStatus
  predecessors: string[]
}

export interface PortfolioCostEntry {
  id: string
  portfolioProjectId: string
  date: string
  amount: string
  category: 'labor' | 'infrastructure' | 'licenses' | 'services' | 'other'
  description: string | null
  createdById: string
  createdAt: string
}
