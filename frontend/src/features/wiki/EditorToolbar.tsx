import type { Editor } from '@tiptap/react'
import {
  Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare,
  Code2, Table, Minus,
  Bold, Italic, Underline, Strikethrough, Highlighter, Code, Link,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded text-sm transition-colors',
        active
          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
}

interface EditorToolbarProps {
  editor: Editor
  onSetLink?: () => void
}

export function EditorToolbar({ editor, onSetLink }: EditorToolbarProps) {
  function insertTable() {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  function handleSetLink() {
    if (onSetLink) {
      onSetLink()
      return
    }
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
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5">
      {/* Inline formatting */}
      <ToolbarButton
        title="Negrito"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Itálico"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Sublinhado"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Tachado"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Destaque"
        active={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Código inline"
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Link"
        active={editor.isActive('link')}
        onClick={handleSetLink}
      >
        <Link className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Headings */}
      <ToolbarButton
        title="Título 1"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Título 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Título 3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton
        title="Lista com marcador"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Lista numerada"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Checklist"
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <CheckSquare className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Blocks */}
      <ToolbarButton
        title="Bloco de código"
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Inserir tabela"
        active={editor.isActive('table')}
        onClick={insertTable}
      >
        <Table className="h-4 w-4" />
      </ToolbarButton>

      {/* Table controls — only when cursor is inside a table */}
      {editor.isActive('table') && (
        <>
          <Divider />
          <ToolbarButton
            title="Adicionar coluna à direita"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            <span className="text-xs font-medium">+col</span>
          </ToolbarButton>
          <ToolbarButton
            title="Adicionar linha abaixo"
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            <span className="text-xs font-medium">+lin</span>
          </ToolbarButton>
          <ToolbarButton
            title="Remover coluna"
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            <span className="text-xs font-medium text-red-500">-col</span>
          </ToolbarButton>
          <ToolbarButton
            title="Remover linha"
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            <span className="text-xs font-medium text-red-500">-lin</span>
          </ToolbarButton>
          <ToolbarButton
            title="Remover tabela"
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            <Minus className="h-4 w-4 text-red-500" />
          </ToolbarButton>
        </>
      )}
    </div>
  )
}
