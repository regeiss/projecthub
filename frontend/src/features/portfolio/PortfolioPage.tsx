import { useState } from 'react'
import { Plus, LayoutDashboard, Map, Target, Settings, Trash2 } from 'lucide-react'
import {
  usePortfolios,
  useCreatePortfolio,
  useUpdatePortfolio,
  useDeletePortfolio,
} from '@/hooks/usePortfolio'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { PageSpinner } from '@/components/ui/Spinner'
import { ExecutiveDashboard } from './ExecutiveDashboard'
import { RoadmapView } from './RoadmapView'
import { OkrPanel } from './OkrPanel'
import type { Portfolio } from '@/types'

type View = 'dashboard' | 'roadmap' | 'okr'

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreatePortfolioModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const create = useCreatePortfolio()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    create.mutate(
      { name },
      {
        onSuccess: onClose,
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            'Erro ao criar portfolio. Tente novamente.'
          setError(msg)
        },
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo portfolio" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Projetos Estratégicos 2026"
          required
          autoFocus
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={create.isPending}>
            Criar
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditPortfolioModal({
  open,
  onClose,
  portfolio,
}: {
  open: boolean
  onClose: () => void
  portfolio: Portfolio
}) {
  const [name, setName] = useState(portfolio.name)
  const update = useUpdatePortfolio()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    update.mutate({ id: portfolio.id, data: { name } }, { onSuccess: onClose })
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar portfolio" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={update.isPending}>
            Salvar
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const viewTabs = [
  { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'roadmap' as View, label: 'Roadmap', icon: Map },
  { id: 'okr' as View, label: 'OKR', icon: Target },
]

export function PortfolioPage() {
  const { data: portfolios = [], isLoading } = usePortfolios()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const [selectedId, setSelectedId] = useState<string>('')
  const [view, setView] = useState<View>('dashboard')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const remove = useDeletePortfolio()

  const portfolio = portfolios.find((p) => p.id === selectedId) ?? portfolios[0]

  if (isLoading) return <PageSpinner />

  function handleDelete() {
    if (!portfolio) return
    if (!confirm(`Deletar portfolio "${portfolio.name}"? Esta ação não pode ser desfeita.`)) return
    remove.mutate(portfolio.id, {
      onSuccess: () => setSelectedId(''),
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2">
        {/* Portfolio selector */}
        {portfolios.length > 0 && (
          <select
            value={portfolio?.id ?? ''}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {/* View tabs */}
        <div className="flex rounded-md border border-gray-200 dark:border-gray-700 p-0.5">
          {viewTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                view === id
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {isAdmin && portfolio && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="rounded p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-400"
              title="Editar portfolio"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="rounded p-1.5 text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
              title="Deletar portfolio"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="ml-auto">
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5" />
              Novo portfolio
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!portfolio ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
            <LayoutDashboard className="h-10 w-10" />
            {isAdmin ? (
              <>
                <p className="text-sm">Crie seu primeiro portfolio</p>
                <Button onClick={() => setCreating(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Novo portfolio
                </Button>
              </>
            ) : (
              <p className="text-sm">Nenhum portfolio disponível</p>
            )}
          </div>
        ) : view === 'dashboard' ? (
          <ExecutiveDashboard portfolioId={portfolio.id} />
        ) : view === 'roadmap' ? (
          <RoadmapView portfolioId={portfolio.id} />
        ) : (
          <OkrPanel portfolioId={portfolio.id} />
        )}
      </div>

      <CreatePortfolioModal open={creating} onClose={() => setCreating(false)} />
      {portfolio && editing && (
        <EditPortfolioModal
          open
          onClose={() => setEditing(false)}
          portfolio={portfolio}
        />
      )}
    </div>
  )
}
