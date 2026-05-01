import { Route, Routes, Navigate } from 'react-router-dom'
import { TooltipProvider } from './components/ui/Tooltip'
import { AuthProvider } from './features/auth/AuthProvider'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { WorkspacePage } from './features/workspace/WorkspacePage'
import { ProjectsPage } from './features/projects/ProjectsPage'
import { ProjectProvider } from './features/projects/ProjectProvider'
import { BoardPage } from './features/board/BoardPage'
import { BacklogPage } from './features/backlog/BacklogPage'
import { CyclesPage } from './features/cycles/CyclesPage'
import { CycleDetail } from './features/cycles/CycleDetail'
import { IssueDetailPage } from './features/issues/IssueDetailPage'
import { ProjectReportsPage } from './features/projects/ProjectReportsPage'
import { WikiLayout } from './features/wiki/WikiLayout'
import { WikiPage } from './features/wiki/WikiPage'
import { GanttPage } from './features/gantt/GanttPage'
import { PortfolioPage } from './features/portfolio/PortfolioPage'
import { ProjectSettings } from './features/projects/ProjectSettings'
import { WorkspaceSettings } from './features/workspace/WorkspaceSettings'
import { MilestonesPage } from './features/milestones/MilestonesPage'
import { RisksPage } from './features/risks/RisksPage'
import { ModulesPage } from './features/modules/ModulesPage'
import { EpicsPage } from './features/epics/EpicsPage'
import { ResourcesPage } from './features/resources/ResourcesPage'
import { ProjectResourcesPage } from './features/resources/ProjectResourcesPage'

export default function App() {
  return (
    <TooltipProvider>
    <AuthProvider>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<WorkspacePage />} />
            <Route path="/projects" element={<ProjectsPage />} />

            {/* ProjectProvider sets currentProject in the global store */}
            <Route path="/projects/:projectId" element={<ProjectProvider />}>
              <Route path="board" element={<BoardPage />} />
              <Route path="backlog" element={<BacklogPage />} />
              <Route path="epics" element={<EpicsPage />} />
              <Route path="cycles" element={<CyclesPage />} />
              <Route path="cycles/:cycleId" element={<CycleDetail />} />
              <Route path="milestones" element={<MilestonesPage />} />
              <Route path="reports" element={<ProjectReportsPage />} />
              <Route path="risks" element={<RisksPage />} />
              <Route path="modules" element={<ModulesPage />} />
              <Route path="gantt" element={<GanttPage />} />
              <Route path="resources" element={<ProjectResourcesPage />} />
              <Route path="issues/:issueId" element={<IssueDetailPage />} />
              <Route path="settings" element={<ProjectSettings />} />
              <Route path="wiki" element={<WikiLayout />}>
                <Route index element={<WikiPage />} />
                <Route path=":pageId" element={<WikiPage />} />
              </Route>
            </Route>

            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/workspace/resources" element={<ResourcesPage />} />
            <Route path="/workspace/settings" element={<WorkspaceSettings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
    </TooltipProvider>
  )
}