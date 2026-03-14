export interface CpmNodeData {
  es: number
  ef: number
  ls: number
  lf: number
  slack: number
  isCritical: boolean
  duration: number
}

export interface CpmEdge {
  source: string
  target: string
  relationType: string
  lag: number
}

export interface CpmResult {
  nodes: Record<string, CpmNodeData>
  criticalPath: string[]
  projectDuration: number
  edges: CpmEdge[]
}

export interface CpmIssueData {
  id: string
  issue: string
  durationDays: number
  es: number | null
  ef: number | null
  ls: number | null
  lf: number | null
  slack: number | null
  isCritical: boolean
  calculatedAt: string | null
}

export interface CpmBaseline {
  id: string
  project: string
  name: string
  snapshot: CpmResult
  createdById: string
  createdAt: string
}

export interface GanttTask {
  id: string
  name: string
  start: string
  end: string
  progress: number
  isCritical: boolean
  slack: number
  dependencies: string
}
