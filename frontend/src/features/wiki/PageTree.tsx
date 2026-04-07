import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, FileText, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useWikiPages, useCreateWikiPage, useUpdateWikiPage, useDeleteWikiPage } from '@/hooks/useWiki'
import type { WikiPageListItem } from '@/types'
import { cn } from '@/lib/utils'

interface PageTreeNodeProps {
  page: WikiPageListItem
  spaceId: string
  depth?: number
}

function PageTreeNode({ page, spaceId, depth = 0 }: PageTreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(page.title)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const renameInputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { pageId } = useParams()
  const navigate = useNavigate()
  const { data: children = [] } = useWikiPages(spaceId, page.id)
  const createPage = useCreateWikiPage()
  const updatePage = useUpdateWikiPage()
  const deletePage = useDeleteWikiPage()

  useEffect(() => {
    if (renaming) renameInputRef.current?.select()
  }, [renaming])

  useEffect(() => {
    if (!menuOpen) return
    function onMouseDown(e: MouseEvent) {
      if (
        menuRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [menuOpen])

  function openMenu() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.left })
    setMenuOpen((v) => !v)
  }

  function handleAddChild() {
    createPage.mutate(
      { spaceId, data: { title: 'Nova página', content: {}, parentId: page.id } },
      { onSuccess: (created) => navigate(created.id) },
    )
    setExpanded(true)
  }

  function handleRenameSubmit() {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== page.title) {
      updatePage.mutate({ pageId: page.id, data: { title: trimmed } })
    }
    setRenaming(false)
  }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleRenameSubmit()
    if (e.key === 'Escape') {
      setRenameValue(page.title)
      setRenaming(false)
    }
  }

  function handleDelete() {
    setMenuOpen(false)
    if (!confirm(`Excluir "${page.title}" e todas as subpáginas?`)) return
    deletePage.mutate({ pageId: page.id, spaceId })
    if (pageId === page.id) navigate('.')
  }

  const hasChildren = children.length > 0
  const icon = page.emoji ?? null

  return (
    <div>
      <div
        className="group flex items-center gap-0.5 pr-1"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          type="button"
          aria-label={expanded ? 'Recolher' : 'Expandir'}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setExpanded((v) => !v)}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          ) : (
            icon ? (
              <span className="text-[11px] leading-none">{icon}</span>
            ) : (
              <FileText className="h-3 w-3" />
            )
          )}
        </button>

        {/* Page title — either a rename input or a nav link */}
        {renaming ? (
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            className="flex-1 truncate rounded bg-white dark:bg-gray-800 border border-indigo-400 px-1 py-0.5 text-sm text-gray-900 dark:text-gray-100 outline-none"
            aria-label="Renomear página"
          />
        ) : (
          <NavLink
            to={page.id}
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-1 items-center gap-1.5 truncate rounded py-0.5 px-1 text-sm transition-colors',
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 font-medium text-indigo-700 dark:text-indigo-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
              )
            }
          >
            {hasChildren && icon && (
              <span className="shrink-0 text-[11px] leading-none">{icon}</span>
            )}
            <span className="truncate">{page.title}</span>
          </NavLink>
        )}

        {/* Hover actions */}
        {!renaming && (
          <div className="invisible flex items-center gap-0.5 group-hover:visible">
            <button
              type="button"
              aria-label="Adicionar subpágina"
              title="Adicionar subpágina"
              className="flex h-5 w-5 items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={handleAddChild}
            >
              <Plus className="h-3 w-3" />
            </button>

            <button
              ref={triggerRef}
              type="button"
              aria-label="Mais opções"
              title="Mais opções"
              className="flex h-5 w-5 items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={openMenu}
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Context menu — rendered in a portal so overflow:hidden on the aside doesn't clip it */}
      {menuOpen && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
          className="min-w-[160px] overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-md dark:shadow-black/40"
        >
          <button
            type="button"
            className="flex w-full cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 outline-none"
            onClick={() => { setRenameValue(page.title); setRenaming(true); setMenuOpen(false) }}
          >
            <span className="h-4 w-4 shrink-0"><Pencil className="h-3.5 w-3.5" /></span>
            Renomear
          </button>
          <button
            type="button"
            className="flex w-full cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 outline-none"
            onClick={handleDelete}
          >
            <span className="h-4 w-4 shrink-0"><Trash2 className="h-3.5 w-3.5" /></span>
            Excluir
          </button>
        </div>,
        document.body,
      )}

      {expanded &&
        children.map((child) => (
          <PageTreeNode
            key={child.id}
            page={child}
            spaceId={spaceId}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}

interface PageTreeProps {
  spaceId: string
}

export function PageTree({ spaceId }: PageTreeProps) {
  const { data: rootPages = [] } = useWikiPages(spaceId, null)
  const createPage = useCreateWikiPage()
  const navigate = useNavigate()

  function handleCreateRoot() {
    createPage.mutate(
      { spaceId, data: { title: 'Nova página', content: {} } },
      { onSuccess: (created) => navigate(created.id) },
    )
  }

  return (
    <div className="p-2">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Páginas
        </span>
        <button
          type="button"
          onClick={handleCreateRoot}
          className="flex h-5 w-5 items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-400"
          aria-label="Nova página raiz"
          title="Nova página"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {rootPages.map((page) => (
        <PageTreeNode key={page.id} page={page} spaceId={spaceId} />
      ))}
    </div>
  )
}
