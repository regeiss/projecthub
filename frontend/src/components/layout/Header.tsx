import { useNavigate } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/Dropdown'
import { ProjectNav } from './ProjectNav'
import { ThemeToggle } from '@/features/theme/ThemeToggle'
import keycloak from '@/lib/keycloak'

export function Header() {
  const { user, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const { currentProject } = useWorkspaceStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    keycloak.logout({ redirectUri: window.location.origin + '/' })
  }

  return (
    <header className="flex h-11 shrink-0 items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4">
      {/* Project navigation tabs or app title */}
      <div className="flex flex-1 items-center">
        {currentProject ? (
          <ProjectNav project={currentProject} />
        ) : (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ProjectHub</span>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <Tooltip content="Pesquisar" side="bottom">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Pesquisar"
          >
            <Search className="h-4 w-4" />
          </button>
        </Tooltip>

        {/* Notifications bell */}
        <Tooltip content="Notificações" side="bottom">
          <button
            className="relative flex h-7 w-7 items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Notificações"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </Tooltip>

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
