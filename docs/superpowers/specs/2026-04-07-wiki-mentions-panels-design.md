# Wiki — @Mentions & Panel Blocks Design

**Date:** 2026-04-07
**Status:** Approved
**Scope:** Frontend only — TipTap editor extensions for @mention and /command panel blocks

---

## Overview

Two new authoring features for the wiki editor:

1. **@mentions** — type `@` to mention a project member inline; renders as an indigo pill
2. **Panel blocks** — type `/` to open a command menu and insert a Confluence-style callout panel (Info, Note, Warning, Success, Tip)

Both use TipTap's Suggestion plugin. No backend changes are required — both features serialize cleanly into TipTap JSON which the existing save/load pipeline already handles.

---

## 1. @Mention Extension

### Wiring — how `projectId` and members reach the extension

The TipTap Suggestion API is imperative and cannot call React hooks. The pattern used is:

1. `WikiEditor` calls `useProjectMembers(projectId ?? '')` at the top level (hooks must not be called conditionally). The existing hook already has an `enabled: !!projectId` guard, so no API call fires when `projectId` is absent — passing `''` is safe and satisfies the hook's `string` type signature. Do not widen the hook signature.
2. The fetched `members: ProjectMember[]` array is passed into a factory function `buildMentionExtension(members)` that returns a configured TipTap extension
3. This extension instance is passed to `useEditor({ extensions: [...] })`
4. The Suggestion plugin's `items({ query })` callback closes over the `members` array and filters synchronously — no async call inside the extension

`WikiEditor` gains a new optional prop `projectId?: string`. When `projectId` is absent, `members` will be an empty array and the mention popup shows nothing, degrading gracefully.

**`WikiEditorProps` update:**
```ts
interface WikiEditorProps {
  pageId: string
  projectId?: string          // ← new, optional
  initialContent?: object | null
  readOnly?: boolean
  className?: string
  onContentChange?: (content: object) => void
  onEditorReady?: (editor: Editor) => void
}
```

`WikiPage.tsx` is the only current call site; it passes `projectId` from `useParams()`.

### Trigger & behaviour
- Character: `@`
- As the user types after `@`, the popup filters project members by name (case-insensitive)
- Arrow keys navigate, Enter or click selects, Escape dismisses
- On selection: inserts an inline `mention` node with attributes `{ id: member.memberId, label: member.memberName }`

### Suggestion popup (`MentionList.tsx`)
- Positioned using `getBoundingClientRect()` of the cursor, rendered via `createPortal` into `document.body` (`position: fixed`)
- Shows avatar initial (`memberName[0]`) + full name (`memberName`) per row; max 8 visible (scrollable)
- `id` attribute maps to `ProjectMember.memberId` (workspace member UUID); `label` maps to `ProjectMember.memberName`
- Closes on Escape, click outside, or when the Suggestion plugin dismisses

### Mention node rendering
- Inline element: `@Nome` styled as an indigo chip
- Light: `bg-indigo-100 text-indigo-700 rounded px-1 text-sm font-medium`
- Dark: `dark:bg-indigo-900/40 dark:text-indigo-300`
- Non-editable (`atom: true`) — selected and deleted as a unit

### Files
| File | Purpose |
|---|---|
| `src/features/wiki/extensions/Mention.ts` | Factory `buildMentionExtension(members)` — suggestion config, node renderer |
| `src/features/wiki/MentionList.tsx` | Floating popup component |

---

## 2. Panel Node

### Node definition
- Block node named `panel`
- Single attribute: `type: 'info' | 'note' | 'warning' | 'success' | 'tip'`
- Content schema: `'block+'` — accepts paragraphs, lists, and other block nodes
- Stored in TipTap JSON: `{ type: 'panel', attrs: { type: 'info' }, content: [{ type: 'paragraph', ... }] }`

### NodeView implementation
The node view **must** use `ReactNodeViewRenderer` + `NodeViewContent` from `@tiptap/react` so nested content is editable. A plain `renderHTML` definition is insufficient for editable children.

Layout inside the React node view component:
```
<NodeViewWrapper>
  <div class="panel panel-{type}">          ← coloured border + background
    <span class="panel-icon">{icon}</span>  ← non-editable icon, outside NodeViewContent
    <div class="panel-body">
      <NodeViewContent />                   ← editable content area
    </div>
  </div>
</NodeViewWrapper>
```

The icon is rendered outside `NodeViewContent` so the cursor cannot enter it. `NodeViewContent` receives the editable block content.

### Visual design

**Light mode:**

| Type | Icon | Border colour | Background |
|---|---|---|---|
| `info` | ℹ️ | `#0052CC` | `#DEEBFF` |
| `note` | 📝 | `#FF991F` | `#FFFAE6` |
| `warning` | ⚠️ | `#DE350B` | `#FFEBE6` |
| `success` | ✅ | `#00875A` | `#E3FCEF` |
| `tip` | 💡 | `#6554C0` | `#EAE6FF` |

**Dark mode** (Tailwind classes per type):

| Type | Border class | Background class |
|---|---|---|
| `info` | `dark:border-blue-500` | `dark:bg-blue-900/20` |
| `note` | `dark:border-yellow-500` | `dark:bg-yellow-900/20` |
| `warning` | `dark:border-red-500` | `dark:bg-red-900/20` |
| `success` | `dark:border-green-500` | `dark:bg-green-900/20` |
| `tip` | `dark:border-purple-500` | `dark:bg-purple-900/20` |

Border is 4px solid on the left side only. No other borders.

### Prose reset override
The `editorProps.attributes.class` in `WikiEditor` adds `prose-p:my-1` and explicit panel wrapper classes are applied outside the `prose` scope via `NodeViewWrapper`, so Tailwind prose reset does not strip panel styles.

### File
| File | Purpose |
|---|---|
| `src/features/wiki/extensions/Panel.ts` | Node definition + `ReactNodeViewRenderer` + panel React component |

---

## 3. Slash Command Extension

### Trigger & behaviour
- Character: `/`
- Works anywhere in the document (not restricted to empty lines)
- As the user types after `/`, the command list filters by label (case-insensitive)
- Arrow keys navigate, Enter or click selects, Escape dismisses

### `command` callback contract

When an item is selected, the Suggestion plugin calls `command({ editor, range, props })` where `range` covers the `/query` text. The implementation **must**:

1. Delete the trigger text: `editor.chain().focus().deleteRange(range)`
2. Insert the panel node with an empty paragraph child:
```ts
.insertContent({
  type: 'panel',
  attrs: { type: props.panelType },
  content: [{ type: 'paragraph' }],
})
.run()
```

Skipping step 1 leaves the `/query` text in the document. Omitting the `content` child produces an empty panel node that violates the `'block+'` schema.

### Command list

| Filter label | `panelType` | Display label | Subtitle |
|---|---|---|---|
| `info` | `info` | Painel Info | Nota informativa em azul |
| `note` | `note` | Painel Nota | Anotação em amarelo |
| `warning` | `warning` | Painel Aviso | Alerta em vermelho |
| `success` | `success` | Painel Sucesso | Confirmação em verde |
| `tip` | `tip` | Painel Dica | Dica em roxo |

### Suggestion popup (`SlashCommandList.tsx`)
- Same `createPortal` + `position: fixed` + `getBoundingClientRect()` pattern as `MentionList`
- Each row: coloured panel icon + label (bold) + subtitle (muted gray)
- All 5 panel types shown; filtered by typed query; max 8 rows visible

### Files
| File | Purpose |
|---|---|
| `src/features/wiki/extensions/SlashCommand.ts` | Extension + suggestion config + `command` callback |
| `src/features/wiki/SlashCommandList.tsx` | Floating command picker component |

---

## 4. Integration

### `WikiEditor` changes
- New optional prop: `projectId?: string`
- Calls `useProjectMembers(projectId)` conditionally (only when `projectId` is defined)
- Passes fetched `members` array to `buildMentionExtension(members)`
- Adds three extensions to `useEditor`: result of `buildMentionExtension(members)`, `PanelExtension`, `SlashCommandExtension`

### `WikiPage` changes
- Passes `projectId` (from `useParams()`) to `WikiEditor`

### Call sites
`WikiPage.tsx` is the only existing call site for `WikiEditor`. No other files need updating.

### No backend changes
- `mention` and `panel` nodes are stored as TipTap JSON — handled by the existing `updatePage` mutation and Yjs relay
- Mention notifications for page content are out of scope (comment mentions are already handled server-side)

---

## File Summary

| File | Status |
|---|---|
| `src/features/wiki/extensions/Mention.ts` | New |
| `src/features/wiki/extensions/Panel.ts` | New |
| `src/features/wiki/extensions/SlashCommand.ts` | New |
| `src/features/wiki/MentionList.tsx` | New |
| `src/features/wiki/SlashCommandList.tsx` | New |
| `src/features/wiki/WikiEditor.tsx` | Modified — add `projectId?` prop, 3 extensions |
| `src/features/wiki/WikiPage.tsx` | Modified — pass `projectId` to `WikiEditor` |

---

## Out of Scope

- Backend mention notifications for page content (comment mentions already exist)
- Additional slash commands beyond panel types (headings, lists, etc.)
- Mention autocomplete in page comments
