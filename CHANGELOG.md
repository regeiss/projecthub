# Changelog

Todas as mudanças notáveis do ProjectHub são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [Unreleased]

### Fixed
- **Portfolio — "Add project" modal showed empty project list (2026-04-08)**: `AddProjectModal` called `useProjects()` without a `workspaceId`, which disabled the query (`enabled: !!workspaceId`). Fixed by reading `workspaceId` from `useWorkspaceStore` and passing it to `useProjects(workspaceId)`.
- **Wiki — slash command menu compact layout (2026-04-08)**: reduced item padding (`py-1`), font sizes (`text-xs` for labels, `text-[10px]` for subtitles, `text-sm` for icons), and added `max-height: min(480px, 70vh)` with `overflow-y-auto` so the menu never bleeds off-screen regardless of the number of items (`SlashCommandList.tsx`).
- **Wiki — slash command broken after refactor (2026-04-08)**: `SlashCommandList.selectItem` was calling `command(item.action)` (a `SlashCommandAction`) instead of `command(item)` (the full `SlashCommandItem`). The TipTap Suggestion command handler expected the full item to access `item.action.type` via switch; passing only the action made the switch fall through silently. Updated tests to assert on the full item object.

### Added
- **Wiki — extended slash commands (2026-04-08)**:
  - New TipTap node extensions: `DateExtension` (inline date picker), `StatusExtension` (in-progress/done/blocked/in-review/pending badges), `VideoExtension` (YouTube/Vimeo/direct URL embed), `FileExtension` (external file link with `javascript:` URL sanitisation).
  - Slash command menu now groups commands under section headers "Painéis", "Conteúdo" and "Mídia"; headers are omitted when their group has no matches in the filtered result.
  - `SlashCommandAction` is a discriminated union; `SlashCommandItem` carries label, icon, filterKey, and action; selection passes the full item to the Suggestion plugin.
  - Diacritic-aware filtering — typing "conclusao" matches "Concluído".

### Added
- **Wiki Phase 1 — dual-store model, breadcrumbs, TOC, and test suite (2026-04-01)**:
  - **Backend — dual-store content model**: added `yjs_state` `BinaryField` to `WikiPage` and `WikiPageVersion`; `save_yjs_state` Celery task now writes to `yjs_state` only (not `content`); `WikiPageConsumer` sends TipTap JSON init message followed by Yjs binary on connect.
  - **Backend — `ancestors` field**: `WikiPageDetailSerializer` now includes `ancestors` list (root-first chain of `{id, title}` objects) for breadcrumb navigation.
  - **Backend — test suite**: comprehensive tests for models, views, consumers, and tasks under `apps/wiki/tests/`.
  - **Frontend — `WikiBreadcrumb`**: breadcrumb nav component (Space › Ancestor › Current Page) with `aria-current="page"` on the active item.
  - **Frontend — `WikiTOC`**: right-sidebar table of contents with `IntersectionObserver` active-heading tracking; hidden below `xl` breakpoint; only rendered when page has ≥ 3 headings.
  - **Frontend — `HeadingWithId` extension**: TipTap extension that injects slugified `id` attributes on headings for TOC anchor links.
  - **Frontend — 3-column `WikiLayout`**: left page-tree sidebar, centre content area, right TOC sidebar; uses React Router outlet context to pass `editor` instance up to the layout.
  - **Frontend — types and service**: `WikiPage` type extended with `ancestors`; `mapPage` maps backend `ancestors` array.

### Fixed
- **`IssueRelationListCreateView` — remove pagination (2026-03-22)**: added `pagination_class = None` so `GET /issues/{id}/relations/` returns a flat array instead of a paginated envelope. The frontend service passes the response directly as an array; the previous paginated response caused the relation list to always appear empty. Updated `test_relations.py` to match the flat response (`resp.data[0]` instead of `resp.data['results'][0]`).

### Added
- **Issue Linking — complete feature (2026-03-22)**:
  - **Backend — `IssueRelationSerializer` derived fields**: added 4 read-only computed fields (`related_issue_title`, `related_issue_sequence_id`, `related_issue_project_id`, `related_issue_project_name`) sourced via `select_related('related_issue', 'related_issue__project')` to avoid N+1 queries.
  - **Backend — relation validation**: self-relation guard returns 400 with message "An issue cannot be related to itself"; duplicate relation guard prevents DB-level `IntegrityError` and returns 400 with "This relation already exists."
  - **Backend — workspace-wide issue search**: `IssueViewSet.get_queryset` now makes `project_id` optional on `GET /issues/`; admins see all workspace issues, members see only issues from their projects. `project_name` read-only field added to `IssueSerializer`.
  - **Frontend — types**: `Issue` type extended with `projectName: string`; `IssueRelation` extended with `relatedIssueTitle`, `relatedIssueSequenceId`, `relatedIssueProjectId`, `relatedIssueProjectName`.
  - **Frontend — service**: `mapIssue` maps `project_name` → `projectName`; new `mapRelation()` helper maps all snake_case relation fields to camelCase; `issueService.relations()` uses `mapRelation`; `issueService.addRelation()` corrected to send `related_issue` (not `related_issue_id`); new `issueService.search(query)` queries `GET /issues/?search=` and returns mapped `Issue[]`.
  - **Frontend — hooks**: `useRelations(issueId)`, `useAddRelation()`, `useDeleteRelation()`, and `useIssueSearch(query)` (debounced 300 ms) added to `useIssues.ts`.
  - **Frontend — `IssueRelationList` component**: displays relations grouped by type (blocks, blocked_by, duplicates, duplicate_of, relates_to, and all finish/start variants); inline add-relation form with relation-type selector, lag-days input, and debounced search dropdown; save button disabled until an issue is selected; per-row delete button with `aria-label`; lag badge shown only when `lagDays > 0`; delete error banner with `role="alert"`; link to related issue detail page. Full Vitest suite (`IssueRelationList.test.tsx`, 9 tests).
  - **Frontend — `IssueDetailPage`**: `<IssueRelationList projectId issueId />` inserted after `<SubtaskList>`.
- **Issue list — workspace-wide (backend)**: `IssueViewSet.get_queryset` now makes `project_id` optional. When omitted, admins see all issues in the workspace; members see only issues from projects they belong to. `project_name` read-only field added to `IssueSerializer` (sourced from `project.name`). New `IssueWorkspaceSearchTests` class (4 tests) validates member scoping, admin access, title search, and `project_name` in the response.
- **Issue Relations (backend)**: `IssueRelationSerializer` extended with 4 derived read-only fields (`related_issue_title`, `related_issue_sequence_id`, `related_issue_project_id`, `related_issue_project_name`); self-relation validation returns 400 with a descriptive message; duplicate relation validation prevents DB-level `IntegrityError` and returns 400 instead; `IssueRelationListCreateView.get_queryset` now uses `select_related('related_issue', 'related_issue__project')` to avoid N+1 queries. Full test suite in `apps/issues/tests/test_relations.py` (3 tests).
- **Subtasks (backend)**: `SubtaskSerializer` for slim subtask list responses; `subtask_count` and `completed_subtask_count` fields added to `IssueSerializer` (annotated on list, computed on demand for detail); `GET/POST /api/issues/{issue_pk}/subtasks/` endpoint via `IssueSubtaskListCreateView`; max 1 level of nesting enforced (returns 400 when trying to create a subtask of a subtask).
- **Subtasks (frontend)**: end-to-end subtask support in the React SPA:
  - `Issue` type extended with `subtaskCount` and `completedSubtaskCount` fields; new `CreateSubtaskDto` type added to `types/issue.ts`.
  - `mapIssue` in `issue.service.ts` maps `subtask_count` / `completed_subtask_count` from the API; new `issueService.subtasks(issueId)` and `issueService.createSubtask(issueId, data)` methods call `GET/POST /api/issues/{id}/subtasks/`.
  - `useSubtasks(issueId)` and `useCreateSubtask()` hooks added to `useIssues.ts`; `useCreateSubtask` invalidates both the subtask list and the parent issue on success.
  - `IssueForm` accepts optional `parentIssueId` and `typeOverride` props; when present, the form sends `parent_id` and forces `type` to the override value, enabling in-context subtask creation.
  - `SubtaskList` component (`SubtaskList.tsx`) displays the subtask panel inside `IssueDetailPage`: loading/error/empty states, a row per subtask with state-colour dot (aria-label), priority badge, sequence ID and title as a link, and a "+ Adicionar" button that opens `IssueForm` pre-wired for subtask creation. Full Vitest suite in `SubtaskList.test.tsx` (5 tests covering all states).
  - `IssueDetailPage` renders `<SubtaskList projectId issueId />` below the description section.
  - `IssueCard` (Kanban board) shows a grey subtask-count badge (`✓ completed/total`) when `subtaskCount > 0`; tested in `IssueCard.test.tsx`.
- **Issue Relations (frontend service)**: `mapIssue` now maps `project_name` to `projectName` (defaults to `''`). New `mapRelation()` helper maps all snake_case relation fields to the `IssueRelation` camelCase type. `issueService.relations()` now uses `mapRelation` instead of returning raw API data. `issueService.addRelation()` corrected to send `related_issue` (not `related_issue_id`) and maps response via `mapRelation`. New `issueService.search(query)` method queries `GET /issues/?search=` and returns mapped `Issue[]`. Two new Vitest tests for `projectName` mapping (4 tests total, all passing).
- **IssueRelationList component (frontend)**: new `IssueRelationList` React component (`src/features/issues/IssueRelationList.tsx`) displays issue relations grouped by type (blocks, blocked_by, duplicates, duplicate_of, relates_to, and all finish/start variants). Features: loading, error, and empty states; inline add-relation form with relation-type selector, lag-days input, and debounced issue search with dropdown; save button disabled until an issue is selected; per-row delete button with specific `aria-label` for accessibility; lag badge rendered only when `lagDays > 0`; delete error banner with `role="alert"`; link to related issue detail page. Full Vitest suite in `IssueRelationList.test.tsx` (9 tests covering all states and interactions).
- Workspace admins can search Keycloak users and pre-add them as workspace members before their first login
- `GET /api/v1/workspaces/{slug}/keycloak-users/?search=` — searches Keycloak, filters existing members
- `POST /api/v1/workspaces/{slug}/members/create/` — creates a WorkspaceMember record
- `AddMemberModal` component in WorkspaceSettings with debounced search, role selector, and error feedback

### Corrigido
- **TypeScript — conflito de `@types/react` v18 vs v19 em Modal/Radix (2026-03-16)**: O `node_modules` raiz do workspace continha `@types/react@19` (puxado por `@radix-ui/react-dialog@^1.1.15`), enquanto o frontend usava v18. O TypeScript resolvia dois `ReactNode` incompatíveis, causando erros TS2786 em todos os componentes Radix. Adicionado `overrides` nos `package.json` raiz e do frontend para forçar `@types/react@^18.3.14` em toda a árvore de dependências.
- **Sidebar — tooltips não fechavam ao tirar o hover (2026-03-16)**: O `Tooltip` usava `RadixTooltip.Root` sem estado controlado, o que causava tooltips presos quando o mouse saía rapidamente. Adicionado estado `open` controlado com `onOpenChange` e `onMouseLeave` explícito no trigger para forçar fechamento imediato.
- **IssueForm — campos `size` e `estimateDays` não eram salvos ao editar (2026-03-16)**: O hook `useUpdateIssue` em `useIssues.ts` não mapeava os campos `size` → `payload.size` e `estimateDays` → `payload.estimate_days`, então esses valores nunca chegavam ao backend ao salvar o formulário de edição. Adicionados os dois mapeamentos ao bloco de construção do payload.
- **TipTap JSON/HTML mismatch em comentários e descrição de issue (2026-03-15)**: O backend armazena `content` e `description` como TipTap JSON (`JSONField`), mas o frontend enviava HTML como `body` e exibia o campo `description` como HTML raw (string). Corrigido em 7 pontos: (1) criado `src/lib/editor.ts` com `tiptapToHtml()` usando `generateHTML` do `@tiptap/core`; (2) `IssueComment` e `Issue.description` atualizados para usar `Record<string, unknown>` em vez de `string`; (3) `issue.service.ts` recebe novo `mapComment()` e métodos de comentário agora enviam `{ content }` (TipTap JSON) e mapeiam a resposta; (4) `useAddComment` em `useIssues.ts` renomeado `body` → `content: Record<string, unknown>`; (5) `MiniEditor` expõe JSON como terceiro argumento no callback `onChange`; (6) `IssueDetailPage` usa `commentJson` (estado JSON) e `tiptapToHtml()` para renderizar comentários e descrição; (7) `IssueForm` mantém descrição como JSON e envia para o backend corretamente.
- **Projetos e portfolios não exibiam no workspace correto (2026-03-15)**: `useProjects` e `usePortfolios` tinham um filtro client-side `p.workspaceId === workspaceId`, mas o campo no objeto bruto da API é `workspace` (não `workspaceId`), então o filtro sempre retornava array vazio. O backend já filtra pelo workspace correto via `X-Workspace-ID`; o filtro redundante foi removido e `enabled: !!workspaceId` adicionado para evitar query com ID vazio.
- **Workspace switching — conteúdo incorreto e workspace faltando no dropdown (2026-03-15)**:
  - **Bug 1 — só 2 de 3 workspaces apareciam**: o autenticador sempre usava `Workspace.objects.first()`, então o usuário só tinha `WorkspaceMember` no workspace "primeiro" da DB. Workspaces criados fora da UI (admin/fixtures) não tinham membro → não apareciam no dropdown.
  - **Bug 2 — conteúdo do workspace incorreto ao trocar**: `request.user.workspace` nunca mudava (sempre apontava para o primeiro workspace), então projetos, portfolio e demais dados eram sempre filtrados pelo workspace errado, tornando o seletor de workspace puramente visual.
  - **Solução**: Frontend agora envia header `X-Workspace-ID: {id}` em todas as requisições (interceptor no axios). Backend lê o header e faz lookup do `WorkspaceMember` para o workspace correto; se não existir, cria o registro automaticamente. Se o header estiver ausente, mantém comportamento anterior (primeiro membership existente).


- **IssueForm — dropdown de ciclo (2026-03-15)**: O campo "Ciclo" na tela de editar issue exibia um input somente-leitura em vez de um dropdown selecionável. Substituído por `<select>` com todos os ciclos do projeto. Ao salvar, o formulário fecha imediatamente (`onClose()` antes das chamadas de ciclo); a troca de ciclo é feita em background via `cycleService.addIssue`/`removeIssue` para evitar que o backdrop do modal bloqueie o botão "Voltar" enquanto as requisições de ciclo estavam em andamento.
- **IssueDetailPage — descrição renderizada como HTML simples (2026-03-15)**: a descrição era exibida como texto plano, quebrando a formatação HTML gerada pelo editor rico. Substituído por `dangerouslySetInnerHTML`.

### Adicionado
- **WikiPage — botão de salvar manual (2026-03-17)**: adicionado botão "Salvar" no cabeçalho da página wiki com suporte a `Ctrl+S` / `Cmd+S`. O botão fica ativo (azul) quando há conteúdo não salvo e mostra "Salvando…" durante a requisição e "Salvo" após o sucesso. O `WikiEditor` agora expõe `onContentChange` para notificar o pai do conteúdo mais recente.
- **WikiLayout — criar wiki por projeto (2026-03-17)**: quando um projeto ainda não tem espaço wiki, a aba Wiki exibe um botão "Criar wiki" em vez de uma mensagem estática. Ao clicar, cria o espaço via `POST /wiki/spaces/` com o nome do projeto. Corrigido o mapeamento de `createSpace` no serviço para enviar `{ project, name }` no formato esperado pelo backend.
- **IssueCard — badge de ciclo (2026-03-17)**: quando uma issue pertence a um ciclo, exibe um badge violeta com ícone de ciclo e o nome do ciclo (truncado em 16 chars) na linha de metadados do card do kanban.
- **ProjectNav — link para configurações do projeto (2026-03-17)**: adicionada aba "Configurações" (ícone de engrenagem) na barra de navegação do projeto, apontando para `/projects/:projectId/settings`. Isso torna acessível a tela de edição de nome e identificador do projeto, que já existia em `ProjectSettings.tsx` mas não tinha entrada de navegação.
- **IssueCapsules — badges de prioridade e tamanho (2026-03-16)**: criado componente `IssueCapsules.tsx` com `PriorityCapsule` (pill oval colorida: U=urgente/vermelho, H=alta/laranja, M=média/amarelo, L=baixa/azul) e `SizeCapsule` (círculo colorido: XS/cinza, S/roxo, M/âmbar, L/azul, XL/índigo). Aplicado no `BacklogPage` (substituindo texto plano) e `IssueCard` do `BoardPage`.
- **BoardPage — botões de ação por coluna (2026-03-16)**: adicionados botão `+` e menu `···` no cabeçalho de cada coluna do kanban. O `+` abre o formulário de nova issue com o estado da coluna pré-selecionado. O menu `···` oferece: ocultar/mostrar coluna (client-side), excluir coluna (com confirmação), mover à esquerda/direita (troca de `sequence` via API). O `IssueForm` recebeu prop `defaultStateId` para pré-selecionar o estado ao criar uma issue a partir de uma coluna.
- **ProjectSettings — edição de nome e identificador (2026-03-15)**: adicionada seção "Geral" no topo da página de configurações do projeto com campos editáveis para nome e identificador. O identificador é automaticamente convertido para maiúsculas e limitado a 10 caracteres alfanuméricos. O botão "Salvar" é habilitado somente quando há mudanças, e erros de validação (ex.: identificador duplicado) são exibidos inline.
- **EditorToolbar — botões de formatação inline permanentes (2026-03-15)**: adicionados botões de Negrito, Itálico, Sublinhado, Tachado, Destaque, Código inline e Link diretamente na barra de ferramentas permanente (antes só apareciam no BubbleMenu ao selecionar texto). Aplica-se ao editor da wiki e ao MiniEditor (comentários e descrição de issue). Adicionado `onSetLink` prop ao EditorToolbar para delegar o handler de link ao componente pai.
- **IssueForm — editor rico na descrição (2026-03-15)**: o campo "Descrição" no modal de criação/edição de issue era um `<Textarea>` simples. Substituído pelo `MiniEditor` (TipTap) com as mesmas opções de formatação da wiki — títulos H1/H2/H3, listas, checklist, bloco de código, tabela e menu de bolha com negrito, itálico, sublinhado, tachado, destaque, código inline e link. Adicionado suporte a `initialContent` no `MiniEditor` para pré-popular o editor ao editar uma issue existente.
- **IssueForm — checkbox "Continuar adicionando" (2026-03-15)**: No formulário de criação de issue, adicionado checkbox no rodapé. Quando marcado, após criar a issue o formulário mantém-se aberto com os campos resetados, permitindo inserção rápida de múltiplas issues. Só aparece no modo criação.
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
