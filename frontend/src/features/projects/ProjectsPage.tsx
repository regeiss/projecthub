import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, LayoutGrid, List, Diamond } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useProjects, useProjectMembers } from '@/hooks/useProjects'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { AvatarGroup } from '@/components/ui/Avatar'
import { ProjectWizard } from './ProjectWizard'
import { cn } from '@/lib/utils'
import { useTheme } from '@/features/theme/ThemeContext'
import type { Project, ProjectMember } from '@/types'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<Project['status'], { label: string; className: string }> = {
  active:    { label: 'ativo',      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  paused:    { label: 'pausado',    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  completed: { label: 'concluído', className: 'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400'  },
  archived:  { label: 'arquivado', className: 'bg-gray-100  text-gray-500  dark:bg-gray-800     dark:text-gray-400'  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Project['status'] }) {
  const cfg = STATUS[status]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', cfg.className)}>
      {cfg.label}
    </span>
  )
}

function ProjectMembers({ projectId }: { projectId: string }) {
  const { data: members = [] } = useProjectMembers(projectId)
  if (members.length === 0) return null
  const mapped = (members as ProjectMember[]).map((m) => ({
    id: m.memberId,
    name: m.memberName,
    avatarUrl: m.memberAvatar,
  }))
  return <AvatarGroup members={mapped} max={3} size="xs" />
}

// ─── Grid card ────────────────────────────────────────────────────────────────

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-left w-full h-full min-h-[7rem]"
      style={{
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        boxShadow: hovered
          ? dark
            ? `0 0 0 1.5px rgb(var(--color-primary) / 0.45), 0 8px 32px rgb(var(--color-primary) / 0.28)`
            : `0 0 0 1.5px rgb(var(--color-primary) / 0.25), 0 8px 28px rgb(var(--color-primary) / 0.10)`
          : dark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
        borderColor: hovered ? `rgb(var(--color-primary) / ${dark ? '0.5' : '0.3'})` : undefined,
      }}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(to right, transparent, rgb(var(--color-primary) / ${dark ? '0.9' : '0.7'}), transparent)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />
      <div className="mb-3 flex items-start gap-2.5">
        <Diamond
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ color: project.color ?? '#6366f1' }}
          fill="currentColor"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug truncate">
            {project.name}
          </p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 truncate">
            {project.identifier}
          </p>
        </div>
      </div>

      {project.description && (
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">
          {project.description}
        </p>
      )}
      {!project.description && <div className="flex-1" />}

      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
        <StatusBadge status={project.status} />
        <ProjectMembers projectId={project.id} />
      </div>
    </button>
  )
}

// ─── New project card ─────────────────────────────────────────────────────────

function NewProjectCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 text-left w-full h-full min-h-[7rem]"
      style={{
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        boxShadow: hovered
          ? dark
            ? `0 0 0 1.5px rgb(var(--color-primary) / 0.45), 0 8px 32px rgb(var(--color-primary) / 0.28)`
            : `0 0 0 1.5px rgb(var(--color-primary) / 0.25), 0 8px 28px rgb(var(--color-primary) / 0.10)`
          : dark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
        borderColor: hovered ? `rgb(var(--color-primary) / ${dark ? '0.5' : '0.3'})` : undefined,
      }}
    >
      {/* Marching-ants border */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.2s ease' }}
      >
        <rect
          x="1" y="1"
          width="calc(100% - 2px)" height="calc(100% - 2px)"
          rx="11" ry="11"
          fill="none"
          strokeWidth="2"
          strokeDasharray="8 5"
          className="animate-border-march"
          style={{ stroke: `rgb(var(--color-primary))` }}
        />
      </svg>
      <div className="mb-3 flex items-start gap-2.5">
        <Plus
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ color: hovered ? `rgb(var(--color-primary))` : 'rgb(156 163 175)' }}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug"
            style={{ color: hovered ? `rgb(var(--color-primary))` : 'rgb(156 163 175)' }}>
            novo projeto
          </p>
          <p className="mt-0.5 text-xs"
            style={{ color: hovered ? `rgb(var(--color-primary) / 0.6)` : 'rgb(209 213 219)' }}>
            criar e configurar
          </p>
        </div>
      </div>
      <div className="flex-1" />
      <div className="flex items-center pt-2 border-t border-gray-100 dark:border-gray-800">
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600">
          criar
        </span>
      </div>
    </button>
  )
}

// ─── List row ─────────────────────────────────────────────────────────────────

function ProjectRow({ project, onClick }: { project: Project; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
    >
      <Diamond
        className="h-4 w-4 shrink-0"
        style={{ color: project.color ?? '#6366f1' }}
        fill="currentColor"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{project.name}</p>
        {project.description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{project.description}</p>
        )}
      </div>
      <span className="shrink-0 text-xs font-mono text-gray-400 dark:text-gray-500">
        {project.identifier}
      </span>
      <StatusBadge status={project.status} />
      <ProjectMembers projectId={project.id} />
    </button>
  )
}

// ─── Create wizard modal ──────────────────────────────────────────────────────

function CreateProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Novo projeto" size="lg">
      <ProjectWizard onDone={onClose} />
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}
const cardVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
}

type ViewMode = 'grid' | 'list'
type StatusFilter = Project['status'] | 'all'

export function ProjectsPage() {
  const { workspace } = useWorkspaceStore()
  const navigate = useNavigate()
  const { data: projects = [], isLoading } = useProjects(workspace?.id ?? '')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [view, setView] = useState<ViewMode>(() => {
    try { return (localStorage.getItem('projects-view') as ViewMode) ?? 'grid' } catch { return 'grid' }
  })
  const [creating, setCreating] = useState(false)

  function setViewMode(m: ViewMode) {
    setView(m)
    try { localStorage.setItem('projects-view', m) } catch {}
  }

  const filtered = projects.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    return true
  })

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 animate-page-enter">Projetos</h1>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                view === 'grid'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              grade
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                view === 'list'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              )}
            >
              <List className="h-3.5 w-3.5" />
              lista
            </button>
          </div>

          <Button onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" />
            novo
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar projetos…"
            className="h-8 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-8 pr-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Status filter chips */}
        <div className="flex items-center gap-1.5">
          {(['all', 'active', 'paused', 'completed', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-full border px-3 py-0.5 text-xs font-medium transition-colors',
                statusFilter === s
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600',
              )}
            >
              {s === 'all' ? 'todos' : STATUS[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div
          className={cn(
            view === 'grid'
              ? 'grid grid-cols-2 gap-4 sm:grid-cols-3'
              : 'flex flex-col gap-1',
          )}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 h-36"
            />
          ))}
        </div>
      ) : view === 'grid' ? (
        <motion.div
          className="grid grid-cols-2 gap-4 sm:grid-cols-3"
          variants={gridVariants}
          initial="hidden"
          animate="visible"
        >
          {filtered.map((p) => (
            <motion.div key={p.id} variants={cardVariants} className="flex flex-col">
              <ProjectCard
                project={p}
                onClick={() => navigate(`/projects/${p.id}/board`)}
              />
            </motion.div>
          ))}
          <motion.div variants={cardVariants} className="flex flex-col">
            <NewProjectCard onClick={() => setCreating(true)} />
          </motion.div>
        </motion.div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
              Nenhum projeto encontrado
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  onClick={() => navigate(`/projects/${p.id}/board`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <CreateProjectModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
