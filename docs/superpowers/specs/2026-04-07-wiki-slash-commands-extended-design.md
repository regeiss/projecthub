# Wiki — Extended Slash Commands Design

**Date:** 2026-04-07
**Status:** Approved
**Scope:** Frontend only — extends the existing `/` slash command menu with Date, Status, Image, Video, and File commands

---

## Overview

Extends the TipTap wiki editor's `/` slash command menu with five new command groups beyond the existing panel blocks. All features are frontend-only — no backend changes required. Images, videos, and files are inserted by URL; uploads are out of scope.

---

## 1. Architecture Refactoring

### Current state

`SlashCommandItem` is coupled to panel blocks:

```typescript
interface SlashCommandItem {
  label: string
  subtitle: string
  panelType: string   // ← panel-specific
  icon: string
}
// command callback: (props: { panelType: string }) => void
```

### Target state

Replace `panelType` with a generic `action` discriminated union. `SlashCommandItem` gains a `type: 'item'` field so the flat array can be safely narrowed:

```typescript
type SlashCommandAction =
  | { type: 'panel';  panelType: string }
  | { type: 'date' }
  | { type: 'status'; status: string; label: string }
  | { type: 'image' }
  | { type: 'video' }
  | { type: 'file' }

interface SlashCommandItem {
  type: 'item'               // discriminant — distinguishes from header sentinels
  label: string
  subtitle: string
  filterKey: string          // used for text search (replaces panelType)
  icon: string
  action: SlashCommandAction
}

interface SlashCommandHeader {
  type: 'header'
  label: string
}

type SlashCommandEntry = SlashCommandItem | SlashCommandHeader
```

The `command` callback in `SlashCommandList` changes from `(props: { panelType }) => void` to `(action: SlashCommandAction) => void`. The Suggestion plugin's `command` callback in `SlashCommand.ts` dispatches on `action.type`.

**Note on `StatusNode.color`:** The color Tailwind classes are **derived at render time** from the `status` key — they are not stored as a document attribute. Storing them would create redundant data that can drift. The NodeView component has a local `STATUS_STYLES` record mapping `status → Tailwind class string`.

### Section headers

Items are grouped with non-selectable section header dividers. The flat `SLASH_COMMANDS` array contains both `SlashCommandItem` and `SlashCommandHeader` entries, typed as `SlashCommandEntry[]`. The extension's `items` callback strips headers from the array before passing to the Suggestion plugin (which expects only selectable items). Headers are re-interleaved inside `SlashCommandList` for display only.

**Filtering logic:**
- Match is checked against both `filterKey` and `label` (case-insensitive, with diacritic normalization applied to both query and target: `str.normalize('NFD').replace(/\p{Mn}/gu, '')`)
- This means typing `"conclu"` matches `"Concluído"` correctly
- A section header is shown only when at least one item in its group passes the filter
- A header's **group** = all `SlashCommandItem` entries between that header and the next `SlashCommandHeader` in the `SLASH_COMMANDS` array
- The language of filter keys is Portuguese (`'data'` not `'date'`, `'imagem'` not `'image'`) — this is intentional; the app is Portuguese-only

### keyboard navigation

Arrow keys skip header rows. The implementation maintains a flat array of **selectable indices** derived from the displayed entries: `const selectableIndices = entries.map((e, i) => e.type === 'item' ? i : -1).filter(i => i !== -1)`. `selectedIndex` is a pointer into this `selectableIndices` array (not a direct index into `entries`). ArrowDown increments the pointer mod `selectableIndices.length`; ArrowUp decrements. `selectItem(pointer)` looks up `entries[selectableIndices[pointer]]` to get the actual item. This guarantees `selectedIndex` always resolves to a `SlashCommandItem`.

---

## 2. New Nodes

All new nodes implement `parseHTML` + `renderHTML` so content survives copy-paste and `editor.getHTML()` calls. **Note:** the backend `bleach` sanitizer in `apps/wiki/` will need its allowed-tags/attributes list updated to accept the new `data-*` attributes — this is a backend dependency to coordinate at deployment time.

### 2.1 DateNode (`extensions/DateNode.tsx`)

**Node definition:**
- Name: `date`
- Type: inline, `atom: true` — selected and deleted as a unit
- Attribute: `date: string` — ISO date string (e.g. `"2026-04-07"`)
- Rendered via `ReactNodeViewRenderer`

```typescript
addAttributes() {
  return {
    date: {
      default: null,
      parseHTML: element => element.getAttribute('data-date'),
      renderHTML: attributes => ({ 'data-date': attributes.date }),
    },
  }
}
parseHTML: () => [{ tag: 'span[data-type="date"]' }]
renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'date' })]
```

**Insertion flow (from slash command):**

`window.prompt` cannot be used for the date picker because it causes the browser to blur ProseMirror, losing the selection. The date slash command uses a portal-based picker instead:

1. Capture `const insertPos = range.from` **as the first line** of the `command({ editor, range })` handler
2. Delete the trigger text: `editor.chain().deleteRange(range).run()`
3. Render a floating date picker via `createPortal` (imported as `import { createPortal } from 'react-dom'`) into `document.body` (`position: fixed`)
4. Anchor the picker at `editor.view.coordsAtPos(insertPos)`
5. On confirm: `editor.chain().focus().insertContentAt(insertPos, { type: 'date', attrs: { date: isoValue } }).run()`; unmount portal
6. On Escape or click outside: unmount portal without insertion

**Editing existing dates (click-to-edit):**

The NodeView component manages picker visibility with local `useState`:

```typescript
function DateNodeView({ node, getPos, editor }: NodeViewProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  // ...
  function handleConfirm(isoDate: string) {
    editor.chain().command(({ tr }) => {
      tr.setNodeMarkup(getPos(), undefined, { date: isoDate })
      return true
    }).run()
    setPickerOpen(false)
  }
  // picker floats anchored to the chip's getBoundingClientRect()
}
```

The picker mounts via `createPortal` into `document.body` anchored to the chip's `getBoundingClientRect()`.

**Rendering:**
```
📅 07/04/2026
```
Chip: `bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded px-1.5 py-0.5 text-sm font-medium cursor-pointer`. Date formatted with `format(parseISO(date), 'dd/MM/yyyy')` from `date-fns`.

---

### 2.2 StatusNode (`extensions/StatusNode.tsx`)

**Node definition:**
- Name: `status`
- Type: inline, `atom: true`
- Attributes: `status: string`, `label: string`
- Rendered via `ReactNodeViewRenderer`

```typescript
addAttributes() {
  return {
    status: {
      default: 'pending',
      parseHTML: element => element.getAttribute('data-status'),
      renderHTML: attributes => ({ 'data-status': attributes.status }),
    },
    label: {
      default: '',
      parseHTML: element => element.getAttribute('data-label'),
      renderHTML: attributes => ({ 'data-label': attributes.label }),
    },
  }
}
parseHTML: () => [{ tag: 'span[data-type="status"]' }]
renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'status' })]
```

**Insertion flow:**
Each status variant is its own slash command item. Selecting inserts the chip immediately — no secondary picker.

**Color derivation (render time only, not stored):**

```typescript
const STATUS_STYLES: Record<string, string> = {
  'in-progress': 'border-blue-400   bg-blue-50   text-blue-700   dark:border-blue-500   dark:bg-blue-900/20   dark:text-blue-300',
  'done':        'border-green-400  bg-green-50  text-green-700  dark:border-green-500  dark:bg-green-900/20  dark:text-green-300',
  'blocked':     'border-red-400    bg-red-50    text-red-700    dark:border-red-500    dark:bg-red-900/20    dark:text-red-300',
  'in-review':   'border-yellow-400 bg-yellow-50 text-yellow-700 dark:border-yellow-500 dark:bg-yellow-900/20 dark:text-yellow-300',
  'pending':     'border-gray-300   bg-gray-50   text-gray-500   dark:border-gray-600   dark:bg-gray-800      dark:text-gray-400',
}
```

**Rendering:**
Small rounded pill with a 2px solid left border and tinted background. Text from `node.attrs.label`.

---

### 2.3 VideoNode (`extensions/VideoNode.tsx`)

**Node definition:**
- Name: `video`
- Type: block, `atom: true`
- Attribute: `src: string`
- Rendered via `ReactNodeViewRenderer`

```typescript
addAttributes() {
  return {
    src: {
      default: '',
      parseHTML: element => element.getAttribute('data-src'),
      renderHTML: attributes => ({ 'data-src': attributes.src }),
    },
  }
}
parseHTML: () => [{ tag: 'div[data-type="video"]' }]
// Note: no `0` content-hole — atom: true means no editable children
renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'video' })]
```

**Insertion flow:**
The extension's `command` callback captures `const insertPos = range.from`, deletes the range, then calls `window.prompt('URL do vídeo:')`. Because `window.prompt` blurs the editor, the insertion uses the saved position:

```typescript
const src = window.prompt('URL do vídeo:')
if (src?.trim()) {
  editor.chain().focus().insertContentAt(insertPos, { type: 'video', attrs: { src: src.trim() } }).run()
}
```

**URL detection (exact regexes):**

```typescript
function getEmbedUrl(src: string): { kind: 'iframe' | 'video'; url: string } {
  const ytMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return { kind: 'iframe', url: `https://www.youtube.com/embed/${ytMatch[1]}` }

  const vimeoMatch = src.match(/vimeo\.com\/(?:.*\/)?(\d+)/)
  if (vimeoMatch) return { kind: 'iframe', url: `https://player.vimeo.com/video/${vimeoMatch[1]}` }

  return { kind: 'video', url: src }
}
```

**Rendering:**
`<div class="my-2 aspect-video w-full overflow-hidden rounded-md">` containing either `<iframe allowfullscreen>` (YouTube/Vimeo) or `<video controls class="w-full h-full">`.

---

### 2.4 FileNode (`extensions/FileNode.tsx`)

**Node definition:**
- Name: `fileLink`
- Type: inline, `atom: true`
- Attributes: `href: string`, `filename: string`
- Rendered via `ReactNodeViewRenderer`

```typescript
addAttributes() {
  return {
    href: {
      default: '',
      parseHTML: element => element.getAttribute('data-href'),
      renderHTML: attributes => ({ 'data-href': attributes.href }),
    },
    filename: {
      default: 'arquivo',
      parseHTML: element => element.getAttribute('data-filename'),
      renderHTML: attributes => ({ 'data-filename': attributes.filename }),
    },
  }
}
parseHTML: () => [{ tag: 'span[data-type="file-link"]' }]
renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'file-link' })]
```

**Insertion flow:**
Capture `insertPos`, delete range, call `window.prompt`. Filename derived safely:

```typescript
const href = window.prompt('URL do arquivo:')
if (href?.trim()) {
  let filename = 'arquivo'
  try {
    filename = decodeURIComponent(new URL(href.trim()).pathname.split('/').pop() || 'arquivo')
  } catch { /* invalid URL — keep default */ }
  editor.chain().focus().insertContentAt(insertPos, {
    type: 'fileLink',
    attrs: { href: href.trim(), filename },
  }).run()
}
```

**Rendering:**
`📎 nome-do-arquivo.pdf` — clickable link chip opening `href` in a new tab.

---

### 2.5 Image (existing extension)

The existing `Image` extension is already in `WikiEditor`. The slash command captures `insertPos`, deletes range, calls `window.prompt('URL da imagem:')`, then:

```typescript
editor.chain().focus().insertContentAt(insertPos, { type: 'image', attrs: { src: src.trim() } }).run()
```

No new extension needed.

---

## 3. Slash Command Menu

### Full item list (14 selectable + 3 headers)

```
── Painéis ──────────────────────────────────
  ℹ️  Painel Info      Nota informativa em azul
  📝  Painel Nota      Anotação em amarelo
  ⚠️  Painel Aviso     Alerta em vermelho
  ✅  Painel Sucesso   Confirmação em verde
  💡  Painel Dica      Dica em roxo
── Conteúdo ─────────────────────────────────
  📅  Data             Insere uma data clicável
  🔵  Em andamento     Marcador de status azul
  ✅  Concluído        Marcador de status verde
  🔴  Bloqueado        Marcador de status vermelho
  🟡  Em revisão       Marcador de status amarelo
  ⚪  Pendente         Marcador de status cinza
── Mídia ────────────────────────────────────
  🖼️  Imagem           Insere imagem por URL
  🎬  Vídeo            YouTube, Vimeo ou URL direta
  📎  Arquivo          Link para arquivo externo
```

### `filterKey` values

| Item | `filterKey` |
|---|---|
| Painel Info | `info` |
| Painel Nota | `note` |
| Painel Aviso | `warning` |
| Painel Sucesso | `success` |
| Painel Dica | `tip` |
| Data | `data` |
| Em andamento | `em-andamento` |
| Concluído | `concluido` |
| Bloqueado | `bloqueado` |
| Em revisão | `em-revisao` |
| Pendente | `pendente` |
| Imagem | `imagem` |
| Vídeo | `video` |
| Arquivo | `arquivo` |

---

## 4. Integration — WikiEditor

`WikiEditor.tsx` adds four new extensions:

```typescript
import { DateExtension } from './extensions/DateNode'
import { StatusExtension } from './extensions/StatusNode'
import { VideoExtension } from './extensions/VideoNode'
import { FileExtension } from './extensions/FileNode'

// In useEditor extensions array (after existing Underline, Panel, Mention, SlashCommand):
DateExtension,
StatusExtension,
VideoExtension,
FileExtension,
```

The existing `Image` extension is already present — no change needed.

---

## 5. File Summary

| File | Status | Responsibility |
|---|---|---|
| `src/features/wiki/SlashCommandList.tsx` | Modify | Generalize to `SlashCommandEntry[]`, add section headers, fix `command` callback type, diacritic-aware filtering |
| `src/features/wiki/extensions/SlashCommand.ts` | Modify | Dispatch on `action.type`; save `insertPos`; handle date, status, image, video, file |
| `src/features/wiki/extensions/DateNode.tsx` | New | Inline date chip + portal-based date picker |
| `src/features/wiki/extensions/StatusNode.tsx` | New | Inline status chip node, color derived from `status` key |
| `src/features/wiki/extensions/VideoNode.tsx` | New | Block video embed, YouTube/Vimeo detection |
| `src/features/wiki/extensions/FileNode.tsx` | New | Inline file link chip |
| `src/features/wiki/WikiEditor.tsx` | Modify | Add 4 new extensions |

---

## 6. Backend Dependency

The backend `bleach` sanitizer in `apps/wiki/` must be updated to allow the `data-type`, `data-date`, `data-status`, `data-label`, `data-src`, `data-href`, `data-filename` attributes on `<span>` and `<div>` tags. This is a **deployment-time dependency** — the frontend can be deployed independently (nodes round-trip as TipTap JSON without going through bleach), but the public share page (`/wiki/public/{token}/`) which renders HTML will silently strip new node HTML until bleach is updated.

---

## 7. Out of Scope

- File/image/video upload to OCI or any server
- Editable status (clicking a status chip to change it)
- Additional slash commands (headings, dividers, code blocks, etc.)
- Mention autocomplete in comments
- `inputRule` triggers for any new node (slash command only)
