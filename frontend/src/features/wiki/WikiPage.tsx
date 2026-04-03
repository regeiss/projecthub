import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { Save } from 'lucide-react'
import { useWikiPage, useWikiPageComments, useUpdateWikiPage, useWikiSpaces } from '@/hooks/useWiki'
import { WikiEditor } from './WikiEditor'
import { WikiBreadcrumb } from './WikiBreadcrumb'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { relativeTime } from '@/lib/utils'
import type { WikiOutletContext } from './WikiLayout'

export function WikiPage() {
  const { pageId, projectId = '' } = useParams()
  const { data: page, isLoading } = useWikiPage(pageId ?? '')
  const { data: comments = [] } = useWikiPageComments(pageId ?? '')
  const { data: spaces = [] } = useWikiSpaces()
  const { setEditor } = useOutletContext<WikiOutletContext>()
  const updatePage = useUpdateWikiPage()
  const [title, setTitle] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const latestContent = useRef<object | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  const space = spaces.find((s) => s.projectId === projectId)

  useEffect(() => {
    if (page) {
      setTitle(page.title)
      setIsDirty(false)
      latestContent.current = null
    }
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

  const handleContentChange = useCallback((content: object) => {
    latestContent.current = content
    setIsDirty(true)
  }, [])

  const handleSave = useCallback(() => {
    if (!pageId || !latestContent.current) return
    updatePage.mutate(
      { pageId, data: { content: latestContent.current } },
      {
        onSuccess: () => {
          setIsDirty(false)
          setSavedAt(new Date())
        },
      },
    )
  }, [pageId, updatePage])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handleSave])

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
        {/* Breadcrumb */}
        <WikiBreadcrumb
          spaceName={space?.name ?? ''}
          ancestors={page.ancestors}
          currentTitle={page.title}
          className="mb-2"
        />

        <div className="flex items-start justify-between gap-4">
          <input
            className="flex-1 bg-transparent text-2xl font-semibold text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="Título da página"
            aria-label="Título da página"
          />
          <div className="flex shrink-0 items-center gap-2 pt-1">
            {updatePage.isPending && (
              <span className="text-xs text-gray-400 dark:text-gray-500" aria-live="polite">
                Salvando…
              </span>
            )}
            {!updatePage.isPending && savedAt && !isDirty && (
              <span className="text-xs text-green-600 dark:text-green-400" aria-live="polite">
                Salvo
              </span>
            )}
            <Button
              size="sm"
              variant={isDirty ? 'primary' : 'ghost'}
              disabled={!isDirty || updatePage.isPending}
              onClick={handleSave}
              aria-label="Salvar página (Ctrl+S)"
              title="Salvar (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5" />
              Salvar
            </Button>
          </div>
        </div>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          Editado {relativeTime(page.updatedAt)}
        </p>
      </div>

      <WikiEditor
        key={page.id}
        pageId={page.id}
        initialContent={page.content}
        className="flex-1 rounded-none border-0"
        onContentChange={handleContentChange}
        onEditorReady={setEditor}
      />

      {/* Comments */}
      {comments.length > 0 && (
        <div className="mt-8 px-6 pb-6">
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
