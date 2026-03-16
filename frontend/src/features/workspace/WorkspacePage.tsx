import { useNavigate } from 'react-router-dom'
import { Plus, FolderKanban, Users, BarChart3 } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useAuthStore } from '@/stores/authStore'
import { useProjects } from '@/hooks/useProjects'
import { useWorkspaceMembers } from '@/hooks/useWorkspace'
import { usePortfolios } from '@/hooks/usePortfolio'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  )
}

export function WorkspacePage() {
  const { workspace } = useWorkspaceStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { data: projects = [] } = useProjects(workspace?.id ?? '')
  const { data: members = [] } = useWorkspaceMembers(workspace?.slug ?? '')
  const { data: portfolios = [] } = usePortfolios(workspace?.id)

  if (!workspace) return null

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Bem-vindo, {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {workspace.name} — workspace ProjectHub
          </p>
        </div>
        <Button onClick={() => navigate('/projects')}>
          <Plus className="h-3.5 w-3.5" />
          Novo projeto
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <StatCard icon={FolderKanban} label="Projetos" value={projects.length} />
        <StatCard icon={Users} label="Membros" value={members.length} />
        <StatCard
          icon={BarChart3}
          label="Portfolios"
          value={portfolios.length}
        />
      </div>

      {/* Portfolios */}
      {portfolios.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Portfolios</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {portfolios.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate('/portfolio')}
                className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-left transition-shadow hover:shadow-sm"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-indigo-600 text-xs font-bold text-white">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {p.projectCount} projeto{p.projectCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent projects */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Projetos recentes</h2>
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
            <FolderKanban className="mx-auto mb-2 h-8 w-8 text-gray-400 dark:text-gray-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum projeto ainda</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => navigate('/projects')}
            >
              Criar primeiro projeto
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.slice(0, 6).map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}/board`)}
                className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-left transition-shadow hover:shadow-sm"
              >
                <div
                  className="mt-0.5 h-8 w-8 shrink-0 rounded flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: p.color ?? '#6366f1' }}
                >
                  {p.identifier}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Atualizado {formatDate(p.updatedAt)}
                  </p>
                </div>
                <Badge
                  variant={p.network === 'secret' ? 'outline' : 'default'}
                >
                  {p.network === 'secret' ? 'Privado' : 'Público'}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
