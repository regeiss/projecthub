# Changelog

Todas as mudanças notáveis do ProjectHub são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [Unreleased]

### Adicionado
- **Dark mode — feature pages completas (2026-03-13)**:
  - Aplicadas classes `dark:` em todas as páginas de feature restantes (26 arquivos):
    - **Backlog**: `BacklogPage` — header, colunas, linhas de issue, grupos de estado.
    - **Board**: `BoardFilters` — label e select de estado; `BoardPage` — barra de filtros e divisores de colunas.
    - **Cycles**: `CyclesPage` — cards de ciclo, estado vazio; `CycleDetail` — barra de progresso, lista de issues.
    - **Gantt**: `GanttChart` — cabeçalho, linhas, barra de timeline; `GanttPage` — toolbar, toggle de view, strip de baselines; `NetworkDiagram` — nós CPM, estado vazio.
    - **Issues**: `IssueActivity` — texto de atividade e timestamps; `IssueDetailPage` — título, comentários, sidebar de metadados; `IssueForm` — todos os labels e selects.
    - **Milestones**: `MilestonesPage` — cards, barra de progresso, estado vazio.
    - **Modules**: `ModulesPage` — cards, modal, seções agrupadas, estado vazio.
    - **Notifications**: `NotificationBell` — trigger e popover; `NotificationPanel` — lista, items lidos/não-lidos.
    - **Portfolio**: `ExecutiveDashboard` — tabela de projetos, EVM cards, overrides RAG; `OkrPanel` — cards de objetivo, barra de progresso; `PortfolioPage` — top bar, tabs, selector; `RoadmapView` — tabela de roadmap, barra de timeline.
    - **Risks**: `RiskForm` — todos os labels, selects, score preview; `RiskMatrix` — container, labels de eixos (cores de severidade mantidas); `RisksPage` — lista de riscos, filtros, botões de ação.
    - **Wiki**: `EditorToolbar` — botões de toolbar, divisores; `PageTree` — links ativos/inativos, botões; `WikiEditor` — container, prose dark mode (`dark:prose-invert`); `WikiLayout` — sidebar, main content; `WikiPage` — título, timestamps, comentários.
- **Dark mode — UI components + ThemeToggle (2026-03-13)**:
  - Criado `frontend/src/features/theme/ThemeToggle.tsx`: botão de 3 estados (claro / sistema / escuro)
    com ícones Sun, Monitor, Moon; acessível via `aria-label` e `aria-pressed`.
  - Adicionado `ThemeToggle` ao `Header` (à esquerda dos ícones de ação).
  - Aplicadas classes `dark:` em todos os componentes de UI compartilhados:
    `Button`, `Input`, `Textarea`, `Modal`, `Dropdown`, `Badge`, `Avatar`, `AvatarGroup`.
  - Aplicadas classes `dark:` nos componentes de layout:
    `AppLayout`, `Header`, `Sidebar`, `ProjectNav`.
  - Atualizado `index.css`: `body` agora usa `dark:bg-gray-950 dark:text-gray-100`.
- **Dark mode — ThemeProvider wired in main.tsx (2026-03-13)**:
  - `ThemeProvider` adicionado como provider mais externo em `frontend/src/main.tsx`,
    envolvendo `QueryClientProvider` e `BrowserRouter`.
- **Dark mode — ThemeContext (2026-03-13)**:
  - Criado `frontend/src/features/theme/ThemeContext.tsx` com `ThemeProvider` e hook `useTheme`.
  - Suporta modos `light`, `dark` e `system` com persistência em `localStorage`.
  - Aplica/remove a classe `dark` no `<html>` reativamente.
  - Ouve mudanças de preferência do sistema quando no modo `system`.
  - Criado `frontend/src/features/theme/ThemeContext.test.tsx` com 8 testes cobrindo todos os
    comportamentos (TDD — testes escritos antes da implementação).
  - Adicionado stub global de `window.matchMedia` em `frontend/src/test/setup.ts` para
    compatibilidade com jsdom.
- **Dark mode — Tailwind class strategy + no-flash script (2026-03-13)**:
  - Adicionado `darkMode: 'class'` ao `frontend/tailwind.config.ts` para ativar dark mode controlado por classe CSS.
  - Adicionado inline script IIFE ao `frontend/index.html` que lê `localStorage.getItem('theme')` e
    `prefers-color-scheme` antes da renderização, adicionando a classe `dark` ao `<html>` para evitar
    flash de conteúdo não estilizado (FOUC) em modo escuro.
- **Test framework (2026-03-13)**: instalado Vitest + React Testing Library no frontend.
  - Pacotes: `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/jest-dom`,
    `@testing-library/user-event`, `jsdom` adicionados a `devDependencies`.
  - Criado `frontend/vitest.config.ts` com ambiente jsdom, globals ativados e alias `@` para `src/`.
  - Criado `frontend/src/test/setup.ts` importando matchers do `@testing-library/jest-dom`.
  - Adicionados scripts `test` e `test:watch` ao `frontend/package.json`.

---

## [0.4.0] — 2026-03-12

### Adicionado
- **Módulos (frontend)**: página `ModulesPage` com cards agrupados por status, progress bar,
  responsável (lead), datas e modal de criação/edição. Rota e tab na nav do projeto.
- **Portfolio — gerenciamento completo**:
  - Dashboard: botão "Adicionar projeto" (modal com selector + datas + orçamento)
  - Dashboard: RAG override inline por projeto (alterar/resetar para automático)
  - Dashboard: botão remover projeto do portfolio
  - OKR: CRUD completo — criar, editar, deletar objetivos com progress bar
  - Portfolio: editar nome e deletar portfolio
- **Hooks de portfolio**: `useUpdatePortfolio`, `useDeletePortfolio`, `useAddPortfolioProject`,
  `useRemovePortfolioProject`, `useCreateObjective`, `useUpdateObjective`, `useDeleteObjective`
- **`make sync-wsl`**: sincroniza projeto para WSL (`/home/robertogeiss/projecthub`)
  com flags `--no-perms --no-group`
- **`.dockerignore`** no frontend: previne que `node_modules` do Windows sobrescreva
  o `node_modules` Alpine no Docker build

### Corrigido
- **`portfolio.service.ts` — roadmap**: retornava `r.data` inteiro em vez de
  `{ projects, dependencies }` (bug de tipo)
- **`portfolio.service.ts` — paginação**: `projects()`, `objectives()` e `costs()`
  não extraíam `.results` do response paginado
- **`portfolio.service.ts` — objectives**: `createObjective`/`updateObjective` enviavam
  camelCase (`targetValue`, `currentValue`, `dueDate`) em vez de snake_case para a API
- **`portfolio.service.ts` — objectives list**: dados exibidos como `undefined`
  (`progressPct`, `linkedProjects`, `targetValue` etc.) por falta de mapper snake→camel
- **`PortfolioSerializer`**: campo `owner` não estava em `read_only_fields`, causando
  erro "campo obrigatório" ao criar portfolio
- **`RoadmapView`**: corrigido para usar o novo tipo `RoadmapProject` com
  `projectColor` e `predecessors`
- **Docker build**: `tsc && vite build` falhava com syntax errors em `@types/*` de
  terceiros — removido `tsc &&` do script `build` (agora só `vite build`);
  adicionado script separado `typecheck`
- **Docker build**: `is-extglob is not a function` causado por `COPY . .` sobrescrevendo
  `node_modules` Alpine com os do Windows — corrigido com `.dockerignore`
- **`updateProject`**: payload enviado em camelCase sem conversão snake_case

### Alterado
- **`types/portfolio.ts`**: adicionado tipo `RoadmapProject` com `projectColor` e `predecessors`
- **`types/index.ts`**: adicionado campo `leadDetail` ao tipo `Module`
- **`package.json`**: script `build` separado em `build` (vite) e `typecheck` (tsc)

---

## [0.3.0] — 2026-03-11

### Adicionado
- **Risk Register (backend)**: app `risks` com model `ProjectRisk` (managed=False),
  matriz de probabilidade×impacto (score 1–25), status workflow
  (identified → analyzing → mitigating → monitoring → closed),
  serializers, views CRUD, integração com portfolio (risk_count, critical_risk_count)
- **Risk Register (frontend)**: `RisksPage` com matriz 5×5 interativa,
  lista de riscos com filtros, `RiskForm` modal, hooks `useRisks`, service, types
- **Milestones (frontend)**: `MilestonesPage` com cards, progress bar por issues,
  seletor de status inline, modal de criação
- **Wiki editor**: toolbar completo (TipTap) com bold, italic, underline, código,
  tabelas, imagens, listas de tarefas, menções, highlight e link
- **Editor Yjs**: integração de colaboração em tempo real via WebSocket

### Corrigido
- `RiskForm`: reset de estado ao trocar de risco, lógica de filtro da matriz
- Múltiplos bugs model vs DB schema (`db_column`, campos faltantes)

---

## [0.2.0] — 2026-03-10

### Adicionado
- **Portfolio (backend — Fase 3)**: models `Portfolio`, `PortfolioProject`,
  `PortfolioProjectDep`, `PortfolioObjective`, `ObjectiveProject`, `PortfolioCostEntry`
  (todos managed=False)
- **RAG/EVM**: `rag.py` com `calcular_rag()` (GREEN/AMBER/RED + override manual),
  `calcular_evm()` (PV/EV/AC/CPI/SPI), `recalculate_portfolio_rag()` bulk
- **Portfolio tasks**: `refresh_portfolio_rag` (por portfolio), `refresh_all_portfolio_rag`
  (periódica a cada hora via Celery Beat)
- **Portfolio views**: CRUD portfolio, projetos, dashboard EVM+RAG, roadmap,
  recalculate-rag, objetivos, custos, dependências
- **Portfolio (frontend)**: `PortfolioPage`, `ExecutiveDashboard` (EVM + tabela RAG),
  `RoadmapView` (timeline), `OkrPanel` (objetivos)
- **CPM (backend — Fase 2)**: algoritmo NetworkX AON com 4 tipos de relação
  (FS/SS/FF/SF + lag), `build_react_flow_graph()`, `build_gantt_data()`
- **Gantt/Network (frontend)**: `GanttPage` com toggle Gantt/Network,
  `GanttChart` (tabela visual), `NetworkDiagram` (ReactFlow + caminho crítico)

### Corrigido
- Docker volume mount Windows: workaround `make sync-backend`
- Auth: audience mismatch Keycloak (`KEYCLOAK_VERIFY_AUDIENCE=False` em dev)
- Services com `PaginatedResponse`: `.results` extraído corretamente

---

## [0.1.0] — 2026-03-07

### Adicionado
- **Fundação**: Django 5.1 + DRF + Channels + Celery + Redis + PostgreSQL 16
- **Auth**: Keycloak OIDC com verificação JWT local via JWKS (cache Redis 1h)
- **Workspaces**: CRUD + membros + management command `wait_for_db`
- **Projects**: CRUD + membros + estados + labels + estados padrão no create
- **Issues**: CRUD + sequenceId automático + relações + comentários + atividades +
  attachments (OCI) + signals (CPM, notificações, atividades)
- **Wiki**: Spaces + Pages + versões + comentários + issue-links + publicação +
  colaboração Yjs via WebSocket
- **Cycles**: CRUD + progresso + issues vinculadas
- **Modules (backend)**: CRUD + `ModuleIssue`
- **Milestones (backend)**: CRUD
- **Notifications**: in-app + email (Celery) + WebSocket broadcast
- **Frontend fundação**: React 18 + TypeScript + Vite + TanStack Query + Zustand +
  Tailwind + Radix UI
- **Frontend features**: Board (Kanban dnd-kit), Backlog, Cycles, Issues (detail +
  form + activity), Wiki (TipTap), Notifications (popover)
- **Infraestrutura**: Docker Compose, Nginx, Makefile, `.env.example`
