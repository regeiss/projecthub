export interface Workspace {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkspaceMember {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  role: 'admin' | 'member' | 'guest'
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface KeycloakUser {
  sub: string
  email: string
  name: string
}
