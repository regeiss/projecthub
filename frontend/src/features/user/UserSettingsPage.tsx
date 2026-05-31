import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, User, Bell, Palette, Puzzle, KeyRound } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { workspaceService } from '@/services/workspace.service'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ThemeToggle } from '@/features/theme/ThemeToggle'
import { ColorThemeSelector } from '@/features/theme/ColorThemeSelector'
import { cn } from '@/lib/utils'
import keycloak from '@/lib/keycloak'

// ─── Shared field component ───────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60'

// ─── Tab: Perfil ──────────────────────────────────────────────────────────────

function TabPerfil() {
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [name, setName] = useState(user?.name ?? '')
  const [saved, setSaved] = useState(false)

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const mutation = useMutation({
    mutationFn: () => workspaceService.updateMe({ name: name.trim() || undefined }),
    onSuccess: (updated) => {
      setUser(updated)
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const isDirty = name.trim() !== (user?.name ?? '')

  if (!user) return null

  return (
    <div className="space-y-6">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <Avatar src={user.avatarUrl} name={user.name} size="lg" />
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {user.role === 'admin' ? 'Administrador' : user.role === 'member' ? 'Membro' : 'Visitante'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <Field label="Nome">
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
          />
        </Field>

        <Field label="Email">
          <input
            className={inputCls}
            value={user.email}
            disabled
            readOnly
          />
        </Field>

        <Field label="Fuso horário">
          <input
            className={inputCls}
            value={timezone}
            disabled
            readOnly
          />
        </Field>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
        {mutation.isError && (
          <span className="text-xs text-red-500">Erro ao salvar. Tente novamente.</span>
        )}
        <Button
          size="sm"
          onClick={() => mutation.mutate()}
          disabled={!isDirty || mutation.isPending}
        >
          {mutation.isPending ? 'Salvando…' : saved ? 'Salvo!' : 'salvar'}
        </Button>
      </div>
    </div>
  )
}

// ─── Tab: Conta ───────────────────────────────────────────────────────────────

function TabConta() {
  const { user } = useAuthStore()
  if (!user) return null

  const roleLabel: Record<string, string> = { admin: 'Admin', member: 'Membro', guest: 'Visitante' }

  const joinedAt = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  const lastLogin = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—'

  function handleChangePassword() {
    const url = `${keycloak.authServerUrl}realms/${keycloak.realm}/account/#/security/signingin`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Field label="Email">
          <input className={inputCls} value={user.email} disabled readOnly />
        </Field>
        <Field label="Função">
          <div className="pt-1">
            <Badge variant={user.role === 'admin' ? 'info' : 'default'}>
              {roleLabel[user.role] ?? user.role}
            </Badge>
          </div>
        </Field>
        <Field label="Membro desde">
          <input className={inputCls} value={joinedAt} disabled readOnly />
        </Field>
        <Field label="Último acesso">
          <input className={inputCls} value={lastLogin} disabled readOnly />
        </Field>
      </div>

      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Senha</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Gerenciada pelo Keycloak</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleChangePassword}>
          <KeyRound className="h-3.5 w-3.5" />
          Alterar senha
        </Button>
      </div>
    </div>
  )
}

// ─── Tab: Notificações ────────────────────────────────────────────────────────

function TabNotificacoes() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Preferências de notificação serão configuradas aqui em breve.
      </p>
    </div>
  )
}

// ─── Tab: Aparência ───────────────────────────────────────────────────────────

function TabAparencia() {
  return (
    <div className="space-y-6">
      <Field label="Tema de cores">
        <div className="pt-1">
          <ColorThemeSelector />
        </div>
      </Field>
      <Field label="Modo claro / escuro">
        <div className="pt-1">
          <ThemeToggle />
        </div>
      </Field>
    </div>
  )
}

// ─── Tab: Apps conectados ─────────────────────────────────────────────────────

function TabApps() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Keycloak SSO</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Provedor de identidade</p>
        </div>
        <Badge variant="success">Conectado</Badge>
      </div>
    </div>
  )
}

// ─── Nav items ────────────────────────────────────────────────────────────────

type Tab = 'perfil' | 'conta' | 'notificacoes' | 'aparencia' | 'apps'

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'perfil',       label: 'Perfil',           icon: User    },
  { id: 'conta',        label: 'Conta',            icon: KeyRound },
  { id: 'notificacoes', label: 'Notificações',     icon: Bell    },
  { id: 'aparencia',    label: 'Aparência',        icon: Palette },
  { id: 'apps',         label: 'Apps conectados',  icon: Puzzle  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export function UserSettingsPage() {
  const [tab, setTab] = useState<Tab>('perfil')

  const content: Record<Tab, React.ReactNode> = {
    perfil:       <TabPerfil />,
    conta:        <TabConta />,
    notificacoes: <TabNotificacoes />,
    aparencia:    <TabAparencia />,
    apps:         <TabApps />,
  }

  return (
    <div className="flex h-full">
      {/* Left nav */}
      <aside className="w-52 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-5 px-3">
        <div className="mb-4 flex items-center gap-2 px-2">
          <Settings className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Settings</span>
        </div>

        <nav className="space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors text-left',
                tab === id
                  ? 'bg-primary text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100',
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-lg py-8 px-8">
          {content[tab]}
        </div>
      </main>
    </div>
  )
}
