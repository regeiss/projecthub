# Wiki @Mentions & Panel Blocks Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `@mention` for project members and `/command` slash menu for Confluence-style panel blocks to the TipTap wiki editor.

**Architecture:** Three new TipTap extensions (Panel node, Mention, SlashCommand) wired into WikiEditor. Panel uses `ReactNodeViewRenderer` + `NodeViewContent` for editable nested content. Mention and SlashCommand both use a `ReactRenderer`-based popup in a `position: fixed` container appended to `document.body`. A `useRef` getter pattern prevents stale closures when members load async after editor init.

**Tech Stack:** TipTap v2, `@tiptap/extension-mention`, `@tiptap/suggestion`, `@tiptap/react` (ReactRenderer, ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent), Vitest + Testing Library

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `frontend/src/features/wiki/extensions/Panel.tsx` | New | Panel TipTap node + `PanelNodeView` React component |
| `frontend/src/features/wiki/extensions/Mention.ts` | New | `buildMentionExtension(getMembers)` factory |
| `frontend/src/features/wiki/extensions/SlashCommand.ts` | New | `SlashCommandExtension` using Suggestion plugin |
| `frontend/src/features/wiki/MentionList.tsx` | New | Floating popup for @mention suggestions |
| `frontend/src/features/wiki/SlashCommandList.tsx` | New | Floating popup for /command picker |
| `frontend/src/features/wiki/__tests__/MentionList.test.tsx` | New | MentionList unit tests |
| `frontend/src/features/wiki/__tests__/SlashCommandList.test.tsx` | New | SlashCommandList unit tests |
| `frontend/src/features/wiki/WikiEditor.tsx` | Modify | Add `projectId?` prop, ref getter, 3 new extensions |
| `frontend/src/features/wiki/WikiPage.tsx` | Modify | Pass `projectId` to WikiEditor |

---

## Chunk 1: Panel Node

### Task 1: Add @tiptap/suggestion as explicit dependency

- [ ] **Step 1: Install @tiptap/suggestion**

The package is a transitive dep of `@tiptap/extension-mention` but must be declared explicitly so the SlashCommand extension can import it directly.

```bash
cd ~/projecthub/frontend && npm install @tiptap/suggestion@^2.10.3
```

Expected: `@tiptap/suggestion` added to `package.json` `dependencies`.

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add @tiptap/suggestion as explicit dependency"
```

---

### Task 2: Create the Panel extension

**Files:**
- Create: `frontend/src/features/wiki/extensions/Panel.tsx`

The node uses `ReactNodeViewRenderer` + `NodeViewContent` so nested content is fully editable. A plain `renderHTML` is not sufficient for editable children. The `not-prose` class on the wrapper prevents Tailwind prose from stripping border/background styles.

- [ ] **Step 1: Create `Panel.tsx`**

```tsx
// frontend/src/features/wiki/extensions/Panel.tsx
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

export type PanelType = 'info' | 'note' | 'warning' | 'success' | 'tip'

interface PanelConfig {
  icon: string
  borderColor: string
  bgColor: string
  darkBorderClass: string
  darkBgClass: string
}

export const PANEL_CONFIG: Record<PanelType, PanelConfig> = {
  info:    { icon: 'ℹ️', borderColor: '#0052CC', bgColor: '#DEEBFF', darkBorderClass: 'dark:border-blue-500',   darkBgClass: 'dark:bg-blue-900/20'   },
  note:    { icon: '📝', borderColor: '#FF991F', bgColor: '#FFFAE6', darkBorderClass: 'dark:border-yellow-500', darkBgClass: 'dark:bg-yellow-900/20' },
  warning: { icon: '⚠️', borderColor: '#DE350B', bgColor: '#FFEBE6', darkBorderClass: 'dark:border-red-500',    darkBgClass: 'dark:bg-red-900/20'    },
  success: { icon: '✅', borderColor: '#00875A', bgColor: '#E3FCEF', darkBorderClass: 'dark:border-green-500',  darkBgClass: 'dark:bg-green-900/20'  },
  tip:     { icon: '💡', borderColor: '#6554C0', bgColor: '#EAE6FF', darkBorderClass: 'dark:border-purple-500', darkBgClass: 'dark:bg-purple-900/20' },
}

function PanelNodeView({ node }: NodeViewProps) {
  const panelType = (node.attrs.type ?? 'info') as PanelType
  const config = PANEL_CONFIG[panelType] ?? PANEL_CONFIG.info

  return (
    <NodeViewWrapper>
      <div
        className={`not-prose flex gap-3 rounded-r-md p-4 my-2 border-l-4 ${config.darkBorderClass} ${config.darkBgClass}`}
        style={{ borderLeftColor: config.borderColor, backgroundColor: config.bgColor }}
      >
        <span
          className="shrink-0 text-lg leading-tight mt-0.5 select-none"
          contentEditable={false}
        >
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export const PanelExtension = Node.create({
  name: 'panel',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-panel-type'),
        renderHTML: attributes => ({ 'data-panel-type': attributes.type }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-panel-type]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PanelNodeView)
  },
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd ~/projecthub/frontend && npx tsc --noEmit 2>&1 | grep -iE 'panel|error TS'
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/wiki/extensions/Panel.tsx
git commit -m "feat(wiki): add Panel TipTap node extension with ReactNodeViewRenderer"
```

---

## Chunk 2: @Mention

### Task 3: MentionList component and tests

**Files:**
- Create: `frontend/src/features/wiki/MentionList.tsx`
- Create: `frontend/src/features/wiki/__tests__/MentionList.test.tsx`

- [ ] **Step 1: Write the failing tests first**

```tsx
// frontend/src/features/wiki/__tests__/MentionList.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { MentionList, type MentionListHandle } from '../MentionList'
import type { ProjectMember } from '@/types'

const members: ProjectMember[] = [
  { memberId: 'u1', memberName: 'Alice Silva',  memberEmail: 'alice@test.com', memberAvatar: null },
  { memberId: 'u2', memberName: 'Bob Santos',   memberEmail: 'bob@test.com',   memberAvatar: null },
]

describe('MentionList', () => {
  it('renders member names', () => {
    render(<MentionList items={members} command={vi.fn()} />)
    expect(screen.getByText('Alice Silva')).toBeInTheDocument()
    expect(screen.getByText('Bob Santos')).toBeInTheDocument()
  })

  it('returns null when items is empty', () => {
    const { container } = render(<MentionList items={[]} command={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('calls command with memberId and memberName on click', async () => {
    const command = vi.fn()
    render(<MentionList items={members} command={command} />)
    await userEvent.click(screen.getByText('Alice Silva'))
    expect(command).toHaveBeenCalledWith({ id: 'u1', label: 'Alice Silva' })
  })

  it('navigates with ArrowDown and selects with Enter via ref', () => {
    const command = vi.fn()
    const ref = createRef<MentionListHandle>()
    render(<MentionList ref={ref} items={members} command={command} />)
    ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'ArrowDown' }) })
    ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'Enter' }) })
    // ArrowDown moves from index 0 → 1 (Bob Santos)
    expect(command).toHaveBeenCalledWith({ id: 'u2', label: 'Bob Santos' })
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
cd ~/projecthub/frontend && npx vitest run src/features/wiki/__tests__/MentionList.test.tsx 2>&1
```

Expected output contains: `Cannot find module '../MentionList'`

- [ ] **Step 3: Create `MentionList.tsx`**

```tsx
// frontend/src/features/wiki/MentionList.tsx
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'
import type { ProjectMember } from '@/types'

export interface MentionListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

interface MentionListProps {
  items: ProjectMember[]
  command: (props: { id: string; label: string }) => void
}

export const MentionList = forwardRef<MentionListHandle, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => setSelectedIndex(0), [items])

    function selectItem(index: number) {
      const item = items[index]
      if (item) command({ id: item.memberId, label: item.memberName })
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex(i => (i + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex(i => (i + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) return null

    return (
      <div className="min-w-[200px] overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-md">
        {items.slice(0, 8).map((item, index) => (
          <button
            key={item.memberId}
            type="button"
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left ${
              index === selectedIndex
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => selectItem(index)}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {item.memberName[0]?.toUpperCase() ?? '?'}
            </span>
            <span className="truncate">{item.memberName}</span>
          </button>
        ))}
      </div>
    )
  },
)
MentionList.displayName = 'MentionList'
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd ~/projecthub/frontend && npx vitest run src/features/wiki/__tests__/MentionList.test.tsx 2>&1
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/wiki/MentionList.tsx \
        frontend/src/features/wiki/__tests__/MentionList.test.tsx
git commit -m "feat(wiki): add MentionList suggestion popup with keyboard navigation"
```

---

### Task 4: Mention extension

**Files:**
- Create: `frontend/src/features/wiki/extensions/Mention.ts`

The extension is a factory so the `items` callback closes over a getter function rather than a static array. This allows the member list to update after async load without reinitialising the editor.

- [ ] **Step 1: Create `Mention.ts`**

```typescript
// frontend/src/features/wiki/extensions/Mention.ts
import TiptapMention from '@tiptap/extension-mention'
import { ReactRenderer } from '@tiptap/react'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'
import { MentionList, type MentionListHandle } from '../MentionList'
import type { ProjectMember } from '@/types'

function updatePosition(
  container: HTMLDivElement,
  clientRect: (() => DOMRect | null) | null | undefined,
) {
  if (!clientRect) return
  const rect = clientRect()
  if (!rect) return
  container.style.top = `${rect.bottom + 4}px`
  container.style.left = `${rect.left}px`
}

export function buildMentionExtension(getMembers: () => ProjectMember[]) {
  return TiptapMention.configure({
    HTMLAttributes: {
      class:
        'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded px-1 text-sm font-medium not-italic',
    },
    renderLabel({ options, node }) {
      return `${options.suggestion.char}${node.attrs.label}`
    },
    suggestion: {
      items: ({ query }) =>
        getMembers().filter(m =>
          m.memberName.toLowerCase().includes(query.toLowerCase()),
        ),

      render: () => {
        let component: ReactRenderer<MentionListHandle>
        let container: HTMLDivElement

        return {
          onStart(props) {
            container = document.createElement('div')
            container.style.position = 'fixed'
            container.style.zIndex = '9999'
            document.body.appendChild(container)

            component = new ReactRenderer(MentionList, {
              props: { items: props.items, command: props.command },
              editor: props.editor,
            })
            container.appendChild(component.element)
            updatePosition(container, props.clientRect)
          },

          onUpdate(props) {
            component.updateProps({ items: props.items, command: props.command })
            updatePosition(container, props.clientRect)
          },

          onKeyDown(props: SuggestionKeyDownProps) {
            if (props.event.key === 'Escape') {
              container.remove()
              return true
            }
            return component.ref?.onKeyDown(props) ?? false
          },

          onExit() {
            container.remove()
            component.destroy()
          },
        }
      },
    },
  })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd ~/projecthub/frontend && npx tsc --noEmit 2>&1 | grep -iE 'mention|error TS'
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/wiki/extensions/Mention.ts
git commit -m "feat(wiki): add buildMentionExtension factory with ref-getter pattern"
```

---

## Chunk 3: Slash Command

### Task 5: SlashCommandList component and tests

**Files:**
- Create: `frontend/src/features/wiki/SlashCommandList.tsx`
- Create: `frontend/src/features/wiki/__tests__/SlashCommandList.test.tsx`

- [ ] **Step 1: Write the failing tests first**

```tsx
// frontend/src/features/wiki/__tests__/SlashCommandList.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { SlashCommandList, SLASH_COMMANDS, type SlashCommandListHandle } from '../SlashCommandList'

describe('SlashCommandList', () => {
  it('renders all 5 panel commands', () => {
    render(<SlashCommandList items={SLASH_COMMANDS} command={vi.fn()} />)
    expect(screen.getByText('Painel Info')).toBeInTheDocument()
    expect(screen.getByText('Painel Nota')).toBeInTheDocument()
    expect(screen.getByText('Painel Aviso')).toBeInTheDocument()
    expect(screen.getByText('Painel Sucesso')).toBeInTheDocument()
    expect(screen.getByText('Painel Dica')).toBeInTheDocument()
  })

  it('returns null when items is empty', () => {
    const { container } = render(<SlashCommandList items={[]} command={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('calls command with panelType on click', async () => {
    const command = vi.fn()
    render(<SlashCommandList items={SLASH_COMMANDS} command={command} />)
    await userEvent.click(screen.getByText('Painel Aviso'))
    expect(command).toHaveBeenCalledWith({ panelType: 'warning' })
  })

  it('navigates with ArrowDown and selects with Enter via ref', () => {
    const command = vi.fn()
    const ref = createRef<SlashCommandListHandle>()
    render(<SlashCommandList ref={ref} items={SLASH_COMMANDS} command={command} />)
    ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'ArrowDown' }) })
    ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'Enter' }) })
    // ArrowDown moves from index 0 (info) → 1 (note)
    expect(command).toHaveBeenCalledWith({ panelType: 'note' })
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd ~/projecthub/frontend && npx vitest run src/features/wiki/__tests__/SlashCommandList.test.tsx 2>&1
```

Expected: `Cannot find module '../SlashCommandList'`

- [ ] **Step 3: Create `SlashCommandList.tsx`**

```tsx
// frontend/src/features/wiki/SlashCommandList.tsx
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'

export interface SlashCommandItem {
  label: string
  subtitle: string
  panelType: string
  icon: string
}

export interface SlashCommandListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

interface SlashCommandListProps {
  items: SlashCommandItem[]
  command: (props: { panelType: string }) => void
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  { label: 'Painel Info',    subtitle: 'Nota informativa em azul', panelType: 'info',    icon: 'ℹ️' },
  { label: 'Painel Nota',    subtitle: 'Anotação em amarelo',      panelType: 'note',    icon: '📝' },
  { label: 'Painel Aviso',   subtitle: 'Alerta em vermelho',       panelType: 'warning', icon: '⚠️' },
  { label: 'Painel Sucesso', subtitle: 'Confirmação em verde',     panelType: 'success', icon: '✅' },
  { label: 'Painel Dica',    subtitle: 'Dica em roxo',             panelType: 'tip',     icon: '💡' },
]

export const SlashCommandList = forwardRef<SlashCommandListHandle, SlashCommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => setSelectedIndex(0), [items])

    function selectItem(index: number) {
      const item = items[index]
      if (item) command({ panelType: item.panelType })
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex(i => (i + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex(i => (i + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) return null

    return (
      <div className="min-w-[240px] overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-md">
        {items.map((item, index) => (
          <button
            key={item.panelType}
            type="button"
            className={`flex w-full items-start gap-2.5 px-3 py-2 text-sm text-left ${
              index === selectedIndex
                ? 'bg-gray-100 dark:bg-gray-800'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
            onClick={() => selectItem(index)}
          >
            <span className="shrink-0 text-base leading-tight mt-0.5">{item.icon}</span>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{item.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</div>
            </div>
          </button>
        ))}
      </div>
    )
  },
)
SlashCommandList.displayName = 'SlashCommandList'
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd ~/projecthub/frontend && npx vitest run src/features/wiki/__tests__/SlashCommandList.test.tsx 2>&1
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/wiki/SlashCommandList.tsx \
        frontend/src/features/wiki/__tests__/SlashCommandList.test.tsx
git commit -m "feat(wiki): add SlashCommandList command picker with keyboard navigation"
```

---

### Task 6: SlashCommand extension

**Files:**
- Create: `frontend/src/features/wiki/extensions/SlashCommand.ts`

The `command` callback must call `deleteRange(range)` before `insertContent` — skipping it leaves the `/query` text in the document. The `content: [{ type: 'paragraph' }]` child is required to satisfy the `'block+'` schema of the panel node.

- [ ] **Step 1: Create `SlashCommand.ts`**

```typescript
// frontend/src/features/wiki/extensions/SlashCommand.ts
import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'
import {
  SlashCommandList,
  SLASH_COMMANDS,
  type SlashCommandListHandle,
} from '../SlashCommandList'

function updatePosition(
  container: HTMLDivElement,
  clientRect: (() => DOMRect | null) | null | undefined,
) {
  if (!clientRect) return
  const rect = clientRect()
  if (!rect) return
  container.style.top = `${rect.bottom + 4}px`
  container.style.left = `${rect.left}px`
}

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        startOfLine: false,

        items: ({ query }) =>
          SLASH_COMMANDS.filter(
            cmd =>
              cmd.label.toLowerCase().includes(query.toLowerCase()) ||
              cmd.panelType.toLowerCase().includes(query.toLowerCase()),
          ),

        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: 'panel',
              attrs: { type: props.panelType },
              content: [{ type: 'paragraph' }],
            })
            .run()
        },

        render: () => {
          let component: ReactRenderer<SlashCommandListHandle>
          let container: HTMLDivElement

          return {
            onStart(props) {
              container = document.createElement('div')
              container.style.position = 'fixed'
              container.style.zIndex = '9999'
              document.body.appendChild(container)

              component = new ReactRenderer(SlashCommandList, {
                props: { items: props.items, command: props.command },
                editor: props.editor,
              })
              container.appendChild(component.element)
              updatePosition(container, props.clientRect)
            },

            onUpdate(props) {
              component.updateProps({ items: props.items, command: props.command })
              updatePosition(container, props.clientRect)
            },

            onKeyDown(props: SuggestionKeyDownProps) {
              if (props.event.key === 'Escape') {
                container.remove()
                return true
              }
              return component.ref?.onKeyDown(props) ?? false
            },

            onExit() {
              container.remove()
              component.destroy()
            },
          }
        },
      }),
    ]
  },
})
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd ~/projecthub/frontend && npx tsc --noEmit 2>&1 | grep -iE 'slash|error TS'
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/wiki/extensions/SlashCommand.ts
git commit -m "feat(wiki): add SlashCommandExtension with panel insert command"
```

---

## Chunk 4: Integration

### Task 7: Update WikiEditor

**Files:**
- Modify: `frontend/src/features/wiki/WikiEditor.tsx`

- [ ] **Step 1: Add new imports at the top of WikiEditor.tsx**

After the existing imports, add:

```typescript
import { useProjectMembers } from '@/hooks/useProjects'
import { PanelExtension } from './extensions/Panel'
import { buildMentionExtension } from './extensions/Mention'
import { SlashCommandExtension } from './extensions/SlashCommand'
import type { ProjectMember } from '@/types'
```

- [ ] **Step 2: Update `WikiEditorProps` interface**

Add `projectId?: string` to the interface:

```typescript
interface WikiEditorProps {
  pageId: string
  projectId?: string          // new — enables @mention member list
  initialContent?: object | null
  readOnly?: boolean
  className?: string
  onContentChange?: (content: object) => void
  onEditorReady?: (editor: Editor) => void
}
```

- [ ] **Step 3: Add the ref-getter and new extensions inside `WikiEditor`**

In the function body, after the existing `contentSeeded` ref and before `useEditor`, add:

```typescript
// @mention: call hook unconditionally (rules of hooks); enabled guard inside hook prevents API call when projectId is absent
const { data: members = [] } = useProjectMembers(projectId ?? '')
const membersRef = useRef<ProjectMember[]>(members)
membersRef.current = members
// membersRef is used as a getter so the Mention extension always sees the latest
// members even after async load, without reinitialising the editor.
```

Then in the `useEditor` `extensions` array, append after `Underline`:

```typescript
      PanelExtension,
      buildMentionExtension(() => membersRef.current),
      SlashCommandExtension,
```

Also add `projectId` to the function signature:

```typescript
export function WikiEditor({
  pageId,
  projectId,          // new
  initialContent,
  ...
}: WikiEditorProps) {
```

**Do NOT** put `extensions` in a `useMemo` with `members` as a dep — that would reinitialise the editor on every member load. The ref-getter already handles freshness.

- [ ] **Step 4: Verify TypeScript**

```bash
cd ~/projecthub/frontend && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 5: Run all wiki tests**

```bash
cd ~/projecthub/frontend && npx vitest run src/features/wiki/ 2>&1
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/wiki/WikiEditor.tsx
git commit -m "feat(wiki): wire Panel, Mention, SlashCommand extensions into WikiEditor"
```

---

### Task 8: Update WikiPage

**Files:**
- Modify: `frontend/src/features/wiki/WikiPage.tsx`

- [ ] **Step 1: Pass `projectId` to `<WikiEditor />`**

`projectId` is already destructured from `useParams()` at line 14 of `WikiPage.tsx`. Locate the `<WikiEditor ... />` render (around line 140) and add the prop:

```tsx
<WikiEditor
  key={page.id}
  pageId={page.id}
  projectId={projectId}        {/* add this line */}
  initialContent={page.content}
  className="flex-1 rounded-none border-0"
  onContentChange={handleContentChange}
  onEditorReady={setEditor}
/>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd ~/projecthub/frontend && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/wiki/WikiPage.tsx
git commit -m "feat(wiki): pass projectId to WikiEditor for @mention member list"
```

---

### Task 9: Build and deploy

- [ ] **Step 1: Sync Windows edits to WSL and rebuild Docker image**

```bash
rsync -av /mnt/d/projecthub/frontend/src/ ~/projecthub/frontend/src/
rsync -av /mnt/d/projecthub/frontend/package.json ~/projecthub/frontend/package.json
rsync -av /mnt/d/projecthub/frontend/package-lock.json ~/projecthub/frontend/package-lock.json
cd ~/projecthub && docker compose build frontend && docker compose up -d frontend
```

- [ ] **Step 2: Manual smoke test — @mention**

1. Open any wiki page in a project that has at least one member
2. Click in the editor and type `@`
3. Verify a popup appears with project member names
4. Type a letter to filter — list narrows
5. Press ArrowDown, then Enter — `@Name` chip appears inline
6. Save (Ctrl+S) and refresh — chip reloads correctly

- [ ] **Step 3: Manual smoke test — /command panels**

1. In the same wiki page, type `/`
2. Verify popup shows 5 panel options with icons and subtitles
3. Type `av` — only "Painel Aviso" remains
4. Press Enter — warning panel (red border) inserted with cursor inside
5. Type text inside the panel — verify it edits normally
6. Save and refresh — panel persists with correct type and content
7. Repeat for at least one other panel type (e.g., `/info`)
