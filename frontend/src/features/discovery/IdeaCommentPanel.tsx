import { MessageSquare, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'

import { cn, relativeTime } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useAddIdeaComment, useDeleteIdeaComment, useIdeaComments } from '@/hooks/useDiscovery'
import type { IdeaComment } from '@/services/discovery.service'

function CommentItem({
  comment,
  ideaId,
  currentUserId,
}: {
  comment: IdeaComment
  ideaId: string
  currentUserId?: string
}) {
  const del = useDeleteIdeaComment(ideaId)
  const isOwn = currentUserId != null && comment.authorName != null

  return (
    <li className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
        {comment.authorName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{comment.authorName}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{relativeTime(comment.createdAt)}</span>
          {comment.isEdited && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">(editado)</span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.body}</p>
      </div>
      {isOwn && (
        <button
          type="button"
          onClick={() => del.mutate(comment.id)}
          disabled={del.isPending}
          aria-label="Excluir comentário"
          className="shrink-0 self-start rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-red-500 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  )
}

export function IdeaCommentPanel({ ideaId }: { ideaId: string }) {
  const { user } = useAuthStore()
  const { data: comments = [], isLoading } = useIdeaComments(ideaId)
  const add = useAddIdeaComment(ideaId)
  const [body, setBody] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    add.mutate(trimmed, { onSuccess: () => setBody('') })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <section
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
      aria-label="Comentários da ideia"
    >
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Comentários
          {comments.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500">
              ({comments.length})
            </span>
          )}
        </h2>
      </div>

      {isLoading ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">Carregando…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Nenhum comentário ainda. Seja o primeiro a comentar.
        </p>
      ) : (
        <ul className="mb-4 flex flex-col gap-3" aria-label="Lista de comentários">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} ideaId={ideaId} currentUserId={user?.id} />
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className={cn('mt-3', comments.length > 0 && 'border-t border-gray-100 dark:border-gray-800 pt-3')}>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Adicione um comentário… (⌘↵ para enviar)"
          rows={2}
          aria-label="Novo comentário"
          className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={!body.trim() || add.isPending}
            className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {add.isPending ? 'Enviando…' : 'Comentar'}
          </button>
        </div>
        {add.isError && (
          <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
            Erro ao enviar. Tente novamente.
          </p>
        )}
      </form>
    </section>
  )
}
