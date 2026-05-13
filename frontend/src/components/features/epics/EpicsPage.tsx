import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useEpics, useDeleteIssue } from '@/hooks/useIssues'
import { PageSpinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { IssueForm } from '@/features/issues/IssueForm'
import { EpicDetail } from './EpicDetail'
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import type { Issue } from '@/types'

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {completed} de {total}
      </span>
    </div>
  )
}

interface EpicCardProps {
  epic: Issue
  projectId: string
  onEdit: (epic: Issue) => void
  onDelete: (epicId: string) => void
}

function EpicCard({ epic, projectId, onEdit, onDelete }: EpicCardProps) {
  const [expanded, setExpanded] = useState(false)
  const color = epic.color ?? '#6366f1'

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="h-5 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
        )}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            <span className="mr-1.5 font-mono text-xs text-gray-400 dark:text-gray-500">
              #{epic.sequenceId}
            </span>
            {epic.title}
          </p>
        </div>
        <ProgressBar completed={epic.completedCount} total={epic.childCount} />
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: (epic.stateColor ?? '#9ca3af') + '22',
            color: epic.stateColor ?? '#9ca3af',
          }}
        >
          {epic.stateName ?? '—'}
        </span>

        {/* Action buttons — stop propagation so they don't toggle expand */}
        <div
          className="ml-1 flex shrink-0 items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onEdit(epic)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title="Editar épico"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(epic.id)}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            title="Excluir épico"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {expanded && <EpicDetail epicId={epic.id} projectId={projectId} />}
    </div>
  )
}

export function EpicsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: epics = [], isLoading } = useEpics(projectId)
  const deleteIssue = useDeleteIssue()

  const [creating, setCreating] = useState(false)
  const [editingEpic, setEditingEpic] = useState<Issue | null>(null)
  const [deletingEpicId, setDeletingEpicId] = useState<string | null>(null)

  function handleConfirmDelete() {
    if (!deletingEpicId || !projectId) return
    deleteIssue.mutate(
      { projectId, issueId: deletingEpicId },
      { onSuccess: () => setDeletingEpicId(null) },
    )
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Épicos</h1>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nova épico
        </Button>
      </div>

      {epics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center text-sm text-gray-400 dark:text-gray-500">
          Nenhuma épico criada.{' '}
          <button
            onClick={() => setCreating(true)}
            className="text-indigo-600 hover:underline"
          >
            Criar a primeira.
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {epics.map((epic) => (
            <EpicCard
              key={epic.id}
              epic={epic}
              projectId={projectId!}
              onEdit={setEditingEpic}
              onDelete={setDeletingEpicId}
            />
          ))}
        </div>
      )}

      {/* Create form */}
      {creating && projectId && (
        <IssueForm
          projectId={projectId}
          open={creating}
          onClose={() => setCreating(false)}
          typeOverride="epic"
        />
      )}

      {/* Edit form */}
      {editingEpic && projectId && (
        <IssueForm
          projectId={projectId}
          open={!!editingEpic}
          onClose={() => setEditingEpic(null)}
          issue={editingEpic}
          typeOverride="epic"
        />
      )}

      {/* Delete confirmation */}
      <Modal
        open={!!deletingEpicId}
        onClose={() => setDeletingEpicId(null)}
        title="Excluir épico"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir este épico? As issues vinculadas permanecerão, mas
          perderão a associação com o épico.
        </p>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeletingEpicId(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={deleteIssue.isPending}
            onClick={handleConfirmDelete}
          >
            Excluir
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
