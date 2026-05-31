import { create } from 'zustand'
import type { WorkspaceMember } from '@/types'

interface AuthState {
  user: WorkspaceMember | null
  isAuthenticated: boolean
  setUser: (user: WorkspaceMember) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}))
