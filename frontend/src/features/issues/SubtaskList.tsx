import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSubtasks, useCreateSubtask } from '@/hooks/useIssues'
import { IssueForm } from './IssueForm'

interface SubtaskListProps {
  projectId: string
  issueId: string
}

export function SubtaskList({ projectId, issueId }: SubtaskListProps) {
  const { data: subtasks = [], isLoading, isError } = useSubtasks(issueId)
  useCreateSubtask()
  const [showForm, setShowForm] = useState(false)

  if (isLoading) {
    return <div className="text-sm text-gray-400">Carregando...</div>
  }

  if (isError) {
    return <p className="text-sm text-gray-400">Não foi possível carregar subtarefas.</p>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">
          Subtarefas ({subtasks.length})
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-blue-600 hover:text-blue-700"
          aria-label="Adicionar subtarefa"
        >
          + Adicionar
        </button>
      </div>

      {/* Form (when showForm is true) */}
      {showForm && (
        <IssueForm
          projectId={projectId}
          parentIssueId={issueId}
          typeOverride="subtask"
          open={showForm}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Empty state */}
      {subtasks.length === 0 && !showForm && (
        <p className="text-sm text-gray-400">Sem subtarefas.</p>
      )}

      {/* Subtask rows */}
      {subtasks.map((subtask) => (
        <div key={subtask.id} className="flex items-center gap-2 py-1">
          {/* State color dot */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: subtask.stateColor ?? '#9ca3af' }}
            aria-label={`Estado: ${subtask.stateCategory ?? 'desconhecido'}`}
          />
          {/* Sequence + title link */}
          <Link
            to={`/projects/${projectId}/issues/${subtask.id}`}
            className="text-sm text-gray-700 hover:underline flex-1 min-w-0 truncate"
            aria-label={`Subtarefa #${subtask.sequenceId}: ${subtask.title}`}
          >
            #{subtask.sequenceId} {subtask.title}
          </Link>
          {/* Priority badge */}
          {subtask.priority && subtask.priority !== 'none' && (
            <span className="text-xs text-gray-400 flex-shrink-0">{subtask.priority}</span>
          )}
        </div>
      ))}

      {/* TODO: add pagination if > 50 subtasks becomes common */}
    </div>
  )
}
