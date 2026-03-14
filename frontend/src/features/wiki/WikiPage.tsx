import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useWikiPage, useWikiPageComments, useUpdateWikiPage } from '@/hooks/useWiki'
import { WikiEditor } from './WikiEditor'
import { Avatar } from '@/components/ui/Avatar'
import { PageSpinner } from '@/components/ui/Spinner'
import { relativeTime } from '@/lib/utils'

export function WikiPage() {
  const { pageId } = useParams()
  const { data: page, isLoading } = useWikiPage(pageId ?? '')
  const { data: comments = [] } = useWikiPageComments(pageId ?? '')
  const updatePage = useUpdateWikiPage()
  const [title, setTitle] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (page) setTitle(page.title)
  }, [page?.id])

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setTitle(value)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (value.trim() && value !== page?.title) {
        updatePage.mutate({ pageId: pageId!, data: { title: value.trim() } })
      }
    }, 800)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur()
  }

  if (!pageId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Selecione uma página na árvore
      </div>
    )
  }

  if (isLoading) return <PageSpinner />
  if (!page) return null

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <input
          className="w-full bg-transparent text-2xl font-semibold text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600"
          value={title}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          placeholder="Título da página"
        />
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Editado {relativeTime(page.updatedAt)}</p>
      </div>

      <WikiEditor pageId={page.id} className="flex-1 rounded-none border-0" />

      {/* Comments */}
      {comments.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Comentários ({comments.length})
          </h3>
          {comments.map((c) => (
            <div key={c.id} className="mb-3 flex gap-2.5">
              <Avatar
                src={c.author?.avatarUrl}
                name={c.author?.name ?? '?'}
                size="xs"
                className="shrink-0 mt-0.5"
              />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {c.author?.name}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {relativeTime(c.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
