import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProject, useProjectMembers, useProjectStates, useProjectLabels, useAddProjectMember, useRemoveProjectMember } from '@/hooks/useProjects'
import { useWorkspaceMembers } from '@/hooks/useWorkspace'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'

export function ProjectSettings() {
  const { projectId = '' } = useParams()
  const { data: project, isLoading } = useProject(projectId)
  const { data: members = [] } = useProjectMembers(projectId)
  const { data: states = [] } = useProjectStates(projectId)
  const { data: labels = [] } = useProjectLabels(projectId)
  const currentWorkspace = useWorkspaceStore((s) => s.workspace)
  const { data: wsMembers = [] } = useWorkspaceMembers(currentWorkspace?.slug ?? '')
  const addMember = useAddProjectMember(projectId)
  const removeMember = useRemoveProjectMember(projectId)

  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedRole, setSelectedRole] = useState('member')

  const memberIds = new Set(members.map((m) => m.memberId))
  const availableMembers = wsMembers.filter((wm) => !memberIds.has(wm.id))

  if (isLoading) return <PageSpinner />
  if (!project) return null

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Configurações — {project.name}
      </h1>

      {/* States */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Estados ({states.length})
        </h2>
        <div className="space-y-1.5">
          {states.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{s.name}</span>
              <Badge>{s.category}</Badge>
            </div>
          ))}
        </div>
      </section>

      {/* Labels */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Etiquetas ({labels.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {labels.map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                backgroundColor: l.color + '20',
                color: l.color,
                border: `1px solid ${l.color}40`,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: l.color }}
              />
              {l.name}
            </span>
          ))}
        </div>
      </section>

      {/* Members */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Membros ({members.length})
        </h2>

        {/* Add member form */}
        {availableMembers.length === 0 && wsMembers.length > 0 && (
          <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
            Todos os membros do workspace já estão neste projeto. Novos usuários aparecem aqui após fazer login pelo Keycloak.
          </p>
        )}
        {availableMembers.length > 0 && (
          <div className="mb-4 flex gap-2">
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Selecionar membro...</option>
              {availableMembers.map((wm) => (
                <option key={wm.id} value={wm.id}>
                  {wm.name} ({wm.email})
                </option>
              ))}
            </select>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="member">Membro</option>
              <option value="admin">Admin</option>
              <option value="viewer">Visualizador</option>
            </select>
            <Button
              size="sm"
              disabled={!selectedMemberId || addMember.isPending}
              onClick={() => {
                if (!selectedMemberId) return
                addMember.mutate(
                  { memberId: selectedMemberId, role: selectedRole },
                  {
                    onSuccess: () => {
                      setSelectedMemberId('')
                      setSelectedRole('member')
                    },
                  },
                )
              }}
            >
              Adicionar
            </Button>
          </div>
        )}

        <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={m.memberAvatar} name={m.memberName} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.memberName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{m.memberEmail}</p>
              </div>
              <Badge variant={m.role === 'admin' ? 'info' : 'default'}>
                {m.role}
              </Badge>
              <button
                className="ml-2 text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                disabled={removeMember.isPending}
                onClick={() => removeMember.mutate(m.memberId)}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
