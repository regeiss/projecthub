import { matchPath } from 'react-router-dom'
import type { HelpCategory } from './types'

export const ROUTE_MAP: Array<{ pattern: string; category: HelpCategory }> = [
  { pattern: '/projects/:projectId/board', category: 'board' },
  { pattern: '/projects/:projectId/backlog', category: 'backlog' },
  { pattern: '/projects/:projectId/cycles/:cycleId', category: 'cycles' },
  { pattern: '/projects/:projectId/cycles', category: 'cycles' },
  { pattern: '/projects/:projectId/gantt', category: 'gantt' },
  { pattern: '/projects/:projectId/wiki/:pageId', category: 'wiki' },
  { pattern: '/projects/:projectId/wiki', category: 'wiki' },
  { pattern: '/projects/:projectId/milestones', category: 'milestones' },
  { pattern: '/projects/:projectId/risks', category: 'risks' },
  { pattern: '/projects/:projectId/modules', category: 'modules' },
  { pattern: '/projects/:projectId/epics', category: 'issues' },
  { pattern: '/projects/:projectId/issues/:issueId', category: 'issues' },
  { pattern: '/projects/:projectId/resources', category: 'resources' },
  { pattern: '/portfolio', category: 'portfolio' },
  { pattern: '/wiki/:pageId', category: 'wiki' },
  { pattern: '/wiki', category: 'wiki' },
  { pattern: '/workspace/resources', category: 'resources' },
  { pattern: '/workspace/settings', category: 'workspace' },
]

export function categoryFromPath(pathname: string): HelpCategory {
  for (const { pattern, category } of ROUTE_MAP) {
    if (matchPath(pattern, pathname)) return category
  }
  return 'general'
}
