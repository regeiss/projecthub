import { useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Edit2, Trash2, MessageSquare, Flag } from 'lucide-react'
import { useIssue, useUpdateIssue, useDeleteIssue, useIssueComments, useAddComment, useEpics } from '@/hooks/useIssues'
import { useProjectStates, useProjectMembers, useProjectLabels } from '@/hooks/useProjects'
import { EpicBadge } from './EpicBadge'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { PageSpinner } from '@/components/ui/Spinner'
import { MiniEditor, type MiniEditorHandle } from '@/components/editor/MiniEditor'
import { IssueActivity } from './IssueActivity'
import { IssueForm } from './IssueForm'
import { SubtaskList } from './SubtaskList'
import { IssueRelationList } from './IssueRelationList'
import { formatDate, priorityColor, priorityLabel, relativeTime } from '@/lib/utils'
import { tiptapToHtml } from '@/lib/editor'

export function IssueDetailPage() {
  const { projectId = '', issueId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const backTo: string = (location.state as { from?: string } | null)?.from ?? `/projects/${projectId}/backlog`
  const { data: issue, isLoading } = useIssue(projectId, issueId)
  const { data: states = [] } = useProjectStates(projectId)
  const { data: comments = [] } = useIssueComments(projectId, issueId)
  const { data: epics = [] } = useEpics(projectId)
  const deleteIssue = useDeleteIssue()
  const updateIssue = useUpdateIssue()
  const addComment = useAddComment()
  const [editing, setEditing] = useState(false)
  const [editingEpic, setEditingEpic] = useState(false)
  const [commentJson, setCommentJson] = useState<Record<string, unknown>>({})
  const [commentEmpty, setCommentEmpty] = useState(true)
  const commentEditorRef = useRef<MiniEditorHandle>(null)

  // Handle clicks on links in rendered HTML (dangerouslySetInnerHTML)
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'A' && target.getAttribute('href')) {
      const href = target.getAttribute('href')
      if (href?.startsWith('/')) {
        e.preventDefault()
        navigate(href)
      }
    }
  }

  if (isLoading) return <PageSpinner />
  if (!issue) return <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Issue não encontrada</p>

  const state = states.find((s) => s.id === issue.stateId)

  function handleDelete() {
    if (!issue || !confirm('Deletar esta issue?')) return
    deleteIssue.mutate(
      { projectId, issueId: issue.id },
      { onSuccess: () => navigate(backTo) },
    )
  }

  function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!issue || commentEmpty) return
    addComment.mutate(
      { projectId, issueId: issue.id, content: commentJson },
      {
        onSuccess: () => {
          setCommentJson({})
          setCommentEmpty(true)
          commentEditorRef.current?.clear()
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Back */}
      <button
        onClick={() => navigate(backTo)}
        className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div className="grid grid-cols-[1fr_240px] gap-6">
        {/* Main content */}
        <div>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-mono text-gray-400 dark:text-gray-500">{issue.sequenceId}</p>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{issue.title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(true)}
                aria-label="Editar"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                aria-label="Deletar"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>

          {issue.description ? (
            <div
              onClick={handleContentClick}
              className="prose prose-sm dark:prose-invert mb-6 max-w-none text-gray-700 dark:text-gray-300 prose-a:text-indigo-600 prose-a:underline hover:prose-a:text-indigo-700 prose-a:cursor-pointer"
              dangerouslySetInnerHTML={{ __html: tiptapToHtml(issue.description) }}
            />
          ) : (
            <p className="mb-6 text-sm text-gray-400 dark:text-gray-500 italic">
              Sem descrição
            </p>
          )}

          {/* Subtasks */}
          <SubtaskList projectId={projectId} issueId={issueId} />

          {/* Relations */}
          <IssueRelationList projectId={projectId} issueId={issueId} />

          {/* Comments */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <MessageSquare className="h-4 w-4" />
              Comentários ({comments.length})
            </h3>

            {comments.map((c) => (
              <div key={c.id} className="mb-3 flex gap-2.5">
                <Avatar
                  src={c.authorAvatar}
                  name={c.authorName || '?'}
                  size="sm"
                  className="shrink-0"
                />
                <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {c.authorName}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {relativeTime(c.createdAt)}
                    </span>
                  </div>
                  <div
                    onClick={handleContentClick}
                    className="prose prose-sm max-w-none text-sm text-gray-700 dark:text-gray-300 dark:prose-invert prose-a:text-indigo-600 prose-a:underline hover:prose-a:text-indigo-700 prose-a:cursor-pointer"
                    dangerouslySetInnerHTML={{ __html: tiptapToHtml(c.content) }}
                  />
                </div>
              </div>
            ))}

            <form onSubmit={handleComment} className="mt-3">
              <MiniEditor
                ref={commentEditorRef}
                projectId={projectId}
                placeholder="Escreva um comentário…"
                onChange={(html, isEmpty, json) => {
                  setCommentJson(json)
                  setCommentEmpty(isEmpty)
                }}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  type="submit"
                  loading={addComment.isPending}
                  disabled={commentEmpty}
                >
                  Comentar
                </Button>
              </div>
            </form>
          </div>

          <IssueActivity projectId={projectId} issueId={issueId} />
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <DetailField label="Estado">
            {state && (
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: state.color }}
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">{state.name}</span>
              </div>
            )}
          </DetailField>

          <DetailField label="Prioridade">
            <span className={`text-sm font-medium ${priorityColor(issue.priority)}`}>
              {priorityLabel(issue.priority)}
            </span>
          </DetailField>

          {issue.type !== 'epic' && (
            <DetailField label="Épico">
              {editingEpic ? (
                <select
                  autoFocus
                  defaultValue={issue.epicId ?? ''}
                  onChange={(e) => {
                    updateIssue.mutate(
                      {
                        projectId,
                        issueId: issue.id,
                        data: { epicId: e.target.value || null },
                      },
                      { onSuccess: () => setEditingEpic(false) },
                    )
                  }}
                  onBlur={() => setEditingEpic(false)}
                  className="h-7 w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-1 text-xs text-gray-900 dark:text-gray-100"
                >
                  <option value="">— Nenhum —</option>
                  {epics.map((e) => (
                    <option key={e.id} value={e.id}>
                      #{e.sequenceId} {e.title}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={() => setEditingEpic(true)}
                  className="rounded p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {issue.epic ? (
                    <EpicBadge epic={issue.epic} />
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                  )}
                </button>
              )}
            </DetailField>
          )}

          {issue.assignee && (
            <DetailField label="Responsável">
              <div className="flex items-center gap-2">
                <Avatar
                  src={issue.assignee.avatarUrl}
                  name={issue.assignee.name}
                  size="xs"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">{issue.assignee.name}</span>
              </div>
            </DetailField>
          )}

          {issue.labels && issue.labels.length > 0 && (
            <DetailField label="Etiquetas">
              <div className="flex flex-wrap gap-1">
                {issue.labels.map((l) => (
                  <span
                    key={l.id}
                    className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: l.color + '20',
                      color: l.color,
                    }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            </DetailField>
          )}

          {issue.size && (
            <DetailField label="Tamanho">
              <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                {issue.size}
              </span>
            </DetailField>
          )}

          {issue.estimateDays != null && (
            <DetailField label="Estimativa">
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {issue.estimateDays} {issue.estimateDays === 1 ? 'dia' : 'dias'}
              </span>
            </DetailField>
          )}

          {issue.cycleName && (
            <DetailField label="Ciclo">
              <span className="text-sm text-gray-900 dark:text-gray-100">{issue.cycleName}</span>
            </DetailField>
          )}

          {issue.milestoneName && (
            <DetailField label="Marco">
              <div className="flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-sm text-gray-900 dark:text-gray-100">{issue.milestoneName}</span>
              </div>
            </DetailField>
          )}

          {issue.dueDate && (
            <DetailField label="Prazo">
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {formatDate(issue.dueDate)}
              </span>
            </DetailField>
          )}

          {issue.isCritical && (
            <Badge variant="danger">Caminho crítico</Badge>
          )}

          <DetailField label="Criado">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {relativeTime(issue.createdAt)}
            </span>
          </DetailField>
        </aside>
      </div>

      {/* Edit modal */}
      <IssueForm
        projectId={projectId}
        open={editing}
        onClose={() => setEditing(false)}
        issue={issue}
      />
    </div>
  )
}

function DetailField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>
      {children}
    </div>
  )
}
