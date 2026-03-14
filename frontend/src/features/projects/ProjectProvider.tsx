import { useEffect } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useProject } from '@/hooks/useProjects'
import { PageSpinner } from '@/components/ui/Spinner'

/**
 * Sets currentProject in the global store whenever the projectId URL param changes.
 * Rendered as a layout route wrapping all /projects/:projectId/* routes.
 */
export function ProjectProvider() {
  const { projectId = '' } = useParams()
  const { setCurrentProject } = useWorkspaceStore()
  const { data: project, isLoading } = useProject(projectId)

  useEffect(() => {
    setCurrentProject(project ?? null)
    return () => setCurrentProject(null)
  }, [project, setCurrentProject])

  if (isLoading) return <PageSpinner />

  return <Outlet />
}
