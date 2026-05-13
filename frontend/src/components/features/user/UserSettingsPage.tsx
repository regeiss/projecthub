import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Save, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { workspaceService } from '@/services/workspace.service'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import keycloak from '@/lib/keycloak'

export function UserSettingsPage() {
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()

  const [name, setName] = useState(user?.name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      workspaceService.updateMe({
        name: name.trim() || undefined,
        avatarUrl: avatarUrl.trim() || null,
      }),
    onSuccess: (updated) => {
      setUser(updated)
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const isDirty =
    name.trim() !== (user?.name ?? '') ||
    (avatarUrl.trim() || null) !== (user?.avatarUrl ?? null)

  function handleChangePassword() {
    const url = `${keycloak.authServerUrl}realms/${keycloak.realm}/account/#/security/signingin`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (!user) return null

  const roleLabel: Record<string, string> = {
    admin: 'Admin',
    member: 'Membro',
    guest: 'Visitante',
  }

  const joinedAt = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  const lastLogin = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Configurações do perfil
      </h1>

      {/* Avatar + identity */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <div className="flex items-center gap-4 mb-5">
          <Avatar src={avatarUrl || user.avatarUrl} name={user.name} size="lg" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            <Badge variant={user.role === 'admin' ? 'info' : 'default'} className="mt-1">
              {roleLabel[user.role] ?? user.role}
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            id="profile-name"
            label="Nome de exibição"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            aria-label="Nome de exibição"
          />
          <Input
            id="profile-avatar"
            label="URL do avatar"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            aria-label="URL do avatar"
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!isDirty || mutation.isPending}
            aria-label="Salvar alterações do perfil"
          >
            <Save className="h-3.5 w-3.5" />
            {mutation.isPending ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar alterações'}
          </Button>
          {mutation.isError && (
            <span className="text-xs text-red-500" role="alert">
              Erro ao salvar. Tente novamente.
            </span>
          )}
        </div>
      </section>

      {/* Account info */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <User className="h-4 w-4" />
          Informações da conta
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">E-mail</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Função</dt>
            <dd>
              <Badge variant={user.role === 'admin' ? 'info' : 'default'}>
                {roleLabel[user.role] ?? user.role}
              </Badge>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Membro desde</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{joinedAt}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Último acesso</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{lastLogin}</dd>
          </div>
        </dl>
      </section>

      {/* Security */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          Segurança
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Senha</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Gerenciada pelo Keycloak
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleChangePassword}
            aria-label="Alterar senha no Keycloak"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Alterar senha
          </Button>
        </div>
      </section>
    </div>
  )
}
