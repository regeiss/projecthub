import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Check } from 'lucide-react'
import { useCycles, useCreateCycle } from '@/hooks/useCycles'
import { Button } from '@/components/ui/Button'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { PageSpinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import type { Cycle } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysRemaining(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000)
}

function progress(c: Cycle): number {
  if (!c.issueCount || c.issueCount === 0) return 0
  return Math.round(((c.completedCount ?? 0) / c.issueCount) * 100)
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ label, count }: { label: string; count: number }) {
  if (count === 0) return null
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {label}
      </span>
      <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
    </div>
  )
}

// ─── Active cycle row ─────────────────────────────────────────────────────────

function ActiveRow({ cycle, onClick }: { cycle: Cycle; onClick: () => void }) {
  const pct = progress(cycle)
  const days = daysRemaining(cycle.endDate)

  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-left hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {cycle.name}
        </span>

        {/* Progress bar */}
        <div className="h-2 w-40 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Badge */}
        <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-white">
          ao vivo
        </span>
      </div>

      <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
        {days > 0 ? `${days}d restantes` : 'Encerrado'} · {cycle.completedCount ?? 0}/{cycle.issueCount ?? 0}
      </p>
    </button>
  )
}

// ─── Upcoming cycle row ───────────────────────────────────────────────────────

function UpcomingRow({ cycle, onClick }: { cycle: Cycle; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-left hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
        {cycle.name}
      </span>
      <span className="shrink-0 rounded-full border border-gray-300 dark:border-gray-600 px-2.5 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
        em breve
      </span>
    </button>
  )
}

// ─── Completed cycle row ──────────────────────────────────────────────────────

function CompletedRow({ cycle, onClick }: { cycle: Cycle; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-all"
    >
      <span className="min-w-0 flex-1 truncate text-sm text-gray-400 dark:text-gray-500 line-through">
        {cycle.name}
      </span>
      <span className="shrink-0 flex items-center gap-1 rounded-full border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-[11px] text-gray-400 dark:text-gray-500">
        <Check className="h-3 w-3" />
      </span>
    </button>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <button
      onClick={onNew}
      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 py-10 text-gray-400 dark:text-gray-500 hover:border-primary/40 hover:text-primary transition-colors"
    >
      <Plus className="h-4 w-4" />
      <span className="text-sm">Criar primeiro ciclo</span>
    </button>
  )
}

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateCycleModal({
  open,
  onClose,
  projectId,
}: {
  open: boolean
  onClose: () => void
  projectId: string
}) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const create = useCreateCycle()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    create.mutate(
      { projectId, data: { name, startDate, endDate, status: 'draft' } },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo ciclo" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Sprint 1"
          required
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Início"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <Input
            label="Fim"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={create.isPending}>Criar</Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CyclesPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const { data: cycles = [], isLoading } = useCycles(projectId)
  const [creating, setCreating] = useState(false)

  if (isLoading) return <PageSpinner />

  const active    = cycles.filter((c) => c.status === 'active')
  const upcoming  = cycles.filter((c) => c.status === 'draft')
  const completed = cycles.filter((c) => c.status === 'completed')
  const isEmpty   = cycles.length === 0

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ciclos</h2>
        <button
          onClick={() => setCreating(true)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          aria-label="Novo ciclo"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {isEmpty ? (
        <EmptyState onNew={() => setCreating(true)} />
      ) : (
        <div className="space-y-5">
          {/* Ativo */}
          {active.length > 0 && (
            <section>
              <SectionLabel label="Ativo" count={active.length} />
              <div className="space-y-2">
                {active.map((c) => (
                  <ActiveRow key={c.id} cycle={c} onClick={() => navigate(c.id)} />
                ))}
              </div>
            </section>
          )}

          {/* Em breve */}
          {upcoming.length > 0 && (
            <section>
              <SectionLabel label="Em breve" count={upcoming.length} />
              <div className="space-y-2">
                {upcoming.map((c) => (
                  <UpcomingRow key={c.id} cycle={c} onClick={() => navigate(c.id)} />
                ))}
              </div>
            </section>
          )}

          {/* Concluídos */}
          {completed.length > 0 && (
            <section>
              <SectionLabel label="Concluídos" count={completed.length} />
              <div className="space-y-2">
                {completed.map((c) => (
                  <CompletedRow key={c.id} cycle={c} onClick={() => navigate(c.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <CreateCycleModal
        open={creating}
        onClose={() => setCreating(false)}
        projectId={projectId}
      />
    </div>
  )
}
