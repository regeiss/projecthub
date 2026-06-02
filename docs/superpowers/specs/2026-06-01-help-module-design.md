# Help Module — Design Spec

**Date:** 2026-06-01
**Branch:** `feat/help-module`
**Status:** Approved

---

## Overview

A comprehensive, context-aware help center embedded in ProjectHub. Users access it via a `HelpCircle` icon in the **bottom section of the sidebar** (the same section as the Settings icon and the collapse toggle) or by pressing `?` anywhere in the app. The help center is a dedicated full-page route (`/help`) with three content areas: feature guides, keyboard shortcuts, and FAQ.

All UI text and `aria-label` values are in **Portuguese**, consistent with the rest of the application (e.g. "Ajuda", "Pesquisar na ajuda", "Categorias de ajuda").

---

## Architecture

### Approach

Static TypeScript content map. All help content lives as structured TypeScript objects in `src/features/help/content/`. No external dependencies, no backend calls, no markdown parser — content is typed JSX rendered directly. Search runs in-memory with a simple debounced filter over `title`, `keywords`, and the dedicated `bodyText` string field (see types below).

### File Structure

```
src/features/help/
  content/
    articles.ts          ← all help articles as typed TS objects
    shortcuts.ts         ← keyboard shortcut definitions
    faq.ts               ← FAQ entries
    routeMap.ts          ← maps route patterns → article category ids
  HelpPage.tsx           ← /help route, two-column layout + header
  HelpSidebar.tsx        ← left category navigation
  HelpArticleList.tsx    ← list of article titles for the selected category
  HelpArticle.tsx        ← renders a single article's JSX body
  HelpSearch.tsx         ← search input + results list
  ShortcutsPanel.tsx     ← keyboard shortcut reference grid
  FaqPanel.tsx           ← FAQ accordion
  useHelp.ts             ← hook: current article state, search, context detection, keyboard shortcut
  index.ts               ← public exports
```

### Content Types

```ts
type HelpCategory =
  | 'general' | 'board' | 'backlog' | 'cycles' | 'gantt'
  | 'wiki' | 'portfolio' | 'issues' | 'modules'
  | 'milestones' | 'risks' | 'resources' | 'workspace'
  // 'inbox' is out of scope for this iteration

type HelpArticle = {
  id: string
  category: HelpCategory
  title: string
  body: React.ReactNode  // JSX: headings, paragraphs, tip callouts — display only
  bodyText: string       // plain-text version of body used exclusively for search
  keywords: string[]     // additional search terms alongside title + bodyText
  routePattern?: string  // React Router v6 pattern, e.g. '/projects/:projectId/board'
}

type Shortcut = {
  keys: string[]         // e.g. ['?'] or ['Ctrl', 'K']
  description: string
  group: 'navigation' | 'issues' | 'search' | 'editor'
}

type FaqEntry = {
  id: string
  question: string
  answer: React.ReactNode
}
```

`body` (JSX) and `bodyText` (plain string) are kept separate so that `body` can be rich/interactive while `bodyText` remains trivially searchable without attempting to stringify a `ReactNode`.

---

## UI Layout

Two-column layout inside the existing `AppLayout` shell.

```
┌─────────────────────────────────────────────────────────┐
│  ← Voltar   Central de Ajuda              🔍 Pesquisar  │
├───────────────┬─────────────────────────────────────────┤
│  Categorias   │  Article list / Article content         │
│               │                                         │
│  • Geral      │  [list of article titles]               │
│  • Board   ◀  │    or                                   │
│  • Backlog    │  [rendered HelpArticle body]             │
│  • Ciclos     │                                         │
│  • Gantt      │                                         │
│  • Wiki       │                                         │
│  • Portfólio  │                                         │
│  • Issues     │                                         │
│  • Módulos    │                                         │
│  • Marcos     │                                         │
│  • Riscos     │                                         │
│  • Recursos   │                                         │
│  ───────────  │                                         │
│  ⌨ Atalhos   │                                         │
│  ❓ FAQ       │                                         │
└───────────────┴─────────────────────────────────────────┘
```

**Navigation flow:**
1. Clicking a category shows `HelpArticleList` — a list of article titles for that category.
2. Clicking an article title shows `HelpArticle` — the full article body.
3. A breadcrumb / back chevron in the main panel returns to the article list for that category.
4. The `← Voltar` button in the top header navigates to `navigate(-1)` (browser history back). If there is no history entry (direct URL access), it navigates to `/`.

Shortcuts and FAQ appear as the last two items in the left nav and render `ShortcutsPanel` / `FaqPanel` respectively (not the article list/article flow).

---

## Entry Points

| Trigger | Behavior |
|---|---|
| `HelpCircle` icon in Sidebar **bottom section** (same section as Settings and collapse toggle) | Navigates to `/help` |
| Keyboard shortcut `?` (Shift+/) | Navigates to `/help` from anywhere; does **not** fire when focus is inside `<input>`, `<textarea>`, or `[contenteditable]` |
| Direct URL `/help` | Opens to Geral (General) category by default |

### Context Awareness

`useHelp` reads the referrer location stored in React Router's `location.state.from` (set by the sidebar link before navigating to `/help`). It then calls `matchPath` (React Router v6) against each article's `routePattern` to find the best-matching category, which is pre-selected on mount.

Route patterns use React Router v6 param syntax (`:projectId`, not `:id`):

| Referrer route | Auto-selected category |
|---|---|
| `/projects/:projectId/board` | Board |
| `/projects/:projectId/backlog` | Backlog |
| `/projects/:projectId/cycles` | Ciclos |
| `/projects/:projectId/gantt` | Gantt |
| `/projects/:projectId/wiki` | Wiki |
| `/portfolio` | Portfólio |
| `/` or no match | Geral |

---

## Content Plan

### Feature Guide Articles

| Category | Articles |
|---|---|
| Geral | Primeiros passos, Visão geral do workspace |
| Board | Usando o quadro Kanban, Arrastar e soltar issues |
| Backlog | Gerenciando o backlog, Filtros e ordenação |
| Ciclos | Criando ciclos, Adicionando issues a um ciclo |
| Gantt | Lendo o gráfico de Gantt, Caminho crítico (CPM) |
| Wiki | Criando páginas, Edição colaborativa |
| Portfólio | Painel do portfólio, Status RAG explicado, Métricas EVM |
| Issues | Criando issues, Relações entre issues, Prioridades e tipos |
| Módulos | Agrupando issues com módulos |
| Marcos | Definindo marcos e acompanhando progresso |
| Riscos | Registrando e monitorando riscos |
| Recursos | Gerenciando recursos do workspace |

### Keyboard Shortcuts

Grouped into four sections, rendered as a two-column key + description grid:

**Navegação**
- `?` — Abrir Ajuda
- `/` — Busca global
- `Esc` — Fechar modal / painel

**Issues**
- `N` — Nova issue (contexto Board / Backlog)

**Busca**
- `Ctrl+K` — Paleta de comandos (reservado para versão futura)

**Editor (Wiki)**
- `Ctrl+B` — Negrito
- `Ctrl+I` — Itálico
- `Ctrl+Z` — Desfazer

### FAQ

~15 entries, including:
- "Por que não consigo excluir um projeto?"
- "Como altero as cores dos estados de uma issue?"
- "O que é o status RAG e como é calculado?"
- "O que é CPM / caminho crítico?"
- "Como adiciono um membro a um projeto?"
- "Posso restaurar uma página de Wiki excluída?"
- "Como funcionam as notificações?"
- "Qual a diferença entre Ciclos e Módulos?"

---

## Search

- Client-side, in-memory
- Searches across: `article.title`, `article.keywords`, `article.bodyText`, `faq.question`
- Debounced 150 ms
- Results replace the main panel; clicking a result navigates to that article
- "Nenhum resultado" empty state with suggestion to browse categories

---

## Accessibility

All labels are in Portuguese, consistent with the rest of the application.

- Left category nav: `<nav aria-label="Categorias de ajuda">`, `aria-current="page"` on active item
- Search: `role="search"`, `aria-label="Pesquisar na ajuda"`
- FAQ: Radix Accordion with `aria-expanded` managed by the component
- `?` keyboard shortcut handler in `useHelp`: skips when `document.activeElement` is `INPUT`, `TEXTAREA`, or has `contenteditable` attribute
- All interactive elements reachable via Tab; focus rings visible
- Sidebar help button: `aria-label="Ajuda"` + tooltip (same pattern as other `NavItem` entries)

---

## Routing

Add to `App.tsx` inside the `<AppLayout>` protected block (alongside `/inbox`, `/settings`, etc.):

```tsx
<Route path="/help" element={<HelpPage />} />
```

Add `HelpCircle` `NavItem` to `Sidebar.tsx` **bottom section** — the `<div>` that already contains `NavItem to="/workspace/settings"` and the collapse toggle button. Place it above Settings.

---

## Testing

| File | What it tests |
|---|---|
| `HelpPage.test.tsx` | Renders without crashing; category nav visible; article list shown on category click |
| `HelpSearch.test.tsx` | Filters by keyword; shows "no results" state; debounce (fake timers) |
| `useHelp.test.ts` | Context detection: given referrer route → correct category pre-selected |
| `useHelp.test.ts` | Keyboard shortcut `?`: fires when focus is on body; does NOT fire inside `<input>` |
| `HelpArticle.test.tsx` | Renders a known article by id; title and bodyText present in DOM |
| `ShortcutsPanel.test.tsx` | All shortcut entries render with their key labels |
| `FaqPanel.test.tsx` | Accordion: first item collapsed by default; expands on click; collapses on second click |
| `routeMap.test.ts` | Each route pattern maps to a valid, existing article category |

---

## Out of Scope

- Video tutorials
- Inbox/notifications help category (deferred to next iteration)
- CMS or backend-driven content
- In-app tooltip overlays / product tours
- Admin interface for editing help content
- Command palette (`Ctrl+K`) — shortcut listed as reference only
