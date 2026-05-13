import { useNavigate } from 'react-router-dom'
import { GlobalSearch } from '@/features/search'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Avatar } from '@/components/ui/Avatar'
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/Dropdown'
import { ProjectNav } from './ProjectNav'
import { ThemeToggle } from '@/features/theme/ThemeToggle'
import { ColorThemeSelector } from '@/features/theme/ColorThemeSelector'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import keycloak from '@/lib/keycloak'

export function Header() {
  const { user, logout } = useAuthStore()
  const { currentProject, workspace: currentWorkspace } = useWorkspaceStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    keycloak.logout({ redirectUri: window.location.origin + '/' })
  }

  return (
    <header className="flex h-11 shrink-0 items-center border-b border-gray-200 dark:border-gray-700 bg-surface dark:bg-gray-900 px-4">
      {/* Project navigation tabs or app title */}
      <div className="flex flex-1 items-center">
        {currentProject ? (
          <ProjectNav project={currentProject} />
        ) : (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentWorkspace?.name ?? 'ProjectHub'}
          </span>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        <ColorThemeSelector />
        <ThemeToggle />

        <GlobalSearch />

        {/* Notifications bell — popover with panel + "Ver todas" link */}
        <NotificationBell />

        {/* User menu */}
        {user && (
          <Dropdown>
            <DropdownTrigger asChild>
              <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-gray-900">
                <Avatar src={user.avatarUrl} name={user.name} size="sm" />
              </button>
            </DropdownTrigger>
            <DropdownContent align="end">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
              <DropdownSeparator />
              <DropdownItem onSelect={() => navigate('/settings')}>
                Configurações
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem danger onSelect={handleLogout}>
                Sair
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        )}
      </div>
    </header>
  )
}
