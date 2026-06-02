# Help Module — Design Spec

**Date:** 2026-06-01
**Branch:** `feat/help-module`
**Status:** Approved

---

## Overview

A comprehensive, context-aware help center embedded in ProjectHub. Users access it via a `?` icon at the bottom of the sidebar (alongside Settings) or by pressing `?` anywhere in the app. The help center is a dedicated full-page route (`/help`) with three content areas: feature guides, keyboard shortcuts, and FAQ.

---

## Architecture

### Approach

Static TypeScript content map. All help content lives as structured TypeScript objects in `src/features/help/content/`. No external dependencies, no backend calls, no markdown parser — content is typed JSX rendered directly. Search runs in-memory with a simple debounced filter over title + keywords + body text.

### File Structure

```
src/features/help/
  content/
    articles.ts          ← all help articles as typed TS objects
    shortcuts.ts         ← keyboard shortcut definitions
    faq.ts               ← FAQ entries
    routeMap.ts          ← maps route patterns → article category ids
  HelpPage.tsx           ← /help route, two-column layout
  HelpSidebar.tsx        ← left category navigation
  HelpArticle.tsx        ← renders a single article's JSX body
  HelpSearch.tsx         ← search input + results list
  ShortcutsPanel.tsx     ← keyboard shortcut reference grid
  FaqPanel.tsx           ← FAQ accordion
  useHelp.ts             ← hook: current article state, search, context detection
  index.ts               ← public exports
```

### Content Types

```ts
type HelpCategory =
  | 'general' | 'board' | 'backlog' | 'cycles' | 'gantt'
  | 'wiki' | 'portfolio' | 'issues' | 'modules'
  | 'milestones' | 'risks' | 'resources' | 'workspace'

type HelpArticle = {
  id: string
  category: HelpCategory
  title: string
  body: React.ReactNode      // JSX: headings, paragraphs, tip callouts
  keywords: string[]         // searched alongside title + body text
  routePattern?: string      // e.g. '/projects/:id/board' — drives context detection
}

type Shortcut = {
  keys: string[]             // e.g. ['?'] or ['Ctrl', 'K']
  description: string
  group: 'navigation' | 'issues' | 'search' | 'editor'
}

type FaqEntry = {
  id: string
  question: string
  answer: React.ReactNode
}
```

---

## UI Layout

Two-column layout inside the existing `AppLayout` shell.

```
┌─────────────────────────────────────────────────────────┐
│  ← Back   Help Center                    🔍 Search...   │
├───────────────┬─────────────────────────────────────────┤
│  Categories   │  Article content                        │
│               │                                         │
│  • General    │  ## Board                               │
│  • Board   ◀  │  The Board view shows your issues...    │
│  • Backlog    │                                         │
│  • Cycles     │  ### Moving issues                      │
│  • Gantt      │  Drag a card between columns to...      │
│  • Wiki       │                                         │
│  • Portfolio  │                                         │
│  • Modules    │                                         │
│  • Milestones │                                         │
│  • Risks      │                                         │
│  • Resources  ├─────────────────────────────────────────┤
│  ───────────  │  Keyboard Shortcuts  (tab)              │
│  ⌨ Shortcuts  │  FAQ                 (tab)              │
│  ❓ FAQ       │                                         │
└───────────────┴─────────────────────────────────────────┘
```

The left sidebar lists all categories; clicking one updates the main panel. Shortcuts and FAQ appear as the last two items in the left nav and render their own dedicated panels (not article format).

---

## Entry Points

| Trigger | Behavior |
|---|---|
| `HelpCircle` icon in Sidebar bottom section | Navigates to `/help` |
| Keyboard shortcut `?` (Shift+/) | Navigates to `/help` from anywhere; does not fire inside `<input>` or `<textarea>` |
| Direct URL `/help` | Opens to General category by default |

### Context Awareness

`useHelp` reads `useLocation()` on mount and calls `matchPath` against each article's `routePattern`. The first match sets the initial active category. Example:

| Current route | Auto-selected category |
|---|---|
| `/projects/:id/board` | Board |
| `/projects/:id/backlog` | Backlog |
| `/projects/:id/cycles` | Cycles |
| `/projects/:id/gantt` | Gantt |
| `/projects/:id/wiki` | Wiki |
| `/portfolio` | Portfolio |
| `/` | General |

---

## Content Plan

### Feature Guide Articles

| Category | Articles |
|---|---|
| General | Getting started, Workspace overview |
| Board | Using the Kanban board, Drag & drop issues |
| Backlog | Managing the backlog, Filtering & sorting |
| Cycles | Creating cycles, Adding issues to a cycle |
| Gantt | Reading the Gantt chart, CPM critical path explained |
| Wiki | Creating pages, Collaborative editing |
| Portfolio | Portfolio dashboard, RAG status explained, EVM metrics |
| Issues | Creating issues, Issue relations, Priorities & types |
| Modules | Grouping issues with modules |
| Milestones | Setting milestones & tracking progress |
| Risks | Logging and monitoring project risks |
| Resources | Managing workspace resources |

### Keyboard Shortcuts

Grouped into four sections, rendered as a two-column key + description grid:

**Navigation**
- `?` — Open Help
- `/` — Global search
- `Esc` — Close modal / panel

**Issues**
- `N` — New issue (Board / Backlog context)

**Search**
- `Ctrl+K` — Command palette (reserved for future)

**Editor (Wiki)**
- `Ctrl+B` — Bold
- `Ctrl+I` — Italic
- `Ctrl+Z` — Undo

### FAQ

~15 entries covering common confusion points, including:
- "Why can't I delete a project?"
- "How do I change issue state colors?"
- "What is RAG status and how is it calculated?"
- "What is CPM / critical path?"
- "How do I add a member to a project?"
- "Can I restore a deleted wiki page?"
- "How do notifications work?"
- "What is the difference between Cycles and Modules?"

---

## Search

- Client-side, in-memory
- Searches across: `article.title`, `article.keywords`, stringified `article.body` text, `faq.question`
- Debounced 150 ms
- Results replace the article panel; clicking a result navigates to that article/section
- "No results" empty state with a suggestion to browse categories

---

## Accessibility

- Left category nav: `<nav aria-label="Categorias de ajuda">`, `aria-current="page"` on active item
- Search: `role="search"`, `aria-label="Pesquisar na ajuda"`
- FAQ: Radix Accordion with `aria-expanded` managed by the component
- `?` keyboard shortcut skips when focus is inside `<input>`, `<textarea>`, or `[contenteditable]`
- All interactive elements reachable via Tab; focus rings visible
- Sidebar help button: `aria-label="Ajuda"` + tooltip label

---

## Routing

Add to `App.tsx` inside the `<AppLayout>` protected block:

```tsx
<Route path="/help" element={<HelpPage />} />
```

Add `HelpCircle` `NavItem` to `Sidebar.tsx` bottom section, between Inbox and Settings.

---

## Testing

| File | What it tests |
|---|---|
| `HelpPage.test.tsx` | Renders without crashing, route registration |
| `HelpSearch.test.tsx` | Filters by keyword, "no results" state, debounce |
| `useHelp.test.ts` | Context detection: given route → correct category selected |
| `ShortcutsPanel.test.tsx` | All shortcut entries render |
| `FaqPanel.test.tsx` | Accordion expand/collapse |
| `routeMap.test.ts` | Each route pattern maps to a valid article id |

---

## Out of Scope

- Video tutorials
- CMS or backend-driven content
- In-app tooltip overlays / product tours
- Admin interface for editing help content
