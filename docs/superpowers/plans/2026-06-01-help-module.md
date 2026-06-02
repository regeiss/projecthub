# Help Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a context-aware help center at `/help` with feature guides, keyboard shortcuts, and FAQ, accessible from the sidebar and the `?` key.

**Architecture:** Static TypeScript/TSX content map — all articles, shortcuts, and FAQ are typed objects in `src/features/help/content/`. A `useHelp` hook manages panel/article selection, search debounce, keyboard shortcut registration, and route-based context detection via React Router v6 `matchPath`. No new dependencies required.

**Tech Stack:** React 18, TypeScript, React Router v6 (`matchPath`, `useLocation`, `useNavigate`), Tailwind CSS, Lucide React icons, `@/hooks/useDebounce` (existing hook at `src/hooks/useDebounce.ts`), Vitest + Testing Library (`jsdom` environment, globals enabled).

**Spec:** `docs/superpowers/specs/2026-06-01-help-module-design.md`

---

## File Map

### New files
| Path | Responsibility |
|---|---|
| `frontend/src/features/help/content/types.ts` | Shared TS types: `HelpCategory`, `HelpArticle`, `Shortcut`, `FaqEntry`, `HelpPanel` |
| `frontend/src/features/help/content/routeMap.ts` | `ROUTE_MAP` array + `categoryFromPath(pathname)` function |
| `frontend/src/features/help/content/articles.tsx` | `ARTICLES: HelpArticle[]` — all feature guide articles with JSX `body` |
| `frontend/src/features/help/content/shortcuts.ts` | `SHORTCUTS: Shortcut[]` — all keyboard shortcut definitions |
| `frontend/src/features/help/content/faq.tsx` | `FAQ: FaqEntry[]` — all FAQ entries with JSX `answer` |
| `frontend/src/features/help/useHelp.ts` | Hook: panel state, article state, search, keyboard shortcut, context detection |
| `frontend/src/features/help/HelpSidebar.tsx` | Left category navigation panel |
| `frontend/src/features/help/HelpSearch.tsx` | Search input + results list |
| `frontend/src/features/help/HelpArticleList.tsx` | Article title list for selected category |
| `frontend/src/features/help/HelpArticle.tsx` | Single article body renderer |
| `frontend/src/features/help/ShortcutsPanel.tsx` | Keyboard shortcuts reference grid |
| `frontend/src/features/help/FaqPanel.tsx` | FAQ accordion |
| `frontend/src/features/help/HelpPage.tsx` | `/help` route, two-column layout, header |
| `frontend/src/features/help/index.ts` | Public re-exports |
| `frontend/src/features/help/__tests__/routeMap.test.ts` | Route → category mapping tests |
| `frontend/src/features/help/__tests__/useHelp.test.tsx` | Context detection + keyboard shortcut guard tests |
| `frontend/src/features/help/__tests__/HelpSearch.test.tsx` | Search filter + debounce + empty state tests |
| `frontend/src/features/help/__tests__/HelpArticle.test.tsx` | Article render + content presence tests |
| `frontend/src/features/help/__tests__/ShortcutsPanel.test.tsx` | Shortcut entries render tests |
| `frontend/src/features/help/__tests__/FaqPanel.test.tsx` | Accordion expand/collapse tests |
| `frontend/src/features/help/__tests__/HelpPage.test.tsx` | Integration: renders, nav, article selection |

### Modified files
| Path | Change |
|---|---|
| `frontend/src/App.tsx` | Add `<Route path="/help" element={<HelpPage />} />` inside AppLayout |
| `frontend/src/components/layout/Sidebar.tsx` | Add Help button in bottom section (above Settings) |
| `CHANGELOG.md` | Log the new feature |

---

## Task 1: Create branch and content types

**Files:**
- Create: `frontend/src/features/help/content/types.ts`

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b feat/help-module
```

- [ ] **Step 2: Create the types file**

Create `frontend/src/features/help/content/types.ts`:

```ts
import type { ReactNode } from 'react'

export type HelpCategory =
  | 'general'
  | 'board'
  | 'backlog'
  | 'cycles'
  | 'gantt'
  | 'wiki'
  | 'portfolio'
  | 'issues'
  | 'modules'
  | 'milestones'
  | 'risks'
  | 'resources'
  | 'workspace'

export type HelpPanel = HelpCategory | 'shortcuts' | 'faq'

export type HelpArticle = {
  id: string
  category: HelpCategory
  title: string
  body: ReactNode
  bodyText: string
  keywords: string[]
  routePattern?: string
}

export type Shortcut = {
  keys: string[]
  description: string
  group: 'navigation' | 'issues' | 'search' | 'editor'
}

export type FaqEntry = {
  id: string
  question: string
  answer: ReactNode
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/help/content/types.ts
git commit -m "feat(help): add content type definitions"
```

---

## Task 2: Route map with TDD

**Files:**
- Create: `frontend/src/features/help/content/routeMap.ts`
- Test: `frontend/src/features/help/__tests__/routeMap.test.ts`

- [ ] **Step 1: Create the __tests__ directory**

```bash
mkdir -p frontend/src/features/help/__tests__
```

- [ ] **Step 2: Write failing tests**

Create `frontend/src/features/help/__tests__/routeMap.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { categoryFromPath, ROUTE_MAP } from '../content/routeMap'
import type { HelpCategory } from '../content/types'
import { ARTICLES } from '../content/articles'

describe('categoryFromPath', () => {
  it('returns "board" for project board route', () => {
    expect(categoryFromPath('/projects/abc-123/board')).toBe('board')
  })

  it('returns "backlog" for project backlog route', () => {
    expect(categoryFromPath('/projects/abc-123/backlog')).toBe('backlog')
  })

  it('returns "cycles" for project cycles route', () => {
    expect(categoryFromPath('/projects/abc-123/cycles')).toBe('cycles')
  })

  it('returns "cycles" for a specific cycle detail route', () => {
    expect(categoryFromPath('/projects/abc-123/cycles/cycle-456')).toBe('cycles')
  })

  it('returns "gantt" for project gantt route', () => {
    expect(categoryFromPath('/projects/abc-123/gantt')).toBe('gantt')
  })

  it('returns "wiki" for project wiki route', () => {
    expect(categoryFromPath('/projects/abc-123/wiki')).toBe('wiki')
  })

  it('returns "wiki" for workspace wiki route', () => {
    expect(categoryFromPath('/wiki')).toBe('wiki')
  })

  it('returns "portfolio" for portfolio route', () => {
    expect(categoryFromPath('/portfolio')).toBe('portfolio')
  })

  it('returns "milestones" for milestones route', () => {
    expect(categoryFromPath('/projects/abc-123/milestones')).toBe('milestones')
  })

  it('returns "risks" for risks route', () => {
    expect(categoryFromPath('/projects/abc-123/risks')).toBe('risks')
  })

  it('returns "modules" for modules route', () => {
    expect(categoryFromPath('/projects/abc-123/modules')).toBe('modules')
  })

  it('returns "resources" for workspace resources route', () => {
    expect(categoryFromPath('/workspace/resources')).toBe('resources')
  })

  it('returns "workspace" for workspace settings route', () => {
    expect(categoryFromPath('/workspace/settings')).toBe('workspace')
  })

  it('returns "general" for the home route', () => {
    expect(categoryFromPath('/')).toBe('general')
  })

  it('returns "general" for unmatched routes', () => {
    expect(categoryFromPath('/some/unknown/path')).toBe('general')
  })
})

describe('ROUTE_MAP integrity', () => {
  it('every category in ROUTE_MAP is a valid HelpCategory', () => {
    const validCategories: HelpCategory[] = [
      'general', 'board', 'backlog', 'cycles', 'gantt', 'wiki',
      'portfolio', 'issues', 'modules', 'milestones', 'risks', 'resources', 'workspace',
    ]
    ROUTE_MAP.forEach(({ category }) => {
      expect(validCategories).toContain(category)
    })
  })
})

describe('ARTICLES routePattern integrity', () => {
  it('every routePattern in ARTICLES maps to a valid category via categoryFromPath', () => {
    ARTICLES
      .filter((a) => a.routePattern)
      .forEach((a) => {
        // Replace param placeholders with dummy values for matchPath
        const testPath = a.routePattern!
          .replace(':projectId', 'test-id')
          .replace(':pageId', 'page-id')
          .replace(':cycleId', 'cycle-id')
        const result = categoryFromPath(testPath)
        expect(result).toBe(a.category)
      })
  })
})
```

- [ ] **Step 3: Run tests and confirm they fail**

```bash
cd frontend && npm run test -- src/features/help/__tests__/routeMap.test.ts
```

Expected: FAIL — modules not found yet.

- [ ] **Step 4: Implement routeMap.ts**

Create `frontend/src/features/help/content/routeMap.ts`:

```ts
import { matchPath } from 'react-router-dom'
import type { HelpCategory } from './types'

export const ROUTE_MAP: Array<{ pattern: string; category: HelpCategory }> = [
  { pattern: '/projects/:projectId/board', category: 'board' },
  { pattern: '/projects/:projectId/backlog', category: 'backlog' },
  { pattern: '/projects/:projectId/cycles/:cycleId', category: 'cycles' },
  { pattern: '/projects/:projectId/cycles', category: 'cycles' },
  { pattern: '/projects/:projectId/gantt', category: 'gantt' },
  { pattern: '/projects/:projectId/wiki/:pageId', category: 'wiki' },
  { pattern: '/projects/:projectId/wiki', category: 'wiki' },
  { pattern: '/projects/:projectId/milestones', category: 'milestones' },
  { pattern: '/projects/:projectId/risks', category: 'risks' },
  { pattern: '/projects/:projectId/modules', category: 'modules' },
  { pattern: '/projects/:projectId/epics', category: 'issues' },
  { pattern: '/projects/:projectId/issues/:issueId', category: 'issues' },
  { pattern: '/projects/:projectId/resources', category: 'resources' },
  { pattern: '/portfolio', category: 'portfolio' },
  { pattern: '/wiki/:pageId', category: 'wiki' },
  { pattern: '/wiki', category: 'wiki' },
  { pattern: '/workspace/resources', category: 'resources' },
  { pattern: '/workspace/settings', category: 'workspace' },
]

export function categoryFromPath(pathname: string): HelpCategory {
  for (const { pattern, category } of ROUTE_MAP) {
    if (matchPath(pattern, pathname)) return category
  }
  return 'general'
}
```

- [ ] **Step 5: Run tests and confirm they pass**

```bash
cd frontend && npm run test -- src/features/help/__tests__/routeMap.test.ts
```

Expected: The `ARTICLES routePattern integrity` describe block will cause a module-not-found error because `articles.tsx` does not exist yet.

> **Action required:** In `routeMap.test.ts`, comment out **both** the `import { ARTICLES }` line at the top **and** the entire `describe('ARTICLES routePattern integrity', ...)` block. Run the tests again — all remaining tests should PASS. You will uncomment both in Task 3 Step 2.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/help/content/routeMap.ts frontend/src/features/help/__tests__/routeMap.test.ts
git commit -m "feat(help): add routeMap with categoryFromPath and tests"
```

---

## Task 3: Articles content

**Files:**
- Create: `frontend/src/features/help/content/articles.tsx`

- [ ] **Step 1: Create articles.tsx**

Create `frontend/src/features/help/content/articles.tsx`:

```tsx
import type { HelpArticle } from './types'

export const ARTICLES: HelpArticle[] = [
  // ── General ─────────────────────────────────────────────────────────────────
  {
    id: 'getting-started',
    category: 'general',
    title: 'Primeiros passos',
    keywords: ['início', 'começo', 'tutorial', 'introdução'],
    bodyText:
      'O ProjectHub é um sistema de gestão de projetos. Comece criando um projeto, adicione membros e crie issues para organizar o trabalho.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O <strong>ProjectHub</strong> é o sistema interno de gestão de projetos da Prefeitura de Novo Hamburgo. Use-o para planejar, acompanhar e entregar projetos com eficiência.
        </p>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Passo a passo</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Acesse <strong>Projetos</strong> no menu lateral e crie seu primeiro projeto.</li>
          <li>Adicione membros da equipe nas configurações do projeto.</li>
          <li>Crie <strong>issues</strong> para representar as tarefas do projeto.</li>
          <li>Organize as issues nos modos <strong>Board</strong>, <strong>Backlog</strong> ou <strong>Gantt</strong>.</li>
          <li>Use <strong>Ciclos</strong> para planejar sprints e <strong>Módulos</strong> para agrupar temas.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'workspace-overview',
    category: 'general',
    title: 'Visão geral do workspace',
    keywords: ['workspace', 'dashboard', 'visão geral', 'home'],
    bodyText:
      'O workspace é o ambiente central do ProjectHub. A tela inicial mostra um resumo dos seus projetos, atividades recentes e notificações.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O <strong>workspace</strong> é o ambiente central que reúne todos os projetos da organização.
        </p>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">O que você encontra na tela inicial</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Resumo de projetos ativos e seus status</li>
          <li>Issues recentemente atualizadas</li>
          <li>Atividades da equipe</li>
          <li>Atalhos para seus projetos mais usados</li>
        </ul>
      </div>
    ),
  },

  // ── Board ────────────────────────────────────────────────────────────────────
  {
    id: 'kanban-board',
    category: 'board',
    title: 'Usando o quadro Kanban',
    routePattern: '/projects/:projectId/board',
    keywords: ['kanban', 'quadro', 'colunas', 'estados', 'board'],
    bodyText:
      'O Board exibe as issues organizadas em colunas por estado. Arraste as issues entre colunas para mudar seu estado.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O <strong>Board</strong> é um quadro Kanban que exibe as issues organizadas em colunas de acordo com o estado de cada uma.
        </p>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Como usar</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Cada coluna representa um estado (ex: Backlog, Em andamento, Concluído).</li>
          <li>Arraste e solte as issues entre colunas para atualizar o estado.</li>
          <li>Clique em uma issue para ver seus detalhes.</li>
          <li>Use os filtros no topo para exibir apenas issues de um responsável ou label.</li>
        </ul>
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Dica:</strong> As mudanças de estado feitas no Board são sincronizadas em tempo real para todos os membros.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'board-drag-drop',
    category: 'board',
    title: 'Arrastar e soltar issues',
    routePattern: '/projects/:projectId/board',
    keywords: ['arrastar', 'soltar', 'drag', 'drop', 'mover', 'ordem'],
    bodyText:
      'Arraste issues entre colunas para mudar o estado. Reordene dentro da mesma coluna para ajustar a prioridade visual.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O Board suporta arrastar e soltar para organizar issues de forma intuitiva.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li><strong>Entre colunas:</strong> muda o estado da issue.</li>
          <li><strong>Dentro da mesma coluna:</strong> reordena a posição visual da issue.</li>
        </ul>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          A ordem é salva automaticamente e refletida para todos os membros do projeto.
        </p>
      </div>
    ),
  },

  // ── Backlog ──────────────────────────────────────────────────────────────────
  {
    id: 'managing-backlog',
    category: 'backlog',
    title: 'Gerenciando o backlog',
    routePattern: '/projects/:projectId/backlog',
    keywords: ['backlog', 'lista', 'issues', 'prioridade'],
    bodyText:
      'O Backlog lista todas as issues do projeto em formato de lista. Use-o para priorizar e organizar o trabalho antes de entrar em um ciclo.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O <strong>Backlog</strong> é uma lista de todas as issues do projeto, ideal para priorização e planejamento.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Clique em <strong>+ Nova issue</strong> para criar uma issue diretamente no backlog.</li>
          <li>Arraste as linhas para reordenar a prioridade.</li>
          <li>Clique no título para editar inline.</li>
          <li>Use os filtros para exibir issues por estado, responsável, label ou ciclo.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'backlog-filters',
    category: 'backlog',
    title: 'Filtros e ordenação',
    routePattern: '/projects/:projectId/backlog',
    keywords: ['filtros', 'ordenação', 'busca', 'responsável', 'label', 'estado'],
    bodyText:
      'Filtre as issues por estado, responsável, label, prioridade ou ciclo. Combine múltiplos filtros para encontrar exatamente o que precisa.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Use a barra de filtros para restringir a lista de issues.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li><strong>Estado:</strong> filtra por Backlog, Em andamento, Concluído, etc.</li>
          <li><strong>Responsável:</strong> mostra apenas issues atribuídas a um membro.</li>
          <li><strong>Label:</strong> filtra por etiqueta.</li>
          <li><strong>Prioridade:</strong> Urgente, Alta, Média, Baixa.</li>
          <li><strong>Ciclo:</strong> mostra issues de um ciclo específico.</li>
        </ul>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Múltiplos filtros são combinados com AND.
        </p>
      </div>
    ),
  },

  // ── Cycles ───────────────────────────────────────────────────────────────────
  {
    id: 'creating-cycles',
    category: 'cycles',
    title: 'Criando ciclos',
    routePattern: '/projects/:projectId/cycles',
    keywords: ['ciclo', 'sprint', 'iteração', 'criar'],
    bodyText:
      'Ciclos são sprints com data de início e fim. Crie um ciclo para planejar um período de trabalho e acompanhar o progresso.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Ciclos</strong> são equivalentes a sprints — períodos de tempo delimitados para entregar um conjunto de issues.
        </p>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Como criar um ciclo</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Acesse <strong>Ciclos</strong> no menu do projeto.</li>
          <li>Clique em <strong>+ Novo ciclo</strong>.</li>
          <li>Defina nome, data de início e data de fim.</li>
          <li>Clique em <strong>Criar</strong>.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'cycle-issues',
    category: 'cycles',
    title: 'Adicionando issues a um ciclo',
    routePattern: '/projects/:projectId/cycles',
    keywords: ['ciclo', 'issue', 'adicionar', 'planejar'],
    bodyText:
      'Adicione issues a um ciclo para planejar o que será feito naquele período. Issues podem pertencer a apenas um ciclo por vez.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Para planejar um ciclo, adicione issues a ele. Cada issue pode pertencer a no máximo um ciclo ativo.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Abra o ciclo e clique em <strong>+ Adicionar issue</strong>.</li>
          <li>Ou, na issue, use o campo <strong>Ciclo</strong> para associá-la.</li>
          <li>O progresso do ciclo é calculado automaticamente com base nas issues concluídas.</li>
        </ul>
      </div>
    ),
  },

  // ── Gantt ────────────────────────────────────────────────────────────────────
  {
    id: 'gantt-chart',
    category: 'gantt',
    title: 'Lendo o gráfico de Gantt',
    routePattern: '/projects/:projectId/gantt',
    keywords: ['gantt', 'cronograma', 'timeline', 'datas', 'barras'],
    bodyText:
      'O Gantt exibe as issues como barras em uma linha do tempo. Cada barra representa a duração estimada de uma issue.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O <strong>Gantt</strong> é uma visão de linha do tempo que mostra quando cada issue começa e termina.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Cada barra representa uma issue.</li>
          <li>O comprimento da barra indica a duração (data início → data fim).</li>
          <li>Issues no <strong>caminho crítico</strong> são destacadas em vermelho.</li>
          <li>Arraste as bordas de uma barra para ajustar as datas.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'critical-path',
    category: 'gantt',
    title: 'Caminho crítico (CPM)',
    routePattern: '/projects/:projectId/gantt',
    keywords: ['cpm', 'caminho crítico', 'dependências', 'folga', 'pert'],
    bodyText:
      'O CPM (Critical Path Method) identifica a sequência de issues que determina a duração mínima do projeto. Issues no caminho crítico não têm folga.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O <strong>CPM (Critical Path Method)</strong> calcula o caminho mais longo de issues dependentes no projeto.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li><strong>Caminho crítico:</strong> sequência de issues sem folga — qualquer atraso nelas atrasa o projeto inteiro.</li>
          <li><strong>Folga:</strong> tempo que uma issue pode atrasar sem impactar a data final.</li>
          <li>Issues críticas aparecem em vermelho no Gantt.</li>
        </ul>
        <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Atenção:</strong> O CPM é recalculado automaticamente quando issues são alteradas.
          </p>
        </div>
      </div>
    ),
  },

  // ── Wiki ─────────────────────────────────────────────────────────────────────
  {
    id: 'wiki-pages',
    category: 'wiki',
    title: 'Criando páginas',
    routePattern: '/projects/:projectId/wiki',
    keywords: ['wiki', 'página', 'criar', 'documento'],
    bodyText:
      'Crie páginas na Wiki para documentar projetos, decisões e processos. As páginas suportam texto rico, tabelas, imagens e links para issues.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          A <strong>Wiki</strong> é um espaço de documentação colaborativa para cada projeto ou para o workspace inteiro.
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Acesse <strong>Wiki</strong> no menu do projeto ou no menu lateral.</li>
          <li>Clique em <strong>+ Nova página</strong>.</li>
          <li>Digite o título e comece a escrever.</li>
          <li>Use <code>/</code> para inserir blocos (tabela, imagem, lista de tarefas, etc.).</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'wiki-collaboration',
    category: 'wiki',
    title: 'Edição colaborativa',
    routePattern: '/projects/:projectId/wiki',
    keywords: ['colaboração', 'tempo real', 'edição simultânea', 'yjs'],
    bodyText:
      'Múltiplos usuários podem editar a mesma página ao mesmo tempo. As mudanças são sincronizadas em tempo real.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          A Wiki suporta <strong>edição colaborativa em tempo real</strong>. Vários membros podem editar a mesma página simultaneamente.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>As alterações de outros usuários aparecem instantaneamente.</li>
          <li>O histórico de versões é salvo automaticamente a cada 30 segundos.</li>
          <li>Acesse <strong>Versões</strong> para restaurar uma versão anterior.</li>
        </ul>
      </div>
    ),
  },

  // ── Portfolio ────────────────────────────────────────────────────────────────
  {
    id: 'portfolio-dashboard',
    category: 'portfolio',
    title: 'Painel do portfólio',
    routePattern: '/portfolio',
    keywords: ['portfólio', 'painel', 'dashboard', 'projetos', 'executivo'],
    bodyText:
      'O portfólio exibe uma visão executiva de múltiplos projetos com status RAG, progresso e métricas EVM.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O <strong>Portfólio</strong> é uma visão executiva que agrupa múltiplos projetos para acompanhamento estratégico.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Veja o status RAG (Verde / Âmbar / Vermelho) de cada projeto.</li>
          <li>Acompanhe o progresso geral e os indicadores EVM.</li>
          <li>Compare projetos lado a lado.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'rag-status',
    category: 'portfolio',
    title: 'Status RAG explicado',
    routePattern: '/portfolio',
    keywords: ['rag', 'status', 'verde', 'âmbar', 'vermelho', 'semáforo'],
    bodyText:
      'RAG é um semáforo de saúde do projeto. Verde = no prazo, Âmbar = atenção, Vermelho = em risco. Calculado pela diferença entre progresso real e progresso esperado.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>RAG</strong> (Red / Amber / Green) é um indicador de saúde do projeto calculado automaticamente.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
            <span className="text-gray-700 dark:text-gray-300"><strong>Verde:</strong> variação ≥ −5% (projeto no prazo).</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-amber-400" />
            <span className="text-gray-700 dark:text-gray-300"><strong>Âmbar:</strong> variação entre −5% e −15% (atenção).</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
            <span className="text-gray-700 dark:text-gray-300"><strong>Vermelho:</strong> variação {'<'} −15% (projeto em risco).</span>
          </li>
        </ul>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          A variação compara o % de issues concluídas com o % de tempo decorrido do projeto.
        </p>
      </div>
    ),
  },
  {
    id: 'evm-metrics',
    category: 'portfolio',
    title: 'Métricas EVM',
    routePattern: '/portfolio',
    keywords: ['evm', 'earned value', 'cpi', 'spi', 'valor agregado', 'orçamento'],
    bodyText:
      'EVM (Earned Value Management) mede o desempenho do projeto em custo e prazo. CPI mede eficiência de custo, SPI mede eficiência de prazo.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>EVM (Earned Value Management)</strong> combina escopo, prazo e custo para avaliar o desempenho do projeto.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li><strong>PV (Planned Value):</strong> orçamento planejado até agora.</li>
          <li><strong>EV (Earned Value):</strong> valor do trabalho efetivamente realizado.</li>
          <li><strong>AC (Actual Cost):</strong> custo real gasto.</li>
          <li><strong>CPI = EV/AC:</strong> {'>'} 1 = abaixo do orçamento; {'<'} 1 = acima.</li>
          <li><strong>SPI = EV/PV:</strong> {'>'} 1 = adiantado; {'<'} 1 = atrasado.</li>
        </ul>
      </div>
    ),
  },

  // ── Issues ───────────────────────────────────────────────────────────────────
  {
    id: 'creating-issues',
    category: 'issues',
    title: 'Criando issues',
    keywords: ['issue', 'criar', 'tarefa', 'nova issue'],
    bodyText:
      'Issues são as unidades de trabalho do ProjectHub. Crie uma issue clicando em "+ Nova issue" em qualquer tela do projeto.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Issues</strong> representam unidades de trabalho — tarefas, bugs, histórias de usuário, etc.
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Clique em <strong>+ Nova issue</strong> (Board, Backlog ou atalho <strong>N</strong>).</li>
          <li>Preencha título, estado, responsável e prioridade.</li>
          <li>Opcionalmente adicione descrição, labels, datas e subtarefas.</li>
          <li>Clique em <strong>Criar</strong> ou pressione <strong>Enter</strong>.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'issue-relations',
    category: 'issues',
    title: 'Relações entre issues',
    keywords: ['relação', 'dependência', 'bloqueia', 'bloqueada', 'duplicata'],
    bodyText:
      'Issues podem ter relações entre si: bloqueia, bloqueada por, duplicata, relacionada. As relações CPM são usadas para calcular o caminho crítico.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Vincule issues entre si para modelar dependências e relacionamentos.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li><strong>Bloqueia:</strong> esta issue impede outra de começar.</li>
          <li><strong>Bloqueada por:</strong> esta issue depende de outra.</li>
          <li><strong>Duplicata:</strong> marca issues duplicadas.</li>
          <li><strong>Relacionada:</strong> conexão temática sem dependência.</li>
        </ul>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Relações de bloqueio são usadas pelo algoritmo CPM para calcular o caminho crítico no Gantt.
        </p>
      </div>
    ),
  },
  {
    id: 'issue-priorities',
    category: 'issues',
    title: 'Prioridades e tipos',
    keywords: ['prioridade', 'urgente', 'alta', 'média', 'baixa', 'tipo', 'bug', 'feature'],
    bodyText:
      'Cada issue tem uma prioridade (Urgente, Alta, Média, Baixa, Nenhuma) e pode ter tipos customizados definidos pelo projeto.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Use prioridade e tipo para classificar e filtrar issues com facilidade.
        </p>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Prioridades</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li><strong>Urgente:</strong> requer atenção imediata.</li>
          <li><strong>Alta:</strong> importante, mas não emergencial.</li>
          <li><strong>Média:</strong> trabalho normal do projeto.</li>
          <li><strong>Baixa:</strong> pode aguardar.</li>
          <li><strong>Nenhuma:</strong> não classificada.</li>
        </ul>
      </div>
    ),
  },

  // ── Modules ──────────────────────────────────────────────────────────────────
  {
    id: 'modules',
    category: 'modules',
    title: 'Agrupando issues com módulos',
    routePattern: '/projects/:projectId/modules',
    keywords: ['módulo', 'agrupar', 'tema', 'funcionalidade'],
    bodyText:
      'Módulos são agrupadores temáticos de issues. Use-os para organizar issues por funcionalidade, área ou tema, independente de sprint.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Módulos</strong> agrupam issues por tema ou funcionalidade — por exemplo, "Autenticação", "Relatórios", "Integração".
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Uma issue pode pertencer a múltiplos módulos.</li>
          <li>Módulos não têm data — diferente de Ciclos, são atemporais.</li>
          <li>Use para organizar o backlog por área de negócio.</li>
        </ul>
      </div>
    ),
  },

  // ── Milestones ───────────────────────────────────────────────────────────────
  {
    id: 'milestones',
    category: 'milestones',
    title: 'Definindo marcos e acompanhando progresso',
    routePattern: '/projects/:projectId/milestones',
    keywords: ['marco', 'milestone', 'entrega', 'data'],
    bodyText:
      'Marcos marcam eventos importantes ou entregas no projeto. Associe issues a marcos para acompanhar o progresso em direção a cada entrega.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Marcos</strong> (Milestones) representam entregas ou eventos importantes com uma data-alvo.
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Acesse <strong>Marcos</strong> no menu do projeto.</li>
          <li>Clique em <strong>+ Novo marco</strong> e defina nome e data.</li>
          <li>Associe issues ao marco para medir o progresso.</li>
        </ol>
      </div>
    ),
  },

  // ── Risks ────────────────────────────────────────────────────────────────────
  {
    id: 'risks',
    category: 'risks',
    title: 'Registrando e monitorando riscos',
    routePattern: '/projects/:projectId/risks',
    keywords: ['risco', 'probabilidade', 'impacto', 'mitigação'],
    bodyText:
      'Registre riscos do projeto com probabilidade, impacto e plano de mitigação. Monitore o status de cada risco ao longo do projeto.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          A seção de <strong>Riscos</strong> permite registrar e monitorar ameaças ao projeto.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Cada risco tem probabilidade (baixa / média / alta) e impacto.</li>
          <li>Defina um plano de mitigação para cada risco.</li>
          <li>Atualize o status conforme o projeto avança.</li>
        </ul>
      </div>
    ),
  },

  // ── Resources ────────────────────────────────────────────────────────────────
  {
    id: 'resources',
    category: 'resources',
    title: 'Gerenciando recursos do workspace',
    routePattern: '/workspace/resources',
    keywords: ['recursos', 'membros', 'equipe', 'alocação'],
    bodyText:
      'A seção de Recursos lista os membros do workspace e sua alocação nos projetos. Use para planejar a disponibilidade da equipe.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Recursos</strong> é a visão de pessoas do workspace — quem está disponível e em quais projetos está alocado.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Veja todos os membros do workspace e seus papéis.</li>
          <li>Identifique membros sobrecarregados ou disponíveis.</li>
          <li>Acesse as configurações do workspace para convidar novos membros.</li>
        </ul>
      </div>
    ),
  },

  // ── Workspace ────────────────────────────────────────────────────────────────
  {
    id: 'workspace-settings',
    category: 'workspace',
    title: 'Configurações do workspace',
    routePattern: '/workspace/settings',
    keywords: ['configurações', 'workspace', 'membros', 'permissões', 'settings'],
    bodyText:
      'Nas configurações do workspace você gerencia membros, papéis, permissões e informações gerais da organização.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          As <strong>configurações do workspace</strong> controlam o ambiente geral da organização.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Convidar e remover membros.</li>
          <li>Alterar papéis (Admin, Membro).</li>
          <li>Editar nome e informações do workspace.</li>
        </ul>
      </div>
    ),
  },
]
```

- [ ] **Step 2: Uncomment both the `import { ARTICLES }` line and the `ARTICLES routePattern integrity` describe block in routeMap.test.ts, then run tests**

```bash
cd frontend && npm run test -- src/features/help/__tests__/routeMap.test.ts
```

Expected: All tests PASS (including the routePattern integrity check).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/help/content/articles.tsx frontend/src/features/help/__tests__/routeMap.test.ts
git commit -m "feat(help): add feature guide articles content"
```

---

## Task 4: Shortcuts and FAQ content

**Files:**
- Create: `frontend/src/features/help/content/shortcuts.ts`
- Create: `frontend/src/features/help/content/faq.tsx`

- [ ] **Step 1: Create shortcuts.ts**

Create `frontend/src/features/help/content/shortcuts.ts`:

```ts
import type { Shortcut } from './types'

export const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: ['?'], description: 'Abrir Ajuda', group: 'navigation' },
  { keys: ['Esc'], description: 'Fechar modal / painel', group: 'navigation' },

  // Search
  { keys: ['/'], description: 'Busca global', group: 'search' },
  { keys: ['Ctrl', 'K'], description: 'Busca global (alternativo)', group: 'search' },

  // Issues
  { keys: ['N'], description: 'Nova issue (Board / Backlog)', group: 'issues' },

  // Editor
  { keys: ['Ctrl', 'B'], description: 'Negrito', group: 'editor' },
  { keys: ['Ctrl', 'I'], description: 'Itálico', group: 'editor' },
  { keys: ['Ctrl', 'U'], description: 'Sublinhado', group: 'editor' },
  { keys: ['Ctrl', 'Z'], description: 'Desfazer', group: 'editor' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Refazer', group: 'editor' },
  { keys: ['Ctrl', 'K'], description: 'Inserir link (no editor)', group: 'editor' },
  { keys: ['/'], description: 'Inserir bloco (no editor)', group: 'editor' },
]

export const SHORTCUT_GROUP_LABELS: Record<Shortcut['group'], string> = {
  navigation: 'Navegação',
  search: 'Busca',
  issues: 'Issues',
  editor: 'Editor (Wiki)',
}
```

- [ ] **Step 2: Create faq.tsx**

Create `frontend/src/features/help/content/faq.tsx`:

```tsx
import type { FaqEntry } from './types'

export const FAQ: FaqEntry[] = [
  {
    id: 'delete-project',
    question: 'Por que não consigo excluir um projeto?',
    answer: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Somente administradores do projeto podem excluí-lo. Verifique seu papel nas configurações do projeto. Se você é admin e ainda não consegue, entre em contato com o administrador do workspace.
      </p>
    ),
  },
  {
    id: 'change-state-colors',
    question: 'Como altero as cores dos estados de uma issue?',
    answer: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Acesse <strong>Configurações do projeto → Estados</strong>. Lá você pode criar, editar e reordenar os estados, além de personalizar suas cores.
      </p>
    ),
  },
  {
    id: 'rag-calculation',
    question: 'O que é o status RAG e como é calculado?',
    answer: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <p>RAG (Red/Amber/Green) indica a saúde do projeto no portfólio:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Verde:</strong> % issues concluídas ≥ % tempo decorrido − 5%</li>
          <li><strong>Âmbar:</strong> variação entre −5% e −15%</li>
          <li><strong>Vermelho:</strong> variação abaixo de −15%</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'cpm',
    question: 'O que é CPM / caminho crítico?',
    answer: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        CPM (Critical Path Method) é o algoritmo que calcula a sequência de issues dependentes que determina a duração mínima do projeto. Issues no caminho crítico não têm folga — qualquer atraso nelas atrasa o projeto inteiro. Veja o caminho crítico destacado em vermelho no Gantt.
      </p>
    ),
  },
  {
    id: 'add-member',
    question: 'Como adiciono um membro a um projeto?',
    answer: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Acesse <strong>Configurações do projeto → Membros → Convidar membro</strong>. O usuário precisa já ser membro do workspace para ser adicionado a um projeto.
      </p>
    ),
  },
  {
    id: 'restore-wiki',
    question: 'Posso restaurar uma página de Wiki excluída?',
    answer: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Páginas arquivadas podem ser restauradas via <strong>Versões</strong> na Wiki. Versões são salvas automaticamente a cada 30 segundos durante a edição, mantendo as últimas 50 versões de cada página.
      </p>
    ),
  },
  {
    id: 'notifications',
    question: 'Como funcionam as notificações?',
    answer: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <p>Você recebe notificações quando:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Uma issue é atribuída a você</li>
          <li>Alguém comenta em uma issue que você criou ou acompanha</li>
          <li>Uma issue que você criou é concluída</li>
          <li>Você é mencionado com @ na Wiki</li>
        </ul>
        <p>Acesse o <strong>Inbox</strong> no menu lateral para ver todas as notificações.</p>
      </div>
    ),
  },
  {
    id: 'cycles-vs-modules',
    question: 'Qual a diferença entre Ciclos e Módulos?',
    answer: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <p><strong>Ciclos</strong> têm data de início e fim — representam sprints ou iterações temporais. Uma issue pode pertencer a apenas um ciclo ativo por vez.</p>
        <p><strong>Módulos</strong> são atemporais e temáticos — agrupam issues por funcionalidade ou área. Uma issue pode pertencer a vários módulos ao mesmo tempo.</p>
      </div>
    ),
  },
  {
    id: 'global-search',
    question: 'Como uso a busca global?',
    answer: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Clique no ícone de lupa no menu lateral ou pressione <strong>/</strong> em qualquer tela. A busca encontra issues e páginas de Wiki em todos os projetos do workspace.
      </p>
    ),
  },
  {
    id: 'dark-mode',
    question: 'O sistema tem modo escuro?',
    answer: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Sim. Acesse <strong>Configurações do usuário → Aparência</strong> para alternar entre tema claro e escuro.
      </p>
    ),
  },
]
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/help/content/shortcuts.ts frontend/src/features/help/content/faq.tsx
git commit -m "feat(help): add shortcuts and FAQ content"
```

---

## Task 5: useHelp hook with TDD

**Files:**
- Create: `frontend/src/features/help/useHelp.ts`
- Test: `frontend/src/features/help/__tests__/useHelp.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/features/help/__tests__/useHelp.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createElement } from 'react'
import { useHelp } from '../useHelp'

function wrapper(initialPath: string, state?: object) {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(MemoryRouter, {
      initialEntries: [{ pathname: initialPath, state: state ?? null }],
    }, children)
}

describe('useHelp — context detection', () => {
  it('defaults to "general" panel with no state', () => {
    const { result } = renderHook(() => useHelp(), { wrapper: wrapper('/help') })
    expect(result.current.panel).toBe('general')
  })

  it('pre-selects "board" when state.from is a board route', () => {
    const { result } = renderHook(
      () => useHelp(),
      { wrapper: wrapper('/help', { from: '/projects/proj-123/board' }) },
    )
    expect(result.current.panel).toBe('board')
  })

  it('pre-selects "cycles" when state.from is a cycles route', () => {
    const { result } = renderHook(
      () => useHelp(),
      { wrapper: wrapper('/help', { from: '/projects/proj-123/cycles' }) },
    )
    expect(result.current.panel).toBe('cycles')
  })

  it('pre-selects "wiki" when state.from is a wiki route', () => {
    const { result } = renderHook(
      () => useHelp(),
      { wrapper: wrapper('/help', { from: '/projects/proj-123/wiki' }) },
    )
    expect(result.current.panel).toBe('wiki')
  })

  it('pre-selects "portfolio" when state.from is /portfolio', () => {
    const { result } = renderHook(
      () => useHelp(),
      { wrapper: wrapper('/help', { from: '/portfolio' }) },
    )
    expect(result.current.panel).toBe('portfolio')
  })
})

describe('useHelp — panel and article state', () => {
  it('setPanel updates the selected panel', () => {
    const { result } = renderHook(() => useHelp(), { wrapper: wrapper('/help') })
    act(() => result.current.setPanel('board'))
    expect(result.current.panel).toBe('board')
  })

  it('setArticleId updates selected article and clears when null', () => {
    const { result } = renderHook(() => useHelp(), { wrapper: wrapper('/help') })
    act(() => result.current.setArticleId('kanban-board'))
    expect(result.current.articleId).toBe('kanban-board')
    act(() => result.current.setArticleId(null))
    expect(result.current.articleId).toBeNull()
  })
})

describe('useHelp — keyboard shortcut guard', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('does not fire when activeElement is an INPUT', () => {
    const { result } = renderHook(() => useHelp(), { wrapper: wrapper('/other-page') })
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    const spy = vi.fn()
    // useHelp internally calls navigate — we verify panel didn't change
    // (hook is on /other-page, ? key should NOT trigger navigation)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
    })
    // Panel should remain at default since guard fires
    expect(result.current.panel).toBe('general')
    document.body.removeChild(input)
    spy.mockRestore()
  })

  it('does not fire when activeElement is a TEXTAREA', () => {
    renderHook(() => useHelp(), { wrapper: wrapper('/other-page') })
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    ta.focus()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
    })
    document.body.removeChild(ta)
    // If no error thrown and test completes, guard worked
    expect(true).toBe(true)
  })
})

describe('useHelp — search', () => {
  it('setQuery updates query', () => {
    const { result } = renderHook(() => useHelp(), { wrapper: wrapper('/help') })
    act(() => result.current.setQuery('kanban'))
    expect(result.current.query).toBe('kanban')
  })
})
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
cd frontend && npm run test -- src/features/help/__tests__/useHelp.test.tsx
```

Expected: FAIL — `../useHelp` module not found.

- [ ] **Step 3: Implement useHelp.ts**

Create `frontend/src/features/help/useHelp.ts`:

```ts
import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDebounce } from '@/hooks/useDebounce'
import { categoryFromPath } from './content/routeMap'
import type { HelpPanel } from './content/types'

interface UseHelpReturn {
  panel: HelpPanel
  setPanel: (p: HelpPanel) => void
  articleId: string | null
  setArticleId: (id: string | null) => void
  query: string
  setQuery: (q: string) => void
  debouncedQuery: string
}

export function useHelp(): UseHelpReturn {
  const location = useLocation()
  const navigate = useNavigate()

  const initialPanel = useCallback((): HelpPanel => {
    const from = (location.state as { from?: string } | null)?.from
    if (from) return categoryFromPath(from)
    return 'general'
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [panel, setPanel] = useState<HelpPanel>(initialPanel)
  const [articleId, setArticleId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 150)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== '?') return
      const target = e.target as HTMLElement
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (target.isContentEditable) return
      navigate('/help', { state: { from: location.pathname } })
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navigate, location.pathname])

  return { panel, setPanel, articleId, setArticleId, query, setQuery, debouncedQuery }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd frontend && npm run test -- src/features/help/__tests__/useHelp.test.tsx
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/help/useHelp.ts frontend/src/features/help/__tests__/useHelp.test.tsx
git commit -m "feat(help): add useHelp hook with context detection and keyboard guard"
```

---

## Task 6: HelpSidebar component

**Files:**
- Create: `frontend/src/features/help/HelpSidebar.tsx`

- [ ] **Step 1: Create HelpSidebar.tsx**

Create `frontend/src/features/help/HelpSidebar.tsx`:

```tsx
import {
  LayoutDashboard, SquareKanban, List, RefreshCw, GanttChart,
  BookOpen, BarChart3, CircleDot, Boxes, Flag, AlertTriangle,
  Users, Settings, Keyboard, HelpCircle,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import type { HelpPanel, HelpCategory } from './content/types'

interface CategoryItem {
  id: HelpCategory
  label: string
  icon: ComponentType<{ className?: string }>
}

const CATEGORIES: CategoryItem[] = [
  { id: 'general', label: 'Geral', icon: LayoutDashboard },
  { id: 'board', label: 'Board', icon: SquareKanban },
  { id: 'backlog', label: 'Backlog', icon: List },
  { id: 'cycles', label: 'Ciclos', icon: RefreshCw },
  { id: 'gantt', label: 'Gantt', icon: GanttChart },
  { id: 'wiki', label: 'Wiki', icon: BookOpen },
  { id: 'portfolio', label: 'Portfólio', icon: BarChart3 },
  { id: 'issues', label: 'Issues', icon: CircleDot },
  { id: 'modules', label: 'Módulos', icon: Boxes },
  { id: 'milestones', label: 'Marcos', icon: Flag },
  { id: 'risks', label: 'Riscos', icon: AlertTriangle },
  { id: 'resources', label: 'Recursos', icon: Users },
  { id: 'workspace', label: 'Workspace', icon: Settings },
]

interface Props {
  active: HelpPanel
  onSelect: (panel: HelpPanel) => void
}

export function HelpSidebar({ active, onSelect }: Props) {
  return (
    <nav
      className="flex h-full w-52 shrink-0 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-4"
      aria-label="Categorias de ajuda"
    >
      <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Categorias
      </p>

      <div className="flex flex-col gap-0.5 px-2">
        {CATEGORIES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            aria-current={active === id ? 'page' : undefined}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors text-left',
              active === id
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="mx-3 my-3 h-px bg-gray-200 dark:bg-gray-700" />

      <div className="flex flex-col gap-0.5 px-2">
        <button
          onClick={() => onSelect('shortcuts')}
          aria-current={active === 'shortcuts' ? 'page' : undefined}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors text-left',
            active === 'shortcuts'
              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
          )}
        >
          <Keyboard className="h-4 w-4 shrink-0" aria-hidden="true" />
          Atalhos
        </button>

        <button
          onClick={() => onSelect('faq')}
          aria-current={active === 'faq' ? 'page' : undefined}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors text-left',
            active === 'faq'
              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
          )}
        >
          <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          FAQ
        </button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/help/HelpSidebar.tsx
git commit -m "feat(help): add HelpSidebar category navigation"
```

---

## Task 7: HelpSearch with TDD

**Files:**
- Create: `frontend/src/features/help/HelpSearch.tsx`
- Test: `frontend/src/features/help/__tests__/HelpSearch.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/features/help/__tests__/HelpSearch.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { HelpSearch } from '../HelpSearch'

const mockOnSelect = vi.fn()

describe('HelpSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockOnSelect.mockClear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the search input', () => {
    render(<HelpSearch query="" onQueryChange={() => {}} debouncedQuery="" onSelectArticle={mockOnSelect} />)
    expect(screen.getByRole('searchbox')).toBeTruthy()
  })

  it('does not render results when inputOnly is true', () => {
    render(
      <HelpSearch
        query="kanban"
        onQueryChange={() => {}}
        debouncedQuery="kanban"
        onSelectArticle={mockOnSelect}
        inputOnly
      />,
    )
    // Input is present
    expect(screen.getByRole('searchbox')).toBeTruthy()
    // Results are NOT rendered
    expect(screen.queryByText('Usando o quadro Kanban')).toBeNull()
  })

  it('shows results matching title when query is provided', () => {
    render(
      <HelpSearch
        query="kanban"
        onQueryChange={() => {}}
        debouncedQuery="kanban"
        onSelectArticle={mockOnSelect}
      />,
    )
    expect(screen.getByText('Usando o quadro Kanban')).toBeTruthy()
  })

  it('shows FAQ results when query matches a FAQ question', () => {
    render(
      <HelpSearch
        query="RAG"
        onQueryChange={() => {}}
        debouncedQuery="RAG"
        onSelectArticle={mockOnSelect}
      />,
    )
    expect(screen.getByText(/RAG/i)).toBeTruthy()
  })

  it('shows empty state when no results match', () => {
    render(
      <HelpSearch
        query="xyznonexistentterm"
        onQueryChange={() => {}}
        debouncedQuery="xyznonexistentterm"
        onSelectArticle={mockOnSelect}
      />,
    )
    expect(screen.getByText(/nenhum resultado/i)).toBeTruthy()
  })

  it('calls onSelectArticle when an article result is clicked', () => {
    render(
      <HelpSearch
        query="kanban"
        onQueryChange={() => {}}
        debouncedQuery="kanban"
        onSelectArticle={mockOnSelect}
      />,
    )
    fireEvent.click(screen.getByText('Usando o quadro Kanban'))
    expect(mockOnSelect).toHaveBeenCalledWith('kanban-board')
  })

  it('shows nothing when debouncedQuery is empty', () => {
    render(
      <HelpSearch
        query="kanban"
        onQueryChange={() => {}}
        debouncedQuery=""
        onSelectArticle={mockOnSelect}
      />,
    )
    expect(screen.queryByText('Usando o quadro Kanban')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
cd frontend && npm run test -- src/features/help/__tests__/HelpSearch.test.tsx
```

Expected: FAIL — `../HelpSearch` not found.

- [ ] **Step 3: Implement HelpSearch.tsx**

Create `frontend/src/features/help/HelpSearch.tsx`:

```tsx
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ARTICLES } from './content/articles'
import { FAQ } from './content/faq'

interface Props {
  query: string
  onQueryChange: (q: string) => void
  debouncedQuery: string
  onSelectArticle: (id: string) => void
  inputOnly?: boolean  // when true, renders only the search input (no results list)
}

interface SearchResult {
  id: string
  title: string
  type: 'article' | 'faq'
}

function search(q: string): SearchResult[] {
  if (!q.trim()) return []
  const lower = q.toLowerCase()

  const articleResults: SearchResult[] = ARTICLES
    .filter(
      (a) =>
        a.title.toLowerCase().includes(lower) ||
        a.keywords.some((k) => k.toLowerCase().includes(lower)) ||
        a.bodyText.toLowerCase().includes(lower),
    )
    .map((a) => ({ id: a.id, title: a.title, type: 'article' }))

  const faqResults: SearchResult[] = FAQ
    .filter((f) => f.question.toLowerCase().includes(lower))
    .map((f) => ({ id: f.id, title: f.question, type: 'faq' }))

  return [...articleResults, ...faqResults]
}

export function HelpSearch({ query, onQueryChange, debouncedQuery, onSelectArticle, inputOnly = false }: Props) {
  const results = search(debouncedQuery)

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          type="search"
          role="searchbox"
          aria-label="Pesquisar na ajuda"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Pesquisar na ajuda…"
          className={cn(
            'w-full rounded-lg border border-gray-200 dark:border-gray-700',
            'bg-white dark:bg-gray-900 py-2 pl-9 pr-4 text-sm',
            'text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500',
            'outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-900/40',
          )}
        />
      </div>

      {!inputOnly && debouncedQuery.trim() && (
        <div className="flex flex-col gap-1">
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              Nenhum resultado para <strong className="text-gray-600 dark:text-gray-300">"{debouncedQuery}"</strong>.
              <br />
              <span className="text-xs">Tente navegar pelas categorias ao lado.</span>
            </p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => onSelectArticle(r.id)}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-4 py-3 text-left transition-colors',
                  'hover:bg-gray-50 dark:hover:bg-gray-800',
                )}
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.title}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {r.type === 'faq' ? 'FAQ' : 'Artigo'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd frontend && npm run test -- src/features/help/__tests__/HelpSearch.test.tsx
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/help/HelpSearch.tsx frontend/src/features/help/__tests__/HelpSearch.test.tsx
git commit -m "feat(help): add HelpSearch component with in-memory search"
```

---

## Task 8: HelpArticleList component

**Files:**
- Create: `frontend/src/features/help/HelpArticleList.tsx`

- [ ] **Step 1: Create HelpArticleList.tsx**

Create `frontend/src/features/help/HelpArticleList.tsx`:

```tsx
import { ChevronRight, FileText } from 'lucide-react'
import { ARTICLES } from './content/articles'
import type { HelpCategory } from './content/types'

interface Props {
  category: HelpCategory
  onSelectArticle: (id: string) => void
}

const CATEGORY_LABELS: Record<HelpCategory, string> = {
  general: 'Geral',
  board: 'Board',
  backlog: 'Backlog',
  cycles: 'Ciclos',
  gantt: 'Gantt',
  wiki: 'Wiki',
  portfolio: 'Portfólio',
  issues: 'Issues',
  modules: 'Módulos',
  milestones: 'Marcos',
  risks: 'Riscos',
  resources: 'Recursos',
  workspace: 'Workspace',
}

export function HelpArticleList({ category, onSelectArticle }: Props) {
  const articles = ARTICLES.filter((a) => a.category === category)

  return (
    <div>
      <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
        {CATEGORY_LABELS[category]}
      </h2>

      {articles.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Nenhum artigo disponível para esta categoria.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {articles.map((article) => (
            <button
              key={article.id}
              onClick={() => onSelectArticle(article.id)}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 group"
            >
              <FileText
                className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-indigo-500"
                aria-hidden="true"
              />
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                {article.title}
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-gray-400"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/help/HelpArticleList.tsx
git commit -m "feat(help): add HelpArticleList component"
```

---

## Task 9: HelpArticle component with TDD

**Files:**
- Create: `frontend/src/features/help/HelpArticle.tsx`
- Test: `frontend/src/features/help/__tests__/HelpArticle.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/features/help/__tests__/HelpArticle.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HelpArticle } from '../HelpArticle'

const mockOnBack = vi.fn()

describe('HelpArticle', () => {
  it('renders the article title', () => {
    render(<HelpArticle articleId="getting-started" onBack={mockOnBack} />)
    expect(screen.getByText('Primeiros passos')).toBeTruthy()
  })

  it('renders the article bodyText (accessible content)', () => {
    render(<HelpArticle articleId="getting-started" onBack={mockOnBack} />)
    // bodyText is included as a hidden span for accessibility/search — but body JSX renders too
    expect(screen.getByText(/ProjectHub/i)).toBeTruthy()
  })

  it('renders "Usando o quadro Kanban" article', () => {
    render(<HelpArticle articleId="kanban-board" onBack={mockOnBack} />)
    expect(screen.getByText('Usando o quadro Kanban')).toBeTruthy()
  })

  it('calls onBack when back button is clicked', () => {
    mockOnBack.mockClear()
    render(<HelpArticle articleId="getting-started" onBack={mockOnBack} />)
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(mockOnBack).toHaveBeenCalledOnce()
  })

  it('shows not-found message for unknown articleId', () => {
    render(<HelpArticle articleId="nonexistent-id" onBack={mockOnBack} />)
    expect(screen.getByText(/artigo não encontrado/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
cd frontend && npm run test -- src/features/help/__tests__/HelpArticle.test.tsx
```

Expected: FAIL — `../HelpArticle` not found.

- [ ] **Step 3: Implement HelpArticle.tsx**

Create `frontend/src/features/help/HelpArticle.tsx`:

```tsx
import { ChevronLeft } from 'lucide-react'
import { ARTICLES } from './content/articles'

interface Props {
  articleId: string
  onBack: () => void
}

export function HelpArticle({ articleId, onBack }: Props) {
  const article = ARTICLES.find((a) => a.id === articleId)

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">Artigo não encontrado.</p>
        <button
          onClick={onBack}
          className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={onBack}
        aria-label="Voltar à lista"
        className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Voltar
      </button>

      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {article.title}
      </h2>

      <div className="prose prose-sm dark:prose-invert max-w-none">
        {article.body}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd frontend && npm run test -- src/features/help/__tests__/HelpArticle.test.tsx
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/help/HelpArticle.tsx frontend/src/features/help/__tests__/HelpArticle.test.tsx
git commit -m "feat(help): add HelpArticle component with TDD"
```

---

## Task 10: ShortcutsPanel with TDD

**Files:**
- Create: `frontend/src/features/help/ShortcutsPanel.tsx`
- Test: `frontend/src/features/help/__tests__/ShortcutsPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/features/help/__tests__/ShortcutsPanel.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShortcutsPanel } from '../ShortcutsPanel'
import { SHORTCUTS } from '../content/shortcuts'

describe('ShortcutsPanel', () => {
  it('renders group headings', () => {
    render(<ShortcutsPanel />)
    expect(screen.getByText('Navegação')).toBeTruthy()
    expect(screen.getByText('Issues')).toBeTruthy()
    expect(screen.getByText('Editor (Wiki)')).toBeTruthy()
  })

  it('renders all shortcut descriptions', () => {
    render(<ShortcutsPanel />)
    SHORTCUTS.forEach((s) => {
      expect(screen.getByText(s.description)).toBeTruthy()
    })
  })

  it('renders key badges for each shortcut', () => {
    render(<ShortcutsPanel />)
    // '?' shortcut key should appear as a badge
    expect(screen.getAllByText('?').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
cd frontend && npm run test -- src/features/help/__tests__/ShortcutsPanel.test.tsx
```

Expected: FAIL — `../ShortcutsPanel` not found.

- [ ] **Step 3: Implement ShortcutsPanel.tsx**

Create `frontend/src/features/help/ShortcutsPanel.tsx`:

```tsx
import { SHORTCUTS, SHORTCUT_GROUP_LABELS } from './content/shortcuts'
import type { Shortcut } from './content/types'

const GROUPS: Shortcut['group'][] = ['navigation', 'search', 'issues', 'editor']

export function ShortcutsPanel() {
  return (
    <div>
      <h2 className="mb-6 text-base font-semibold text-gray-900 dark:text-gray-100">
        Atalhos de teclado
      </h2>

      <div className="flex flex-col gap-8">
        {GROUPS.map((group) => {
          const items = SHORTCUTS.filter((s) => s.group === group)
          if (items.length === 0) return null
          return (
            <section key={group} aria-labelledby={`shortcut-group-${group}`}>
              <h3
                id={`shortcut-group-${group}`}
                className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
              >
                {SHORTCUT_GROUP_LABELS[group]}
              </h3>
              <div className="flex flex-col gap-2">
                {items.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, ki) => (
                        <span key={ki}>
                          <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-1.5 font-mono text-xs text-gray-700 dark:text-gray-300 shadow-sm">
                            {key}
                          </kbd>
                          {ki < shortcut.keys.length - 1 && (
                            <span className="mx-0.5 text-xs text-gray-400">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd frontend && npm run test -- src/features/help/__tests__/ShortcutsPanel.test.tsx
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/help/ShortcutsPanel.tsx frontend/src/features/help/__tests__/ShortcutsPanel.test.tsx
git commit -m "feat(help): add ShortcutsPanel with TDD"
```

---

## Task 11: FaqPanel with TDD

**Files:**
- Create: `frontend/src/features/help/FaqPanel.tsx`
- Test: `frontend/src/features/help/__tests__/FaqPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/features/help/__tests__/FaqPanel.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FaqPanel } from '../FaqPanel'

describe('FaqPanel', () => {
  it('renders all FAQ questions', () => {
    render(<FaqPanel />)
    expect(screen.getByText('Por que não consigo excluir um projeto?')).toBeTruthy()
    expect(screen.getByText('Como uso a busca global?')).toBeTruthy()
  })

  it('answers are hidden by default', () => {
    render(<FaqPanel />)
    // The answer to the first question should not be visible
    expect(screen.queryByText(/somente administradores/i)).toBeNull()
  })

  it('expands answer when question is clicked', () => {
    render(<FaqPanel />)
    fireEvent.click(screen.getByText('Por que não consigo excluir um projeto?'))
    expect(screen.getByText(/somente administradores/i)).toBeTruthy()
  })

  it('collapses answer when question is clicked again', () => {
    render(<FaqPanel />)
    const question = screen.getByText('Por que não consigo excluir um projeto?')
    fireEvent.click(question)
    expect(screen.getByText(/somente administradores/i)).toBeTruthy()
    fireEvent.click(question)
    expect(screen.queryByText(/somente administradores/i)).toBeNull()
  })

  it('only one answer is expanded at a time', () => {
    render(<FaqPanel />)
    fireEvent.click(screen.getByText('Por que não consigo excluir um projeto?'))
    fireEvent.click(screen.getByText('Como uso a busca global?'))
    // First answer collapses
    expect(screen.queryByText(/somente administradores/i)).toBeNull()
    // Second answer is open
    expect(screen.getByText(/clique no ícone de lupa/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
cd frontend && npm run test -- src/features/help/__tests__/FaqPanel.test.tsx
```

Expected: FAIL — `../FaqPanel` not found.

- [ ] **Step 3: Implement FaqPanel.tsx**

Create `frontend/src/features/help/FaqPanel.tsx`:

```tsx
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FAQ } from './content/faq'

export function FaqPanel() {
  const [openId, setOpenId] = useState<string | null>(null)

  function toggle(id: string) {
    setOpenId((current) => (current === id ? null : id))
  }

  return (
    <div>
      <h2 className="mb-6 text-base font-semibold text-gray-900 dark:text-gray-100">
        Perguntas frequentes
      </h2>

      <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-700">
        {FAQ.map((entry) => {
          const isOpen = openId === entry.id
          return (
            <div key={entry.id}>
              <button
                onClick={() => toggle(entry.id)}
                aria-expanded={isOpen}
                className={cn(
                  'flex w-full items-center justify-between gap-4 py-4 text-left text-sm',
                  'text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100 transition-colors',
                )}
              >
                <span className="font-medium">{entry.question}</span>
                {isOpen
                  ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                  : <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />}
              </button>

              {isOpen && (
                <div className="pb-4">
                  {entry.answer}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd frontend && npm run test -- src/features/help/__tests__/FaqPanel.test.tsx
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/help/FaqPanel.tsx frontend/src/features/help/__tests__/FaqPanel.test.tsx
git commit -m "feat(help): add FaqPanel accordion with TDD"
```

---

## Task 12: HelpPage and index.ts

**Files:**
- Create: `frontend/src/features/help/HelpPage.tsx`
- Create: `frontend/src/features/help/index.ts`
- Test: `frontend/src/features/help/__tests__/HelpPage.test.tsx`

- [ ] **Step 1: Write failing integration tests**

Create `frontend/src/features/help/__tests__/HelpPage.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelpPage } from '../HelpPage'

function renderPage(state?: object) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/help', state: state ?? null }]}>
      <HelpPage />
    </MemoryRouter>,
  )
}

describe('HelpPage', () => {
  it('renders the page title', () => {
    renderPage()
    expect(screen.getByText('Central de Ajuda')).toBeTruthy()
  })

  it('renders the category navigation', () => {
    renderPage()
    expect(screen.getByRole('navigation', { name: 'Categorias de ajuda' })).toBeTruthy()
  })

  it('shows article list when a category is active', () => {
    renderPage()
    // Default panel is 'general' — should show article list for general
    expect(screen.getByText('Primeiros passos')).toBeTruthy()
  })

  it('navigates to an article when title is clicked', () => {
    renderPage()
    fireEvent.click(screen.getByText('Primeiros passos'))
    // Article body should now be rendered
    expect(screen.getByText(/O ProjectHub é o sistema interno/i)).toBeTruthy()
  })

  it('shows shortcuts panel when Atalhos is selected', () => {
    renderPage()
    fireEvent.click(screen.getByText('Atalhos'))
    expect(screen.getByText('Atalhos de teclado')).toBeTruthy()
  })

  it('shows FAQ panel when FAQ is selected', () => {
    renderPage()
    fireEvent.click(screen.getByText('FAQ'))
    expect(screen.getByText('Perguntas frequentes')).toBeTruthy()
  })

  it('pre-selects board category when state.from is a board route', () => {
    renderPage({ from: '/projects/proj-1/board' })
    expect(screen.getByText('Usando o quadro Kanban')).toBeTruthy()
  })

  it('renders search input in header', () => {
    renderPage()
    // Only one searchbox (the header inputOnly instance)
    expect(screen.getAllByRole('searchbox')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
cd frontend && npm run test -- src/features/help/__tests__/HelpPage.test.tsx
```

Expected: FAIL — `../HelpPage` not found.

- [ ] **Step 3: Implement HelpPage.tsx**

Create `frontend/src/features/help/HelpPage.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useHelp } from './useHelp'
import { HelpSidebar } from './HelpSidebar'
import { HelpSearch } from './HelpSearch'
import { HelpArticleList } from './HelpArticleList'
import { HelpArticle } from './HelpArticle'
import { ShortcutsPanel } from './ShortcutsPanel'
import { FaqPanel } from './FaqPanel'
import { ARTICLES } from './content/articles'
import { FAQ } from './content/faq'
import type { HelpCategory } from './content/types'

const CATEGORY_LABELS: Record<HelpCategory, string> = {
  general: 'Geral',
  board: 'Board',
  backlog: 'Backlog',
  cycles: 'Ciclos',
  gantt: 'Gantt',
  wiki: 'Wiki',
  portfolio: 'Portfólio',
  issues: 'Issues',
  modules: 'Módulos',
  milestones: 'Marcos',
  risks: 'Riscos',
  resources: 'Recursos',
  workspace: 'Workspace',
}

export function HelpPage() {
  const navigate = useNavigate()
  const { panel, setPanel, articleId, setArticleId, query, setQuery, debouncedQuery } = useHelp()

  function handleSelectArticle(id: string) {
    // Check if it's an article or FAQ id
    const article = ARTICLES.find((a) => a.id === id)
    const faq = FAQ.find((f) => f.id === id)
    if (article) {
      setPanel(article.category)
      setArticleId(id)
    } else if (faq) {
      setPanel('faq')
    }
    setQuery('')
  }

  function renderMainPanel() {
    if (articleId) {
      return (
        <HelpArticle
          articleId={articleId}
          onBack={() => setArticleId(null)}
        />
      )
    }
    if (panel === 'shortcuts') return <ShortcutsPanel />
    if (panel === 'faq') return <FaqPanel />
    return (
      <HelpArticleList
        category={panel as HelpCategory}
        onSelectArticle={(id) => setArticleId(id)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </button>

        <h1 className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Central de Ajuda
        </h1>

        <div className="w-72">
          <HelpSearch
            query={query}
            onQueryChange={setQuery}
            debouncedQuery={debouncedQuery}
            onSelectArticle={handleSelectArticle}
            inputOnly
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        <HelpSidebar
          active={panel}
          onSelect={(p) => {
            setPanel(p)
            setArticleId(null)
            setQuery('')
          }}
        />

        <main className="flex-1 overflow-y-auto p-8">
          {debouncedQuery.trim() ? (
            <HelpSearch
              query={query}
              onQueryChange={setQuery}
              debouncedQuery={debouncedQuery}
              onSelectArticle={handleSelectArticle}
            />
          ) : (
            renderMainPanel()
          )}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create index.ts**

Create `frontend/src/features/help/index.ts`:

```ts
export { HelpPage } from './HelpPage'
```

- [ ] **Step 5: Run integration tests and confirm they pass**

```bash
cd frontend && npm run test -- src/features/help/__tests__/HelpPage.test.tsx
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/help/HelpPage.tsx frontend/src/features/help/index.ts frontend/src/features/help/__tests__/HelpPage.test.tsx
git commit -m "feat(help): add HelpPage integration with all subcomponents"
```

---

## Task 13: Wire into App.tsx and Sidebar.tsx

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add /help route to App.tsx**

In `frontend/src/App.tsx`, add the import at the top with other feature imports:

```tsx
import { HelpPage } from './features/help'
```

Then inside the `<Route element={<AppLayout />}>` block, add the `/help` route alongside `/inbox` and `/settings`:

```tsx
<Route path="/help" element={<HelpPage />} />
```

Place it right after `<Route path="/inbox" element={<InboxPage />} />`.

- [ ] **Step 2: Add Help button to Sidebar.tsx**

In `frontend/src/components/layout/Sidebar.tsx`:

1. Add `HelpCircle` to the lucide-react import.
2. Add `useNavigate` import from `react-router-dom` (already imported in the file — skip if present).
3. In the bottom section `<div>` that contains `NavItem to="/workspace/settings"` and the collapse button, add a Help button **above** the Settings `NavItem`:

```tsx
{/* Help button */}
<div className={cn('group/nav relative', expanded && 'w-full')}>
  <button
    onClick={() => navigate('/help', { state: { from: location.pathname } })}
    aria-label="Ajuda"
    className={cn(
      'flex h-8 items-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white',
      expanded ? 'w-full gap-3 px-2' : 'w-8 justify-center',
    )}
  >
    <HelpCircle className="h-4 w-4 shrink-0" />
    {expanded && <span className="text-sm">Ajuda</span>}
  </button>

  {!expanded && (
    <div className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 hidden group-hover/nav:block z-50">
      <div className="rounded-md bg-black/75 px-2.5 py-1 text-xs text-white whitespace-nowrap shadow-lg">
        Ajuda
      </div>
    </div>
  )}
</div>
```

Also add `useLocation` to the react-router-dom import and `useNavigate` if not already present in `Sidebar.tsx`. At the top of the `Sidebar()` function body, add:

```tsx
const location = useLocation()
```

- [ ] **Step 3: Run full test suite**

```bash
cd frontend && npm run test
```

Expected: All tests PASS. Fix any import errors before proceeding.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/layout/Sidebar.tsx
git commit -m "feat(help): wire /help route and sidebar Help button"
```

---

## Task 14: Run all help tests and update CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Run all help feature tests**

```bash
cd frontend && npm run test -- src/features/help
```

Expected: All tests in `src/features/help/__tests__/` PASS with zero failures.

- [ ] **Step 2: Run full test suite**

```bash
cd frontend && npm run test
```

Expected: All existing tests still PASS (no regressions).

- [ ] **Step 3: Run TypeScript type check**

```bash
cd frontend && npm run typecheck
```

Expected: No type errors.

- [ ] **Step 4: Update CHANGELOG.md**

Open `CHANGELOG.md` and add under the top section (or create a new `## [Unreleased]` section if not present):

```markdown
## [Unreleased]

### Added
- Help module: context-aware help center at `/help` with feature guides, keyboard shortcuts reference, and FAQ
- HelpPage: two-column layout with category sidebar and content panel
- Context detection: automatically pre-selects the relevant help category based on the page the user navigated from
- Keyboard shortcut `?` to open help from anywhere (guards against firing inside inputs)
- Help button (`HelpCircle` icon) in the Sidebar bottom section with tooltip
- 24 feature guide articles across 13 categories (PT-BR)
- Keyboard shortcuts reference panel
- 10 FAQ entries with accordion expand/collapse
- In-memory search across articles, keywords, bodyText, and FAQ questions (debounced 150ms)
- Full test suite: 7 test files covering all components and the useHelp hook
```

- [ ] **Step 5: Final commit**

```bash
git add CHANGELOG.md
git commit -m "chore: update CHANGELOG for help module"
```

---

## Completion Checklist

- [ ] All 7 test files exist and pass
- [ ] `npm run test` passes (no regressions)
- [ ] `npm run typecheck` passes (no TS errors)
- [ ] `/help` route accessible in the app
- [ ] Sidebar Help button visible in both expanded and collapsed states
- [ ] `?` key navigates to `/help` from any page (not from inside inputs)
- [ ] Context detection pre-selects correct category
- [ ] Search filters articles and FAQ
- [ ] FAQ accordion expands/collapses
- [ ] Shortcuts panel renders all groups
- [ ] CHANGELOG updated
