# Changelog

## [Unreleased] — 2026-06-14

### Added
- **Bulk actions on issues** — select multiple issues in Backlog view and update status or priority at once:
  - `POST /issues/bulk-update/` endpoint (up to 100 issues per request, access-scoped)
  - Checkbox column added to each `IssueRow` and epic-group rows in `BacklogPage`
  - Floating action bar appears with Status and Priority dropdowns when issues are selected
  - `useBulkUpdateIssues` hook + `issueService.bulkUpdate` service method

- **Issue templates** — define reusable templates to pre-fill issue creation forms:
  - `IssueTemplate` model (workspace-scoped) with `name`, `title_template`, `description`, `priority`, `size`
  - `GET/POST/PATCH/DELETE /issue-templates/` REST API
  - Template picker dropdown at the top of `IssueForm` (hidden when no templates exist)
  - `useIssueTemplates`, `useCreateIssueTemplate`, `useUpdateIssueTemplate`, `useDeleteIssueTemplate` hooks
  - Migration `0006_add_issue_template`

- **Time tracking on issues** — log hours directly from the issue detail page:
  - Reuses existing `resources.TimeEntry` model (immutable entries, corrections as negative values)
  - `GET /issues/{id}/time-entries/` and `POST /issues/{id}/time-entries/` endpoints
  - `TimeTrackingPanel` component embedded in `IssueDetailPage` below relations
  - Shows total hours, per-entry list (date, hours, description, member), and an inline log-time form
  - `useTimeEntries`, `useLogTime`, `useDeleteTimeEntry` hooks + `timeEntryService`

- **Burndown chart with daily data** — `CycleDetail` now shows a real per-day burndown:
  - `GET /projects/{id}/cycles/{id}/burndown/` endpoint using `IssueActivity` to find completion dates
  - Falls back to current state for issues without activity records
  - `BurndownChart` SVG re-implemented to accept `days[]` data points instead of a static snapshot
  - `useCycleBurndown` hook + `cycleService.burndown` service method

- **Email notifications** — existing `send_email_notification` Celery task already implemented; activated by setting `NOTIFICATIONS_EMAIL_ENABLED=True` + SMTP environment variables

- **Slack webhook notifications** — fire a Slack message on every in-app notification:
  - `SLACK_WEBHOOK_URL` setting (environment variable, empty = disabled)
  - `send_slack_notification` Celery task sends a formatted Slack Block Kit message
  - Auto-triggered alongside email in `create_notification` task when `SLACK_WEBHOOK_URL` is set

- **Discovery roadmap view** — third view option in Product Discovery alongside table and board:
  - Horizontal swimlane layout with one column per status stage (Nova → Em análise → Planejada → Em execução → Entregue → Estacionada)
  - Volume bar under each stage header shows relative number of ideas
  - Cards are clickable (opens IdeaDrawer); score badge shown when score > 0
  - Toggle button "roadmap" added to the view switcher in `DiscoveryPage`

- **Idea comments** — threaded comments on Discovery ideas, visible in the idea drawer:
  - `IdeaComment` model with author, body, `is_edited` flag, and timestamps
  - `GET/POST /discovery/ideas/:id/comments/` and `PATCH/DELETE /discovery/ideas/:id/comments/:comment_pk/`
  - `IdeaCommentPanel` component with ⌘↵ shortcut to submit, delete button for own comments
  - `useIdeaComments`, `useAddIdeaComment`, `useDeleteIdeaComment` hooks
  - Migration `0005_ideacomment`

- **Global search now includes ideas** — ⌘K palette shows a third "Ideias" column:
  - Backend `_search_ideas` in `GlobalSearchView` using PostgreSQL FTS on title + summary
  - `IdeaSearchResultSerializer` with headline highlighting
  - Frontend `GlobalSearchResults` updated to 3-column grid (Issues / Wiki / Ideias)
  - `IdeaSearchResult` type added to `types/search.ts`

- **Discovery idea detail drawer** — clicking any idea row (table or board) opens a slide-in side panel with:
  - Inline status selector with live update
  - Scorecard panel: Impacto, Esforço, Confiança, Importância (0–10) with live score preview and save
  - Insights panel: add notes, links, or feedback; lists existing insights per idea
  - Promote-to-issue button (shown when idea is linked to a project and not yet promoted)
  - `IdeaDrawer` component using Radix Dialog + Framer Motion slide-from-right animation
  - `discoveryService.updateIdea` method for inline status changes
  - "Importância" replaces "Alcance" label in scorecard UI
  - Keyboard accessibility on all clickable rows and cards (Enter/Space to open drawer)

- **Product Discovery module** (Tasks 6–8 of the 2026-06-12 plan)
  - `IdeaScorecard` model with impact, effort, confidence, reach fields and computed `score = (impact × confidence) / effort`
  - `PATCH /api/v1/discovery/ideas/:id/scorecard/` endpoint that upserts and returns the scorecard with computed score
  - `IdeaInsight` model (kind: note/link/feedback, title, JSON content) with `GET`/`POST /api/v1/discovery/ideas/:id/insights/`
  - `POST /api/v1/discovery/ideas/:id/promote/` action that creates an Issue in the linked project and links `promoted_issue`
  - `ScorecardPanel` UI component with editable inputs and live score preview
  - `InsightPanel` UI component with inline add form and kind selector (note/link/feedback)
  - Score column in `IdeaTableView`; promote button shown per row for ideas with a project but no promoted issue
  - `discoveryService.updateScorecard`, `listInsights`, `addInsight`, `promoteIdea` service methods
  - `IdeaScorecard` and `IdeaInsight` TypeScript types in `types/discovery.ts`
  - 19 backend tests across `test_ideas_api.py`, `test_views_api.py`, `test_scoring_api.py`, `test_insights_api.py`
  - Discovery Module section in `ARCHITECTURE.md` documenting domain model, API routes, promotion flow, and frontend structure
  - Migration `0004_ideainsight_ideascorecard`

### Changed
- **Product Discovery traduzido para pt-BR** — todos os textos da interface da seção de Descoberta de Produto agora estão em português:
  - Título da página: "Product Discovery" → "Descoberta de Produto"
  - Item do menu lateral: "Discovery" → "Descoberta"
  - Botões de visão: "board" → "quadro", "roadmap" → "roteiro"
  - Coluna de tabela: "Score" → "Pontuação"
  - Painel de avaliação: "Scorecard" → "Avaliação", "Score:" → "Pontuação:"
  - Botão de ação: "Salvar scorecard" → "Salvar avaliação"
  - Painel de evidências: "Insights" → "Evidências"

### Fixed
- **TypeScript errors** — resolved all type-check failures across the codebase:
  - `MemberWorkload.availableDays` (`number | null`) properly null-coalesced in `WorkloadHeatmap` and `CapacityTrendChart`
  - `RoadmapView` drag state captured as local non-null constant inside `useEffect` to satisfy TypeScript control-flow narrowing in closures
  - `projectService.mapProjectMember` now includes `projectId` and `createdAt` fields required by the `ProjectMember` type
  - `useIssues.useCreateIssue` double-cast (`as unknown as`) for the `Record<string, unknown>` → `CreateIssueDto` conversion
  - `CodeBlockWithLineNumbers` replaced `Array.at(-1)` (ES2022) with `[length - 1]` for compatibility with current `lib` target
  - `useMyAccessRequest`, `useSubmitAccessRequest` hooks added as aliases; `AccessRequest` type alias added for `AccessRequestDetail`; `accessRequestService.getMyStatus()` added; `CreateAccessRequestInput.workspaceId` field added
  - `CyclePlanningBoard.test.tsx` allocations array explicitly typed as `SprintPlanAllocation[]` to allow `plannedMember: null`
- **Test failures** — all 169 frontend tests now pass:
  - `CycleDetail.test.tsx` and `CycleDetailPlanning.test.tsx` mocks updated to include `useCycleBurndown`
  - `CycleDetail.test.tsx` status button name updated to `ativar` (matching the actual label)
  - `MentionList.test.tsx` fixture updated with required `role`/`createdAt` fields; `onKeyDown` calls wrapped in `act()` to flush React state between keystrokes; key-press args cast with `as any`
  - `SlashCommandList.test.tsx` key-press args cast with `as any`
  - `IssueForm.test.tsx` mock for `useIssueTemplates` added; `getByText('Tarefa')` changed to `getAllByText` to handle Dropdown mock rendering both trigger and item in the DOM

Todas as mudanças notáveis do ProjectHub são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

========================================================================================================================================================

 The git diff is inflated — comparing our initial commit against the remote brings in hundreds of pre-existing files. Here are the files
 actually edited in this session and the previous one (since 29/05):

  Gantt chart
  frontend/src/features/gantt/GanttChart.tsx
  frontend/src/hooks/useCpm.ts          (read, not modified)
  frontend/src/services/cpm.service.ts  (read, not modified)

  Keycloak auth fixes
  frontend/src/features/auth/AuthProvider.tsx
  frontend/src/features/auth/SignInPage.tsx
  frontend/src/lib/keycloak.ts
  
  frontend/vite.config.ts
  backend/config/settings/base.py
  backend/apps/authentication/authentication.py
  assets/meu-tema/login/theme.properties

  Keycloak login theme CSS
  assets/meu-tema/login/resources/css/style.css

  Project/infra
  .gitignore
  .env                      (DATABASE_URL, KEYCLOAK_ISSUER, VITE_* vars)
  changelog.md

⏺ Modified files:
  - /Users/robertoedgargeiss/ProjetosWeb/projecthub/CHANGELOG.md
  - /Users/robertoedgargeiss/ProjetosWeb/projecthub/assets/meu-tema/login/resources/css/style.css
  - /Users/robertoedgargeiss/ProjetosWeb/projecthub/backend/apps/projects/models.py
  - /Users/robertoedgargeiss/ProjetosWeb/projecthub/backend/apps/projects/serializers.py
  - /Users/robertoedgargeiss/ProjetosWeb/projecthub/frontend/src/features/projects/ProjectsPage.tsx
  - /Users/robertoedgargeiss/ProjetosWeb/projecthub/frontend/src/hooks/useProjects.ts
  - /Users/robertoedgargeiss/ProjetosWeb/projecthub/frontend/src/types/project.ts

  Created files:
  - /Users/robertoedgargeiss/ProjetosWeb/projecthub/backend/apps/projects/migrations/0002_project_dates.py
  - /Users/robertoedgargeiss/ProjetosWeb/projecthub/frontend/src/features/projects/ProjectWizard.test.tsx
  - /Users/robertoedgargeiss/ProjetosWeb/projecthub/frontend/src/features/projects/ProjectWizard.tsx



========================================================================================================================================================

## [Unreleased]

### Added

- **Microinterações — camada completa (2026-06-02)**: três camadas de animação adicionadas ao ProjectHub. **Camada 1 (CSS/@keyframes):** `@keyframes shimmer` substitui `animate-pulse` nos skeletons; `@keyframes draw-check` desenha o checkmark ao concluir tarefa; `@keyframes badge-pop` aplica spring na badge de notificações; `@keyframes page-enter` (fade+slide 5 px) no `<h1>` das páginas principais; `@keyframes spinner-sweep` refinamento do spinner de loading. **Camada 2 (Tailwind):** `active:scale-95` no Button; regra global `button:not([disabled]):active { scale: 0.97 }` em `index.css`; `transition-all duration-150` nos NavItems da Sidebar. **Camada 3 (Framer Motion):** Modal com spring enter/exit (`scale 0.96→1`, `y 8→0`) + overlay fade; GlobalSearch com slide-down (`y -6→0`); NotificationToast com slide da direita (spring stiffness 400); BoardPage — cards fazem fade+slide na montagem, escalam 1.03 e sombreiam mais ao arrastar; WorkspacePage — tiles entram em stagger (0.055 s/tile) com spring; ProjectsPage — cards entram em stagger (0.05 s/card); InboxList — itens saem com `x -20, height 0` via `AnimatePresence`. Arquivos: `index.css`, `Button.tsx`, `Sidebar.tsx`, `Modal.tsx`, `GlobalSearch.tsx`, `NotificationToast.tsx`, `NotificationBell.tsx`, `TaskListTile.tsx`, `BoardPage.tsx`, `WorkspacePage.tsx`, `ProjectsPage.tsx`, `InboxList.tsx`.

### Fixed

- **Keycloak login — painel direito renderizando abaixo (2026-05-30)**: o painel direito (formulário) estava aparecendo abaixo do painel esquerdo em vez de ao lado. Causa: o PatternFly v5 pode definir `flex-wrap: wrap` ou layout grid no container, fazendo os itens quebrarem linha. Correções em `assets/meu-tema/login/resources/css/style.css`: adicionado `flex-wrap: nowrap !important` e `justify-content: flex-start !important` ao `.pf-v5-c-login`; adicionado `flex-wrap: nowrap !important`, `min-height: 0 !important` e reset de grid (`grid-template-*: none`) ao `.pf-v5-c-login__container`; painel direito (`main.pf-v5-c-login__main`) recebeu `flex: 1 1 48%`, `width: 48%` e `min-width: 300px` para não colapsar.

### Added

- **Wizard de criação de projeto (2026-05-31)**: substituído o modal simples de criação por um wizard de 4 passos. Passo 1 — **Detalhes**: nome, identificador (auto-derivado das iniciais do nome, editável), descrição, paleta de 10 cores e toggle privado/público. Passo 2 — **Time**: busca e seleciona membros do workspace com escolha de papel (admin/membro/visualizador). Passo 3 — **Estados**: edição inline das 6 cores e nomes dos estados auto-gerados (Backlog, A fazer, Em andamento, Em revisão, Concluído, Cancelado), adição e remoção de estados extras. Passo 4 — **Datas**: data de início e data alvo do projeto (novos campos `start_date` / `target_date` no model `Project`). Cada passo intermediário tem botão "Pular". Ao concluir o wizard navega para o board do novo projeto. Backend: migration `0002_project_dates.py` adiciona os dois campos `DateField` ao model; serializer atualizado. Frontend: `ProjectWizard.tsx` (novo), hooks `useCreateProjectState`, `useUpdateProjectState`, `useDeleteProjectState` adicionados a `useProjects.ts`, `Project` type ampliado, `ProjectsPage.tsx` usa o wizard. Testes: `ProjectWizard.test.tsx` com cobertura dos 4 passos, validação, navegação e skip.

- **Gantt — arraste da borda esquerda para ajustar data de início (2026-05-30)**: adicionada alça de arrastar na borda esquerda de cada barra do Gantt. Arrastar para a esquerda/direita altera a `start_date` da issue mantendo a data de término fixa (a duração visual se ajusta proporcionalmente). Durante o arraste, a barra se move e o rótulo de data de início é destacado na cor da barra. Ao soltar, a mutação `PATCH /issues/{id}/` atualiza `start_date` e o TanStack Query invalida as queries `cpm-gantt`, `cpm-data` e `cpm-network`, forçando recálculo CPM. As setas de dependência também se atualizam durante o arraste via `draftStartOffsets`. Acessibilidade: `role="button"` e `aria-label="Ajustar data de início"` na alça. Arquivo: `GanttChart.tsx` (novo `GanttStartDragState`, `draftStartOffsets`, `toISODate()`, campo `succTaskId` em `LogicalArrow`); `useUpdateIssue` importado de `useIssues.ts`.

- **Temas de cor — Warm Brown e Ocre (2026-05-22)**: dois novos temas adicionados ao seletor de cores do navbar. "Warm Brown" aplica marrom acinzentado escuro (`amber-900`) como cor primária e sidebar quase preta com tom quente (`#29 1e 16`). "Ocre" aplica amarelo escuro/ocre como cor primária e sidebar muito escura em tom âmbar (`#42 31 00`). Cada tema define seu próprio conjunto de variáveis CSS (`--color-primary`, `--color-sidebar-dark`, `--color-bg-*`, `--color-border`). Arquivos: `index.css` (dois novos blocos `[data-color-theme]`), `ThemeContext.tsx` (union type e validação do `localStorage`), `ColorThemeSelector.tsx` (dois novos swatches).

- **Gantt — responsável e estado na lista lateral (2026-05-22)**: a coluna esquerda do Gantt passou de 220 px para 280 px e cada linha ganhou duas sub-linhas. Linha 1: nome da issue (com ponto vermelho se caminho crítico). Linha 2: avatar/inicial do responsável + nome (ou "Sem responsável") e ponto colorido + nome do estado. Backend: `_get_issues_map` agora inclui `assignee__name`, `assignee__avatar_url`, `state__name`, `state__color`; `build_gantt_data` adiciona esses campos ao dict de cada tarefa. Frontend: `GanttTask` type ampliado, `cpm.service.ts` faz o mapeamento snake→camelCase, `GanttChart.tsx` renderiza as sub-linhas.

- **Busca global — movida para a sidebar (2026-05-22)**: o botão de busca foi removido do navbar e adicionado à sidebar, abaixo do seletor de workspace. No modo recolhido exibe apenas o ícone; no modo expandido exibe uma barra "Pesquisar… ⌘K". Ao clicar (ou pressionar ⌘K/Ctrl+K), a busca abre como um painel command-palette fixo centralizado via `createPortal`, independente da posição da sidebar. `GlobalSearch` recebeu prop `expanded` e o estado aberto foi migrado de expansão inline para overlay `fixed`.

- **Dashboard — lista de tarefas pessoais (2026-05-22)**: novo tile "Minhas tarefas" adicionado ao dashboard do usuário (abaixo de "Meu Trabalho"), independente das issues de projeto. Permite adicionar tarefas com Enter ou pelo botão `+`, marcar como concluídas, renomear com duplo-clique e excluir (ícone lixeira vermelha visível no hover). Tarefas pendentes e concluídas são exibidas em seções separadas por um divisor. Backend: novo model `PersonalTask` (`managed=True`, tabela `personal_tasks`) com views `PersonalTaskListCreateView` (sem paginação) e `PersonalTaskDetailView` em `apps/workspaces/`. Endpoints: `GET/POST /api/v1/tasks/` e `GET/PATCH/DELETE /api/v1/tasks/<id>/`. Frontend: `personalTask.service.ts`, `usePersonalTasks.ts` (com optimistic toggle de `done`), `TaskListTile.tsx`.

- **Portfolio — colunas "Abertas", "Atraso" e "Concluído" na tabela do dashboard (2026-05-22)**: a tabela de projetos do dashboard executivo ganhou três novas colunas. "Abertas" exibe o número de issues não concluídas (badge âmbar) ou um ✓ verde quando zerado. "Atraso" mostra em vermelho quantos dias o projeto está além da data de término, ou "—" se no prazo. "Concluído" exibe uma barra de progresso compacta com o percentual de issues concluídas. Backend: `PortfolioDashboardProjectSerializer` recebeu os campos `open_issue_count` e `days_late` como `SerializerMethodField` com cache `_cached_metrics`.

- **Recursos — heatmap de carga por membro × projeto (2026-05-22)**: novo componente `WorkloadHeatmap` na página de Recursos exibe uma matriz membro × projeto com a carga planejada (linha superior) e a real (linha inferior). Células coloridas por percentual de capacidade: verde ≤60 %, âmbar ≤100 %, vermelho >100 %. Coluna de total destaca sobrecarga em negrito vermelho.

- **Recursos — gráfico de capacidade planejada × consumida por período (2026-05-22)**: novo componente `CapacityTrendChart` com seletor 3m/6m/12m. Exibe três barras por mês: capacidade disponível (cinza), planejada (índigo, vermelha se excede disponível) e real (verde, âmbar se excede planejado). ViewBox fixo (`12 × 80 px`) garante tamanho de fonte consistente independente do período selecionado.

- **Dashboard workspace home (2026-05-12)**: tela `/` totalmente reformulada. Layout em grid 3 colunas (1.4fr 1fr 1fr), 2 linhas: tile "Meu trabalho" + Activity, Ciclos, Notificações, Próximos marcos. Topbar com saudação contextual (bom dia/tarde/noite). Cada tile carrega em paralelo via `useQueries` com skeleton e empty states. Novo `issueService.myWork(memberId)` e hook `useMyWork`. Arquivos: `WorkspacePage.tsx`, `issue.service.ts`, `useIssues.ts`.

- **Navbar — pesquisa global de issues (2026-05-12)**: atalho ⌘K / Ctrl+K abre painel de busca global com debounce de 300ms. Resultados incluem issues e páginas wiki com navegação por teclado (↑↓ Enter). Arquivos: `GlobalSearch.tsx`, `GlobalSearchResults.tsx`, `GlobalSearchFilterChips.tsx`.

### Fixed

- **Busca global — fontes SVG nos gráficos ignorando `fontSize` prop (2026-05-22)**: atributo de apresentação SVG `fontSize={N}` tinha especificidade menor que estilos CSS herdados do pai. Corrigido usando `style={{ fontSize: 'Npx' }}` em todos os elementos `<text>` dos componentes de gráfico.

- **Wiki — pesquisa de páginas na sidebar (2026-05-07)**: campo de busca adicionado ao topo da sidebar de ambas as wikis (projeto e workspace). Ao digitar 2+ caracteres, a árvore de páginas é substituída por uma lista de resultados filtrados pelo título. A busca usa debounce de 300ms e chama `GET /wiki/spaces/{id}/pages/?search=<query>` no backend. Backend: `WikiPageListCreateView` agora inclui `filter_backends = [SearchFilter]` com `search_fields = ["title"]`. Frontend: novo `WikiSidebar.tsx` compartilhado entre `WikiLayout` e `WorkspaceWikiLayout`, com `useWikiSearch` hook e `wikiService.searchPages()`.

- **Wiki — histórico de versões com diff (2026-05-06)**: botão "Histórico" no cabeçalho de cada página wiki abre um painel lateral direito com todas as versões salvas. Cada linha mostra número da versão, resumo da alteração, avatar e nome do autor, e tempo relativo. Ao expandir uma versão, é exibido um diff palavra-a-palavra (verde = adicionado, tachado vermelho = removido) comparando o conteúdo atual com a versão selecionada. Botão "Restaurar esta versão" reverte a página para aquele estado. **Auto-versioning**: toda vez que o usuário salva conteúdo ou título via `PATCH /wiki/pages/{pk}/`, o backend cria automaticamente um snapshot da versão via `create_page_version.delay()`. Ao restaurar, uma nova versão é criada com `change_summary = "Restaurado para vN"` para preservar a trilha de histórico. Backend: `WikiPageDetailView.perform_update` + `WikiPageVersionRestoreView` atualizados. Frontend: novo `WikiVersionPanel.tsx`, `mapVersion()` no serviço, `WikiPageVersion` tipo ampliado com `createdByDetail`.

- **Wiki do workspace — documentação geral independente de projetos (2026-05-06)**: nova rota `/wiki` acessível pelo ícone de livro na sidebar principal. Funciona como um Confluence: espaço wiki compartilhado por todo o workspace, sem vínculo com nenhum projeto específico. Na primeira visita, um botão "Criar wiki" inicializa o `WikiSpace` com `project=null`. Toda a infraestrutura existente é reutilizada (editor TipTap + Yjs CRDT colaborativo, `PageTree`, `WikiTOC`, versionamento, comentários). Arquivos alterados: `wiki.service.ts` (aceita `projectId: string | null`), `useWiki.ts` (novo hook `useWorkspaceWikiSpace()`, `useCreateWikiSpace` aceita null), novo `WorkspaceWikiLayout.tsx`, `WikiPage.tsx` (busca de espaço tolera `projectId=null`), `App.tsx` (rotas `/wiki` e `/wiki/:pageId`), `Sidebar.tsx` (ícone BookOpen "Wiki" adicionado à nav).

### Fixed

- **Gantt — setas de dependência sobrepondo a barra na saída (2026-05-06)**: o roteamento em Z saía da borda esquerda da cápsula ao invés da direita quando a tarefa successor estava à esquerda ou muito próxima. Corrigido com roteamento ortogonal de 5 segmentos em escadinha: a seta sempre sai pela direita (STUB fixo para a direita), vai ao meio vertical, descia/sobe, e chega pela esquerda do successor. Sem sobreposição com a cápsula na saída.
- **Gantt — épicos exibidos no gráfico (2026-05-06)**: issues do tipo `epic` apareciam como tarefas no Gantt. Corrigido excluindo épicos na query do algoritmo CPM (`Issue.objects.exclude(type="epic")`) e no backend `_build_graph`.
- **Gantt — barras sempre com 1 dia independente de `estimate_days` (2026-05-06)**: o algoritmo CPM lia `CpmIssueData.duration_days` (campo que permanecia 1 após o primeiro cálculo) em vez de `Issue.estimate_days`. Corrigido lendo `estimate_days` diretamente da issue. `recalculate_cpm` atualizado para incluir `duration_days` no `bulk_update`. Novo sinal `trigger_cpm_on_issue_change` dispara recálculo assíncrono quando `estimate_days`, `start_date` ou `due_date` de uma issue é alterado. Hook `useUpdateIssue` invalida as queries CPM quando esses campos são atualizados.
- **Gantt — locale das datas em inglês (2026-05-06)**: nomes de meses e dias estavam em inglês (`Jan`, `Mon`). Corrigido usando `'pt-BR'` no `Intl.DateTimeFormat` de `fmtMonDay` e `fmtMonAbbr`.
- **Gantt — barras ignorando timezone UTC-3 (2026-05-06)**: `new Date("2024-04-01")` interpretava como UTC midnight, resultando em 31/03 no fuso UTC-3. Corrigido com `parseLocalDate()` que divide a string `YYYY-MM-DD` e constrói a data como local (sem conversão UTC).

### Added

- **Keycloak login — três cápsulas individuais no cabeçalho (2026-05-06)**: ao invés de uma única barra no topo, cada texto ("Prefeitura de Novo Hamburgo", "Controle de portfolios e projetos", "CTIBD") agora é uma cápsula (pill) independente com `border-radius: 22px`, `backdrop-filter: blur(12px)` e `box-shadow` próprio. `#kc-header` tornou-se um container flex transparente com `gap: 12px`; o wrapper central saiu de `position: absolute` para `flex: 1; justify-content: center`.

 adicionada página `/settings` acessível pelo menu do avatar no canto superior direito. Permite editar nome de exibição e URL do avatar (salvo via PATCH `/api/v1/auth/me/`), exibe e-mail, função, data de ingresso e último acesso. Botão "Alterar senha" abre o console de conta do Keycloak em nova aba. Backend: `MeView` agora suporta PATCH com `WorkspaceMemberUpdateSerializer` (campos `name` e `avatar_url`).

- **CPM Network — caixa de dados abaixo do nó (2026-05-03)**: a caixa ES|EF / LS|LF estava posicionada *acima* do círculo (como no commit anterior), mas a notação padrão do CPM coloca os dados *abaixo*. Caixa movida para `top: CIRCLE + GAP` com `position: absolute` (fora do container do nó, preservando os handles no centro do círculo). Handles explicitados com `top: CIRCLE/2` para garantir alinhamento. Espaçamento vertical dos nós aumentado de 180 para 220 px para acomodar a caixa abaixo. Adicionados rótulos ES EF / LS LF à esquerda da caixa.
- **Auth — loop infinito no localhost:5173 (2026-05-03)**: `IS_KC_CALLBACK` era calculado dentro do `useEffect`, mas o `keycloak-js` já chama `history.replaceState()` para limpar `?code=` da URL *de forma síncrona* dentro de `keycloak.init()`. O React StrictMode re-executa o effect após o cleanup, momento em que a URL já está limpa — então o segundo mount via `isKcCallback = false` e, em caso de falha no exchange PKCE, chamava `keycloak.login()` novamente, gerando o loop. Corrigido movendo o cálculo para nível de módulo em `lib/keycloak.ts` (`IS_KC_CALLBACK`), capturando o valor antes de qualquer execução do React ou do keycloak-js. Adicionados também `http://localhost:5173/*` e `http://127.0.0.1:5173/*` em `redirectUris` e `webOrigins` no cliente Keycloak `projecthub-frontend`.
- **Keycloak login — mensagens de erro e espaçamento (2026-05-02)**: mensagens de erro abaixo dos campos agora em vermelho claro (`#fca5a5`) com fundo semitransparente, legíveis sobre o backdrop. "Esqueceu sua senha?" movido para linha separada com `gap: 12px` de "Mantenha-me conectado", cor alterada para azul claro (`#93c5fd`).
- **CPM Network — conectores ausentes (2026-05-01)**: `CpmNode` não tinha componentes `Handle` do React Flow, o que impedia qualquer aresta de renderizar. Adicionados `<Handle type="target" position={Position.Left}/>` e `<Handle type="source" position={Position.Right}/>`. Corrigido também o mapeamento de `isCritical` → `is_critical` (snake_case enviado pelo backend) para que o estilo do caminho crítico funcione corretamente nos nós e arestas.

### Added

- **Keycloak realm export** (`assets/real-export.json`): realm `projecthub` com clientes
  `projecthub-frontend` (public, PKCE) e `projecthub-backend` (confidential, service account),
  audience mapper no frontend para incluir o backend no token, roles `workspace-admin` /
  `workspace-member`, scopes padrão (openid, profile, email, roles) e dois usuários de dev
  (`devadmin` / `devuser`)
- **docker-compose.yml**: Keycloak agora usa `start-dev --import-realm` e monta
  `assets/real-export.json` em `/opt/keycloak/data/import/realm-export.json` para criação
  automática do realm na primeira inicialização
- **Portfolio — siglas EVM traduzidas para PT-BR (2026-04-09)**: PV→VP (Valor Planejado), EV→VA (Valor Agregado), CPI→IDC (Índice de Custo), SPI→IDP (Índice de Prazo). Atualizado nos cards de resumo, cabeçalhos da tabela e textos de apoio do dashboard e relatório financeiro.
- **Portfolio — colunas de status e datas no dashboard (2026-04-09)**: a tabela de projetos do dashboard executivo agora exibe coluna de status atual (Não iniciado / Em andamento / Concluído / Atrasado, como badge colorido), data de início e data de término. O status é derivado das datas e do RAG: projetos com data de término no passado e RAG RED são marcados como "Atrasado".
- **Portfolio — aba "Financeiro" separada (2026-04-09)**: o relatório de situação financeira foi movido para sua própria aba no portfolio (ao lado de Dashboard / Roadmap / OKR). Novo arquivo `FinancialReport.tsx` com busca de dados própria via `usePortfolioDashboard`. A aba anterior dentro do Dashboard foi removida.
- **Portfolio — relatório de situação financeira no dashboard (2026-04-09)** *(movido para aba própria — ver entrada acima)*: nova seção "Situação Financeira" adicionada abaixo da tabela de projetos no dashboard executivo, com:
  - 4 cards de resumo: Orçamento total, Custo real (AC), Variância de custo (verde/vermelho), Estimativa no Término (EAC = BAC/CPI)
  - Tabela detalhada por projeto: Orçamento, Custo real, Valor agregado (EV), CPI colorido (verde ≥1, vermelho <1), Variância com ícone de tendência, barra de % utilizado (verde/âmbar/vermelho)
  - Linha de totais no rodapé da tabela com agregação do portfolio
  - Os cards EVM do topo (PV/EV/CPI/SPI) foram corrigidos para agregar dos projetos individuais em vez do campo `totals` do backend (que retornava zeros)

### Fixed

- **Auth — "Parâmetro inválido: redirect_uri" no refresh (2026-04-09)**: ao fazer refresh em qualquer rota interna (ex: `/projects/123/board`), o `keycloak-js` usava `window.location.href` como `redirect_uri`, que não estava registrada no client do Keycloak. Fix: adicionado `redirectUri: window.location.origin + '/'` no `keycloak.init()` para sempre enviar a URI raiz, que já é registrada como válida.

### Added

- **Portfolio — OKR per-objective colors (2026-04-09)**: each objective card gets a distinct color from the same 10-color palette. Color is applied to the `Target` icon, the progress bar fill, the card border tint, and the linked-project badges.
- **Portfolio — roadmap per-project colors (2026-04-09)**: each project bar gets a distinct color from a 10-color palette (indigo, amber, emerald, red, blue, violet, orange, teal, pink, lime) derived by index, replacing the unreliable `projectColor` field. A matching color dot is shown next to the project name in the left column.
- **Portfolio — roadmap month separators (2026-04-09)**: the timeline now shows vertical lines at each month boundary with abbreviated month+year labels (e.g. "Abr 26") in the header. Timeline range is snapped to the first/last day of the bounding months for clean alignment (`RoadmapView.tsx`).

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
