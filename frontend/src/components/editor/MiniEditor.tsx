import { forwardRef, useImperativeHandle, useMemo, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import {
  Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, Highlighter, Code, Link as LinkIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditorToolbar } from '@/features/wiki/EditorToolbar'
import {
  buildPageLinkExtension,
  PAGE_LINK_SUGGESTION_INACTIVE,
  type PageLinkSuggestionState,
} from './extensions/PageLink'
import { WikiPageLinkList, type WikiPageLinkListHandle } from './WikiPageLinkList'
import { useAllWikiPages } from '@/hooks/useWiki'
import type { WikiPageListItem } from '@/types'

interface MiniEditorProps {
  onChange?: (html: string, isEmpty: boolean, json: Record<string, unknown>) => void
  placeholder?: string
  className?: string
  initialContent?: string | Record<string, unknown>
  /** When provided, typing `[[` opens a wiki page search dropdown */
  projectId?: string
}

export interface MiniEditorHandle {
  clear: () => void
}

function BubbleButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded text-sm transition-colors',
        active ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

export const MiniEditor = forwardRef<MiniEditorHandle, MiniEditorProps>(
  function MiniEditor({ onChange, placeholder, className, initialContent, projectId }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const STORAGE_KEY = 'mini-editor-height'
    const [height, setHeight] = useState(() => {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? parseInt(saved, 10) : 200
    })

    // ── Wiki page link suggestion state ───────────────────────────────────────
    // The dropdown is rendered as JSX inside this component (not via ReactRenderer
    // into document.body). This is critical: when MiniEditor is used inside a
    // Radix Dialog, any element appended outside the dialog DOM subtree triggers
    // Radix's "click outside" focus management — blurring the editor and removing
    // the dropdown before the click fires. Rendering inline avoids all of that.
    const [linkSuggestion, setLinkSuggestion] = useState<PageLinkSuggestionState>(
      PAGE_LINK_SUGGESTION_INACTIVE,
    )
    const wikiListRef = useRef<WikiPageLinkListHandle>(null)

    const { data: wikiPages = [] } = useAllWikiPages(projectId)
    const pagesRef = useRef<WikiPageListItem[]>(wikiPages)
    pagesRef.current = wikiPages

    // Extension is built once per projectId; reads from pagesRef for live data.
    const pageLinkExtension = useMemo(
      () =>
        projectId
          ? buildPageLinkExtension(
              () => pagesRef.current,
              projectId,
              setLinkSuggestion,
              () => wikiListRef.current,
            )
          : null,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [projectId],
    )

    // ── Resize handle ─────────────────────────────────────────────────────────
    const startResize = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault()
        const startY = e.clientY
        const startHeight = containerRef.current?.offsetHeight ?? height
        function onMouseMove(ev: MouseEvent) {
          const next = Math.max(120, startHeight + ev.clientY - startY)
          setHeight(next)
          localStorage.setItem(STORAGE_KEY, String(next))
        }
        function onMouseUp() {
          window.removeEventListener('mousemove', onMouseMove)
          window.removeEventListener('mouseup', onMouseUp)
        }
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
      },
      [height],
    )

    // ── Editor ────────────────────────────────────────────────────────────────
    const editor = useEditor({
      content: initialContent ?? '',
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: placeholder ?? 'Escreva algo…' }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Highlight.configure({ multicolor: false }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Link.configure({ openOnClick: false, autolink: true }),
        Underline,
        ...(pageLinkExtension ? [pageLinkExtension] : []),
      ],
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML(), editor.isEmpty, editor.getJSON() as Record<string, unknown>)
      },
      editorProps: {
        attributes: {
          class: cn(
            'prose prose-sm max-w-none focus:outline-none min-h-[160px] px-3 py-2',
            'prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-gray-100',
            'prose-a:text-indigo-600 prose-a:underline',
            'prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:rounded prose-code:px-1',
            'prose-pre:bg-gray-900 prose-pre:text-gray-100',
            'dark:text-gray-100',
          ),
        },
      },
    })

    useImperativeHandle(ref, () => ({
      clear: () => editor?.commands.clearContent(true),
    }))

    function handleSetLink() {
      if (!editor) return
      const prev = editor.getAttributes('link').href ?? ''
      const url = window.prompt('URL do link:', prev)
      if (url === null) return
      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
      }
    }

    // Position the dropdown relative to the MiniEditor container using absolute
    // positioning so that the dialog's CSS transform (-translate-x-1/2 -translate-y-1/2)
    // doesn't corrupt `position: fixed` coordinates.
    const suggestionPos = (() => {
      if (!linkSuggestion.active || !linkSuggestion.getClientRect) return null
      const cursorRect = linkSuggestion.getClientRect()
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (!containerRect) return null
      return {
        top: (cursorRect?.bottom ?? containerRect.bottom) - containerRect.top + 4,
        left: (cursorRect?.left ?? containerRect.left) - containerRect.left,
      }
    })()

    return (
      <div
        ref={containerRef}
        style={{ height }}
        className={cn(
          // No overflow-hidden here: absolute-positioned dropdown must escape the container.
          // The inner flex children are constrained by layout so nothing else overflows.
          'relative flex flex-col rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900',
          className,
        )}
      >
        {editor && <EditorToolbar editor={editor} onSetLink={handleSetLink} />}

        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100 }}
            className="flex items-center gap-0.5 rounded-lg bg-gray-800 px-1.5 py-1 shadow-lg"
          >
            <BubbleButton title="Negrito" active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className="h-3.5 w-3.5" />
            </BubbleButton>
            <BubbleButton title="Itálico" active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="h-3.5 w-3.5" />
            </BubbleButton>
            <BubbleButton title="Sublinhado" active={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <UnderlineIcon className="h-3.5 w-3.5" />
            </BubbleButton>
            <BubbleButton title="Tachado" active={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}>
              <Strikethrough className="h-3.5 w-3.5" />
            </BubbleButton>
            <div className="mx-1 h-4 w-px bg-gray-600" />
            <BubbleButton title="Destaque" active={editor.isActive('highlight')}
              onClick={() => editor.chain().focus().toggleHighlight().run()}>
              <Highlighter className="h-3.5 w-3.5" />
            </BubbleButton>
            <BubbleButton title="Código inline" active={editor.isActive('code')}
              onClick={() => editor.chain().focus().toggleCode().run()}>
              <Code className="h-3.5 w-3.5" />
            </BubbleButton>
            <BubbleButton title="Link" active={editor.isActive('link')} onClick={handleSetLink}>
              <LinkIcon className="h-3.5 w-3.5" />
            </BubbleButton>
          </BubbleMenu>
        )}

        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} />
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={startResize}
          aria-label="Redimensionar editor"
          role="separator"
          aria-orientation="horizontal"
          className="flex h-3 cursor-s-resize items-center justify-center border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
        >
          <svg width="24" height="6" viewBox="0 0 24 6" className="text-gray-400 dark:text-gray-500">
            <line x1="4" y1="2" x2="20" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="4" y1="5" x2="20" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Wiki page link dropdown — rendered inline so it's inside the dialog DOM tree.
            Uses position:absolute relative to this container (which is position:relative)
            so the dialog's CSS transform doesn't corrupt fixed-position coordinates. */}
        {linkSuggestion.active && suggestionPos && (
          <div
            style={{
              position: 'absolute',
              top: suggestionPos.top,
              left: suggestionPos.left,
              zIndex: 9999,
            }}
          >
            <WikiPageLinkList
              ref={wikiListRef}
              items={linkSuggestion.items}
              command={(page) => {
                const range = linkSuggestion.range
                console.log('[cmd] fired — editor:', !!editor, 'range:', range, 'page:', page.title, 'projectId:', projectId)
                if (editor && range) {
                  const href = `/projects/${projectId}/wiki/${page.id}`
                  try {
                    // Use ProseMirror transaction directly — TipTap chain silently no-ops
                    const { state, dispatch } = editor.view
                    const linkMarkType = state.schema.marks.link
                    console.log('[cmd] linkMarkType:', linkMarkType, 'schema marks:', Object.keys(state.schema.marks))
                    if (!linkMarkType) return
                    const tr = state.tr
                    tr.delete(range.from, range.to)
                    const linked = state.schema.text(page.title, [linkMarkType.create({ href })])
                    const space = state.schema.text(' ')
                    tr.insert(range.from, linked)
                    tr.insert(range.from + page.title.length, space)
                    dispatch(tr)
                  } catch (err) {
                    console.error('[cmd] error:', err)
                  }
                }
                setLinkSuggestion(PAGE_LINK_SUGGESTION_INACTIVE)
              }}
            />
          </div>
        )}
      </div>
    )
  },
)
