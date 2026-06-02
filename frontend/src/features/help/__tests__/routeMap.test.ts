import { describe, it, expect } from 'vitest'
import { categoryFromPath, ROUTE_MAP } from '../content/routeMap'
import type { HelpCategory } from '../content/types'
import { ARTICLES } from '../content/articles'

describe('categoryFromPath', () => {
  it('returns "board" for project board route', () => {
    expect(categoryFromPath('/projects/abc-123/board')).toBe('board')
  })

  it('returns "backlog" for project backlog route', () => {
    expect(categoryFromPath('/projects/abc-123/backlog')).toBe('backlog')
  })

  it('returns "cycles" for project cycles route', () => {
    expect(categoryFromPath('/projects/abc-123/cycles')).toBe('cycles')
  })

  it('returns "cycles" for a specific cycle detail route', () => {
    expect(categoryFromPath('/projects/abc-123/cycles/cycle-456')).toBe('cycles')
  })

  it('returns "gantt" for project gantt route', () => {
    expect(categoryFromPath('/projects/abc-123/gantt')).toBe('gantt')
  })

  it('returns "wiki" for project wiki route', () => {
    expect(categoryFromPath('/projects/abc-123/wiki')).toBe('wiki')
  })

  it('returns "wiki" for workspace wiki route', () => {
    expect(categoryFromPath('/wiki')).toBe('wiki')
  })

  it('returns "portfolio" for portfolio route', () => {
    expect(categoryFromPath('/portfolio')).toBe('portfolio')
  })

  it('returns "milestones" for milestones route', () => {
    expect(categoryFromPath('/projects/abc-123/milestones')).toBe('milestones')
  })

  it('returns "risks" for risks route', () => {
    expect(categoryFromPath('/projects/abc-123/risks')).toBe('risks')
  })

  it('returns "modules" for modules route', () => {
    expect(categoryFromPath('/projects/abc-123/modules')).toBe('modules')
  })

  it('returns "resources" for workspace resources route', () => {
    expect(categoryFromPath('/workspace/resources')).toBe('resources')
  })

  it('returns "workspace" for workspace settings route', () => {
    expect(categoryFromPath('/workspace/settings')).toBe('workspace')
  })

  it('returns "general" for the home route', () => {
    expect(categoryFromPath('/')).toBe('general')
  })

  it('returns "general" for unmatched routes', () => {
    expect(categoryFromPath('/some/unknown/path')).toBe('general')
  })
})

describe('ROUTE_MAP integrity', () => {
  it('every category in ROUTE_MAP is a valid HelpCategory', () => {
    const validCategories: HelpCategory[] = [
      'general', 'board', 'backlog', 'cycles', 'gantt', 'wiki',
      'portfolio', 'issues', 'modules', 'milestones', 'risks', 'resources', 'workspace',
    ]
    ROUTE_MAP.forEach(({ category }) => {
      expect(validCategories).toContain(category)
    })
  })
})

describe('ARTICLES routePattern integrity', () => {
  it('every routePattern in ARTICLES maps to a valid category via categoryFromPath', () => {
    ARTICLES
      .filter((a) => a.routePattern)
      .forEach((a) => {
        const testPath = a.routePattern!
          .replace(':projectId', 'test-id')
          .replace(':pageId', 'page-id')
          .replace(':cycleId', 'cycle-id')
        const result = categoryFromPath(testPath)
        expect(result).toBe(a.category)
      })
  })
})
