import { useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useWorkspaceMembers } from '@/hooks/useWorkspace'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export function WorkspaceSettings() {
  const { workspace } = useWorkspaceStore()
  const { data: members = [] } = useWorkspaceMembers(workspace?.slug ?? '')

  if (!workspace) return null

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Configurações do Workspace
      </h1>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Informações</h2>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{workspace.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{workspace.slug}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Membros ({members.length})
        </h2>
        <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={m.avatarUrl} name={m.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
              </div>
              <Badge
                variant={m.role === 'admin' ? 'info' : 'default'}
              >
                {m.role}
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
