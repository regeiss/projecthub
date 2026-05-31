import { create } from 'zustand'
import type { Project, Workspace } from '@/types'

interface WorkspaceState {
  workspace: Workspace | null
  currentProject: Project | null
  setWorkspace: (workspace: Workspace) => void
  setCurrentProject: (project: Project | null) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspace: null,
  currentProject: null,
  setWorkspace: (workspace) => set({ workspace }),
  setCurrentProject: (currentProject) => set({ currentProject }),
}))
