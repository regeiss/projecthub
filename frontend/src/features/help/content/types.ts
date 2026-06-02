import type { ReactNode } from 'react'

export type HelpCategory =
  | 'general'
  | 'board'
  | 'backlog'
  | 'cycles'
  | 'gantt'
  | 'wiki'
  | 'portfolio'
  | 'issues'
  | 'modules'
  | 'milestones'
  | 'risks'
  | 'resources'
  | 'workspace'

export type HelpPanel = HelpCategory | 'shortcuts' | 'faq'

export type HelpArticle = {
  id: string
  category: HelpCategory
  title: string
  body: ReactNode
  bodyText: string
  keywords: string[]
  routePattern?: string
}

export type Shortcut = {
  keys: string[]
  description: string
  group: 'navigation' | 'issues' | 'search' | 'editor'
}

export type FaqEntry = {
  id: string
  question: string
  answer: ReactNode
}
