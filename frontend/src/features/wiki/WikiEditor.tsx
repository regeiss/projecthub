import { useEffect, useMemo, useRef } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import {
  Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, Highlighter, Code, Link as LinkIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditorToolbar } from './EditorToolbar'

interface WikiEditorProps {
  pageId: string
  initialContent?: object | null
  readOnly?: boolean
  className?: string
  onContentChange?: (content: object) => void
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

export function WikiEditor({ pageId, initialContent, readOnly = false, className, onContentChange }: WikiEditorProps) {
  const ydoc = useMemo(() => new Y.Doc(), [pageId])

  // Keep a stable ref so the onUpdate closure always calls the latest callback
  // (useEditor only captures the initial render's onContentChange)
  const onContentChangeRef = useRef(onContentChange)
  onContentChangeRef.current = onContentChange

  // Track whether we've seeded the editor with saved content yet.
  // We cannot use useEditor's `content` option because it only applies at
  // mount time, but initialContent may arrive asynchronously (stale cache →
  // background refetch). Once seeded, we never overwrite the editor again so
  // in-progress edits are not clobbered.
  const contentSeeded = useRef(false)

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost/ws'
    const token = (window as unknown as Record<string, string>).__kc_token ?? ''
    const provider = new WebsocketProvider(
      `${wsUrl}/wiki/${pageId}/?token=${token}`,
      `wiki-${pageId}`,
      ydoc,
    )
    return () => {
      provider.destroy()
      ydoc.destroy()
    }
  }, [pageId, ydoc])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Placeholder.configure({ placeholder: 'Comece a escrever…' }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: false, autolink: true }),
      Underline,
    ],
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (!readOnly) onContentChangeRef.current?.(editor.getJSON())
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[300px] px-6 py-4',
          'prose-headings:font-semibold prose-headings:text-gray-900',
          'prose-a:text-indigo-600 prose-a:underline',
          'prose-code:bg-gray-100 prose-code:rounded prose-code:px-1',
          'prose-pre:bg-gray-900 prose-pre:text-gray-100',
        ),
      },
    },
  })

  useEffect(() => {
    if (!editor || contentSeeded.current) return
    if (initialContent) {
      editor.commands.setContent(initialContent)
      contentSeeded.current = true
    }
  }, [editor, initialContent])

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

  return (
    <div className={cn('flex flex-col bg-white dark:bg-gray-900', className ?? 'overflow-hidden rounded-md border border-gray-200 dark:border-gray-700')}>
      {editor && !readOnly && <EditorToolbar editor={editor} onSetLink={handleSetLink} />}

      {editor && !readOnly && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="flex items-center gap-0.5 rounded-lg bg-gray-800 px-1.5 py-1 shadow-lg"
        >
          <BubbleButton
            title="Negrito"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            title="Itálico"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            title="Sublinhado"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            title="Tachado"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </BubbleButton>
          <div className="mx-1 h-4 w-px bg-gray-600" />
          <BubbleButton
            title="Destaque"
            active={editor.isActive('highlight')}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          >
            <Highlighter className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            title="Código inline"
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <Code className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            title="Link"
            active={editor.isActive('link')}
            onClick={handleSetLink}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </BubbleButton>
        </BubbleMenu>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}
