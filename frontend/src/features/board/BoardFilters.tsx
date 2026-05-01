import { useState } from 'react'
import { Plus, ChevronDown, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useCreateIssue } from '@/hooks/useIssues'
import { useProjectStates, useProjectMembers } from '@/hooks/useProjects'
import { useCycles } from '@/hooks/useCycles'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@/components/ui/Dropdown'
import { cn } from '@/lib/utils'
import type { IssueFilters, Priority, IssueType } from '@/types'

// ---------------------------------------------------------------------------
// CreateIssueModal
// ---------------------------------------------------------------------------
function CreateIssueModal({
  open,
  onClose,
  projectId,
}: {
  open: boolean
  onClose: () => void
  projectId: string
}) {
  const [title, setTitle] = useState('')
  const { data: states = [] } = useProjectStates(projectId)
  const [stateId, setStateId] = useState('')
  const [continueAdding, setContinueAdding] = useState(false)
  const create = useCreateIssue()

  const defaultState = states.find((s) => s.category === 'backlog') ?? states[0]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    create.mutate(
      {
        projectId,
        data: {
          title,
          stateId: stateId || defaultState?.id,
          priority: 'none',
        },
      },
      {
        onSuccess: () => {
          if (continueAdding) {
            setTitle('')
          } else {
            onClose()
          }
        },
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova issue" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="O que precisa ser feito?"
          required
          autoFocus
        />
        {states.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
            <select
              value={stateId || defaultState?.id}
              onChange={(e) => setStateId(e.target.value)}
              className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <ModalFooter>
          <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={continueAdding}
              onChange={(e) => setContinueAdding(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
            Continuar adicionando
          </label>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={create.isPending}>Criar</Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// FilterPill — generic single-select filter dropdown
// ---------------------------------------------------------------------------
interface FilterOption {
  value: string
  label: string
  icon?: React.ReactNode
}

function FilterPill({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | undefined
  options: FilterOption[]
  onChange: (value: string | undefined) => void
}) {
  const selected = options.find((o) => o.value === value)
  const isActive = !!value

  return (
    <div
      className={cn(
        'flex h-7 items-center rounded-md border text-xs font-medium transition-colors',
        isActive
          ? 'border-primary bg-primary-light dark:bg-primary/20 text-primary-text dark:text-primary'
          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400',
      )}
    >
      <Dropdown>
        <DropdownTrigger asChild>
          <button
            className={cn(
              'flex h-full items-center gap-1 px-2 hover:opacity-80 transition-opacity',
              isActive ? 'pr-1.5' : 'pr-2',
            )}
          >
            {selected?.icon && <span className="shrink-0">{selected.icon}</span>}
            <span>{selected ? selected.label : label}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
          </button>
        </DropdownTrigger>
        <DropdownContent>
          {options.map((opt) => (
            <DropdownItem
              key={opt.value}
              onSelect={() => onChange(value === opt.value ? undefined : opt.value)}
            >
              {opt.icon && <span className="shrink-0">{opt.icon}</span>}
              {opt.label}
              {value === opt.value && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
            </DropdownItem>
          ))}
        </DropdownContent>
      </Dropdown>

      {isActive && (
        <button
          onClick={() => onChange(undefined)}
          className="flex h-full items-center px-1.5 border-l border-primary/30 hover:bg-primary/10 rounded-r-md transition-colors"
          aria-label={`Limpar filtro ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Priority options
// ---------------------------------------------------------------------------
const PRIORITY_DOT: Record<string, string> = {
  urgent: '#ef4444',
  high:   '#f97316',
  medium: '#eab308',
  low:    '#60a5fa',
  none:   '#9ca3af',
}

const PRIORITY_OPTIONS: FilterOption[] = [
  { value: 'urgent', label: 'Urgente', icon: <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_DOT.urgent }} /> },
  { value: 'high',   label: 'Alta',    icon: <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_DOT.high }} /> },
  { value: 'medium', label: 'Média',   icon: <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_DOT.medium }} /> },
  { value: 'low',    label: 'Baixa',   icon: <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_DOT.low }} /> },
  { value: 'none',   label: 'Nenhuma', icon: <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_DOT.none }} /> },
]

const TYPE_OPTIONS: FilterOption[] = [
  { value: 'task',  label: 'Tarefa' },
  { value: 'bug',   label: 'Bug' },
  { value: 'story', label: 'História' },
]

// ---------------------------------------------------------------------------
// BoardFilters
// ---------------------------------------------------------------------------
export interface BoardFiltersProps {
  projectId: string
  filters: IssueFilters
  onFiltersChange: (filters: IssueFilters) => void
}

export function BoardFilters({ projectId, filters, onFiltersChange }: BoardFiltersProps) {
  const [creating, setCreating] = useState(false)
  const { data: members = [] } = useProjectMembers(projectId)
  const { data: cycles = [] } = useCycles(projectId)

  const memberOptions: FilterOption[] = members.map((m) => ({
    value: m.memberId,
    label: m.memberName,
    icon: <Avatar src={m.memberAvatar} name={m.memberName} size="xs" />,
  }))

  const cycleOptions: FilterOption[] = cycles.map((c) => ({
    value: c.id,
    label: c.name,
  }))

  function set(key: keyof IssueFilters, value: string | undefined) {
    onFiltersChange({ ...filters, [key]: value })
  }

  const hasFilters = !!(filters.assigneeId || filters.cycleId || filters.priority || filters.type)

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setCreating(true)}>
        <Plus className="h-3.5 w-3.5" />
        Issue
      </Button>

      <div className="ml-2 h-4 w-px bg-gray-200 dark:bg-gray-700" />

      <div className="flex items-center gap-1.5">
        <FilterPill
          label="Responsável"
          value={filters.assigneeId}
          options={memberOptions}
          onChange={(v) => set('assigneeId', v)}
        />
        <FilterPill
          label="Sprint"
          value={filters.cycleId}
          options={cycleOptions}
          onChange={(v) => set('cycleId', v)}
        />
        <FilterPill
          label="Prioridade"
          value={filters.priority}
          options={PRIORITY_OPTIONS}
          onChange={(v) => set('priority', v as Priority | undefined)}
        />
        <FilterPill
          label="Tipo"
          value={filters.type}
          options={TYPE_OPTIONS}
          onChange={(v) => set('type', v as IssueType | undefined)}
        />

        {hasFilters && (
          <button
            onClick={() => onFiltersChange({})}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-3 w-3" />
            Limpar
          </button>
        )}
      </div>

      <CreateIssueModal
        open={creating}
        onClose={() => setCreating(false)}
        projectId={projectId}
      />
    </>
  )
}
