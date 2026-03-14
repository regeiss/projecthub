# Wiki Editor Toolbar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar toolbar fixa de formatação e bubble menu ao editor TipTap da wiki.

**Architecture:** `EditorToolbar.tsx` recebe o `editor` como prop e renderiza grupos de botões. `WikiEditor.tsx` é atualizado para montar a toolbar acima do `EditorContent` e o `BubbleMenu` do TipTap dentro do editor. Auto-save via debounce 2s persiste o conteúdo no backend.

**Tech Stack:** TipTap 2.x (`@tiptap/react`, `BubbleMenu`), `@tiptap/extension-link` (novo), `@tiptap/extension-underline` (novo), Lucide React, Tailwind CSS.

---

## Chunk 1: Dependências e extensões

### Task 1: Instalar extensões TipTap faltantes

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Adicionar dependências**

No `frontend/package.json`, dentro de `dependencies`, adicionar:

```json
"@tiptap/extension-link":       "^2.10.3",
"@tiptap/extension-underline":  "^2.10.3",
```

- [ ] **Step 2: Instalar no WSL**

```bash
cd ~/projecthub/frontend && npm install @tiptap/extension-link@^2.10.3 @tiptap/extension-underline@^2.10.3
```

Esperado: instalação sem erros, `node_modules/@tiptap/extension-link` e `extension-underline` criados.

- [ ] **Step 3: Commit**

```bash
cd ~/projecthub && git add frontend/package.json frontend/package-lock.json
git commit -m "feat(wiki): add tiptap link and underline extensions"
```

---

## Chunk 2: Componente EditorToolbar

### Task 2: Criar EditorToolbar.tsx

**Files:**
- Create: `frontend/src/features/wiki/EditorToolbar.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import type { Editor } from '@tiptap/react'
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare,
  Code2, Table, Minus,
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
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-gray-200" />
}

interface EditorToolbarProps {
  editor: Editor
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  function insertTable() {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-white px-2 py-1.5">
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

      {/* Table controls — only when inside a table */}
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
```

- [ ] **Step 2: Verificar que não há erros de TypeScript**

```bash
cd ~/projecthub/frontend && npx tsc --noEmit 2>&1 | grep EditorToolbar
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
cd ~/projecthub && git add frontend/src/features/wiki/EditorToolbar.tsx
git commit -m "feat(wiki): add EditorToolbar component with heading/list/code/table controls"
```

---

## Chunk 3: Atualizar WikiEditor com toolbar + bubble menu + autosave

### Task 3: Reescrever WikiEditor.tsx

**Files:**
- Modify: `frontend/src/features/wiki/WikiEditor.tsx`

- [ ] **Step 1: Reescrever o componente**

```tsx
import { useEffect, useMemo, useCallback } from 'react'
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
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter, Code, Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditorToolbar } from './EditorToolbar'
import { wikiService } from '@/services/wiki.service'

interface WikiEditorProps {
  pageId: string
  readOnly?: boolean
  className?: string
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
        active ? 'bg-white/20 text-white' : 'text-gray-200 hover:bg-white/10 hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

export function WikiEditor({ pageId, readOnly = false, className }: WikiEditorProps) {
  const ydoc = useMemo(() => new Y.Doc(), [pageId])

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

  // Autosave: debounce 2s após cada mudança
  const saveContent = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>
      return (content: object) => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          wikiService.updatePage(pageId, { content }).catch(() => {
            // falha silenciosa — Yjs garante o estado via WS
          })
        }, 2000)
      }
    })(),
    [pageId],
  )

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
      if (!readOnly) saveContent(editor.getJSON())
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
    <div className={cn('overflow-hidden rounded-md border border-gray-200 bg-white', className)}>
      {editor && !readOnly && <EditorToolbar editor={editor} />}

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
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd ~/projecthub/frontend && npx tsc --noEmit 2>&1 | grep -E 'WikiEditor|EditorToolbar'
```

Esperado: sem erros.

- [ ] **Step 3: Verificar no browser**

1. Abrir uma página da wiki
2. Confirmar que toolbar aparece no topo com ícones H1/H2/H3, listas, code, tabela
3. Selecionar texto e confirmar bubble menu escuro aparece com B/I/U/S/destaque/código/link
4. Digitar algo, aguardar 2s, recarregar a página — conteúdo deve persistir

- [ ] **Step 4: Commit**

```bash
cd ~/projecthub && git add frontend/src/features/wiki/WikiEditor.tsx
git commit -m "feat(wiki): add fixed toolbar + bubble menu with autosave"
```

---

## Chunk 4: Sync para WSL

### Task 4: Sincronizar arquivos no WSL

- [ ] **Step 1: Rsync dos arquivos alterados**

```bash
rsync /mnt/d/projecthub/frontend/src/features/wiki/EditorToolbar.tsx \
  ~/projecthub/frontend/src/features/wiki/EditorToolbar.tsx

rsync /mnt/d/projecthub/frontend/src/features/wiki/WikiEditor.tsx \
  ~/projecthub/frontend/src/features/wiki/WikiEditor.tsx

rsync /mnt/d/projecthub/frontend/package.json \
  ~/projecthub/frontend/package.json
```

- [ ] **Step 2: Instalar dependências no WSL**

```bash
cd ~/projecthub/frontend && npm install
```

- [ ] **Step 3: Confirmar hot reload do Vite**

Vite deve detectar as mudanças e recarregar. Verificar no terminal do Vite por mensagens de HMR.
