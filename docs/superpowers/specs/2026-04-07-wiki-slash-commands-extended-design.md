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

Replace `panelType` with a generic `action` discriminated union:

```typescript
type SlashCommandAction =
  | { type: 'panel';  panelType: string }
  | { type: 'date' }
  | { type: 'status'; status: string; label: string; color: string }
  | { type: 'image' }
  | { type: 'video' }
  | { type: 'file' }

interface SlashCommandItem {
  label: string
  subtitle: string
  filterKey: string          // used for text search (replaces panelType)
  icon: string
  action: SlashCommandAction
}
```

The `command` callback in `SlashCommandList` changes from `(props: { panelType }) => void` to `(action: SlashCommandAction) => void`. The Suggestion plugin's `command` callback in `SlashCommand.ts` dispatches on `action.type`.

### Section headers

Items are grouped with non-selectable section header dividers inside `SlashCommandList`. Headers are stored in the flat items array as a sentinel type:

```typescript
type SlashCommandEntry =
  | SlashCommandItem
  | { type: 'header'; label: string }
```

A header row is skipped by keyboard navigation (ArrowDown/Up jump past headers). When filtering, a header is hidden if all items in its group are filtered out.

---

## 2. New Nodes

### 2.1 DateNode (`extensions/DateNode.tsx`)

**Node definition:**
- Name: `date`
- Type: inline, atom (`atom: true` — selected and deleted as a unit)
- Attribute: `date: string` — ISO date string (e.g. `"2026-04-07"`)
- Rendered via `ReactNodeViewRenderer`

**Insertion flow:**
When the date slash command is selected, a small calendar picker floats at the cursor position (`position: fixed`, same pattern as MentionList). The picker uses a native `<input type="date">` styled inside the floating container. On confirm (Enter or blur), the node is inserted. Escape dismisses without insertion.

**Editing existing dates:**
Clicking a rendered date chip fires a click handler in the node view that shows the same picker anchored to the chip's bounding rect.

**Rendering:**
```
📅 07/04/2026
```
Styled chip: `bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded px-1.5 py-0.5 text-sm font-medium cursor-pointer`.

Date is displayed in Brazilian format (`dd/MM/yyyy`) using `date-fns/format`.

---

### 2.2 StatusNode (`extensions/StatusNode.tsx`)

**Node definition:**
- Name: `status`
- Type: inline, atom
- Attributes: `status: string`, `label: string`, `color: string`
- Rendered via `ReactNodeViewRenderer`

**Insertion flow:**
Each status variant is its own slash command item. Selecting one inserts the chip immediately — no secondary picker. Five presets:

| `status` key | Label | Color class (border/bg/text) |
|---|---|---|
| `in-progress` | Em andamento | `border-blue-400 bg-blue-50 text-blue-700` / `dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-300` |
| `done` | Concluído | `border-green-400 bg-green-50 text-green-700` / `dark:border-green-500 dark:bg-green-900/20 dark:text-green-300` |
| `blocked` | Bloqueado | `border-red-400 bg-red-50 text-red-700` / `dark:border-red-500 dark:bg-red-900/20 dark:text-red-300` |
| `in-review` | Em revisão | `border-yellow-400 bg-yellow-50 text-yellow-700` / `dark:border-yellow-500 dark:bg-yellow-900/20 dark:text-yellow-300` |
| `pending` | Pendente | `border-gray-300 bg-gray-50 text-gray-500` / `dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400` |

**Rendering:**
Small rounded pill with a colored left border (2px solid) and tinted background. Non-editable atom.

---

### 2.3 VideoNode (`extensions/VideoNode.tsx`)

**Node definition:**
- Name: `video`
- Type: block, leaf (`isLeaf: true`)
- Attribute: `src: string`
- Rendered via `ReactNodeViewRenderer`

**Insertion flow:**
Command calls `window.prompt('URL do vídeo:')`. If user cancels or provides empty string, no insertion. Otherwise inserts the node.

**URL detection:**
- YouTube: matches `youtube.com/watch?v=` or `youtu.be/` — embed URL: `https://www.youtube.com/embed/{id}`
- Vimeo: matches `vimeo.com/{id}` — embed URL: `https://player.vimeo.com/video/{id}`
- Other URLs: rendered with a `<video controls>` tag

**Rendering:**
Wrapper `<div class="my-2 aspect-video w-full overflow-hidden rounded-md">` containing the `<iframe>` or `<video>`. Non-editable node.

---

### 2.4 FileNode (`extensions/FileNode.tsx`)

**Node definition:**
- Name: `fileLink`
- Type: inline, atom
- Attributes: `href: string`, `filename: string`
- Rendered via `ReactNodeViewRenderer`

**Insertion flow:**
Command calls `window.prompt('URL do arquivo:')`. If non-empty, derives `filename` from the last path segment of the URL (`url.split('/').pop() ?? 'arquivo'`). Inserts the node.

**Rendering:**
```
📎 nome-do-arquivo.pdf
```
Clickable link chip: `bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded px-1.5 py-0.5 text-sm underline cursor-pointer`. Opens `href` in a new tab on click.

---

### 2.5 Image (existing extension)

The existing TipTap `Image` extension already handles image nodes. The slash command for Image calls `window.prompt('URL da imagem:')` and inserts `{ type: 'image', attrs: { src } }` — no new extension needed.

---

## 3. Slash Command Menu

### Full item list

```
── Painéis ──────────────────────────────────
  ℹ️  Painel Info      Nota informativa em azul
  📝  Painel Nota      Anotação em amarelo
  ⚠️  Painel Aviso     Alerta em vermelho
  ✅  Painel Sucesso   Confirmação em verde
  💡  Painel Dica      Dica em roxo
── Conteúdo ─────────────────────────────────
  📅  Data             Insere uma data clicável
  🔵  Em andamento
  ✅  Concluído
  🔴  Bloqueado
  🟡  Em revisão
  ⚪  Pendente
── Mídia ────────────────────────────────────
  🖼️  Imagem           Insere imagem por URL
  🎬  Vídeo            YouTube, Vimeo ou URL direta
  📎  Arquivo          Link para arquivo externo
```

Total: 14 selectable items + 3 non-selectable headers.

### Filtering

- Each item has a `filterKey` string used for matching (e.g. `"info"`, `"em-andamento"`, `"data"`, `"video"`)
- The label is also matched (case-insensitive)
- A section header is hidden when all items in its group are filtered out
- Keyboard navigation skips header rows

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

// In useEditor extensions array:
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
| `src/features/wiki/SlashCommandList.tsx` | Modify | Generalize item type, add section headers, fix `command` callback type |
| `src/features/wiki/extensions/SlashCommand.ts` | Modify | Dispatch on `action.type`; add handlers for date, status, image, video, file |
| `src/features/wiki/extensions/DateNode.tsx` | New | Inline date chip + floating date picker |
| `src/features/wiki/extensions/StatusNode.tsx` | New | Inline status chip node |
| `src/features/wiki/extensions/VideoNode.tsx` | New | Block video embed node |
| `src/features/wiki/extensions/FileNode.tsx` | New | Inline file link chip node |
| `src/features/wiki/WikiEditor.tsx` | Modify | Add 4 new extensions |

---

## 6. Out of Scope

- File/image/video upload to OCI or any server
- Editable status (clicking a status chip to change it)
- Additional slash commands (headings, dividers, code blocks, etc.)
- Mention autocomplete in comments
