# MODULES.md — Módulos do ProjectHub

## Fase 1 — MVP

### authentication

Responsável por verificar tokens JWT emitidos pelo Keycloak e mapear usuários.

**Arquivos-chave:**
- `authentication.py` — classe `KeycloakJWTAuthentication(BaseAuthentication)`: decodifica e valida o JWT via JWKS, retorna o `WorkspaceMember` correspondente
- `backends.py` — `KeycloakOIDCBackend`: usado pelo `mozilla-django-oidc` para o fluxo de login web (se necessário além da API)
- `views.py` — endpoint `GET /api/v1/auth/me/` retorna dados do usuário logado; `POST /api/v1/auth/refresh/` não necessário (o frontend usa keycloak-js para refresh)

**Lógica de `KeycloakJWTAuthentication`:**
1. Extrair token do header `Authorization: Bearer <token>`
2. Buscar JWKS em `settings.OIDC_OP_JWKS_ENDPOINT` (cachear por 1h no Redis)
3. Decodificar e verificar assinatura com `python-jose` ou `cryptography`
4. Verificar `exp`, `iss` e `aud`
5. Extrair `sub` (keycloak_sub)
6. Buscar `WorkspaceMember` por `keycloak_sub` — se não existir, criar com dados do token (`email`, `name`)
7. Retornar `(member, token)`

---

### workspaces

Gerencia o workspace e seus membros.

**Models:** `Workspace`, `WorkspaceMember`
**Endpoints:**
- `GET /api/v1/workspaces/` — lista workspaces do usuário
- `GET /api/v1/workspaces/{slug}/` — detalhe
- `GET /api/v1/workspaces/{slug}/members/` — membros
- `PATCH /api/v1/workspaces/{slug}/members/{id}/` — alterar papel

**Observação:** na versão atual há apenas 1 workspace (Prefeitura de NH). A estrutura suporta múltiplos no futuro.

---

### projects

Gerencia projetos, estados customizáveis e labels.

**Models:** `Project`, `ProjectMember`, `IssueState`, `Label`
**Endpoints:**
- `CRUD /api/v1/projects/`
- `GET /api/v1/projects/{id}/members/`
- `POST /api/v1/projects/{id}/members/` — adicionar membro
- `CRUD /api/v1/projects/{id}/states/`
- `CRUD /api/v1/projects/{id}/labels/`

**Permissões:**
- Criar projeto: workspace admin ou member
- Editar/deletar: project admin
- Membros: project admin

---

### issues

O núcleo do sistema. Issues são as unidades de trabalho.

**Models:** `Issue`, `IssueRelation`, `IssueComment`, `IssueActivity`, `IssueAttachment`, `IssueLabel`

**Endpoints:**
- `CRUD /api/v1/issues/` (filtros: project, state, assignee, priority, type, label, cycle, module)
- `POST /api/v1/issues/{id}/comments/`
- `GET /api/v1/issues/{id}/activities/`
- `POST /api/v1/issues/{id}/attachments/`
- `POST /api/v1/issues/{id}/relations/`

**Signals (`signals.py`):**
- `post_save` em `Issue`: cria `IssueActivity` para cada campo alterado
- `post_save` em `Issue`: dispara notificação se assignee mudou
- `post_save` em `IssueRelation` com tipo CPM: dispara task `recalculate_cpm`

**WebSocket consumer (`consumers.py` — `IssueBoardConsumer`):**
- Grupo: `project_{project_id}`
- Evento `issue.updated`: broadcast quando issue muda de estado (drag no board)
- Payload mínimo: `{type, issue_id, state_id, sort_order}`

**sequence_id:**
Gerado pela função SQL `next_sequence_id(project_id)` — chamar em `save()` se `sequence_id` for None.

---

### cycles

Sprints/iterações com start e end date.

**Models:** `Cycle`, `CycleIssue`
**Endpoints:**
- `CRUD /api/v1/projects/{id}/cycles/`
- `POST /api/v1/cycles/{id}/issues/` — adicionar issue ao cycle
- `DELETE /api/v1/cycles/{id}/issues/{issue_id}/` — remover
- `GET /api/v1/cycles/{id}/progress/` — retorna stats: total, completed, started

---

### modules

Agrupadores temáticos de issues (ex: "Autenticação", "Relatórios").

**Models:** `Module`, `ModuleIssue`
**Endpoints:**
- `CRUD /api/v1/projects/{id}/modules/`
- `POST /api/v1/modules/{id}/issues/` — adicionar
- `DELETE /api/v1/modules/{id}/issues/{issue_id}/` — remover

---

### wiki

Editor colaborativo em tempo real com hierarquia de páginas.

**Models:** `WikiSpace`, `WikiPage`, `WikiPageVersion`, `WikiIssueLink`, `WikiPageComment`

**Endpoints:**
- `CRUD /api/v1/wiki/spaces/`
- `CRUD /api/v1/wiki/spaces/{id}/pages/`
- `GET /api/v1/wiki/pages/{id}/versions/`
- `POST /api/v1/wiki/pages/{id}/versions/{n}/restore/`
- `POST /api/v1/wiki/pages/{id}/links/` — vincular issue
- `POST /api/v1/wiki/pages/{id}/publish/` — gera published_token

**WebSocket consumer (`WikiPageConsumer`):**
- Grupo: `page_{page_id}`
- Função: relay puro das mensagens binárias do Yjs
- Ao conectar: enviar o estado atual da página (doc state serializado)
- O conteúdo Yjs é salvo no `WikiPage.content` como JSONB periodicamente (debounce 5s)

**Versionamento:**
A cada save (debounce 30s), criar `WikiPageVersion` com snapshot do content.
Manter últimas 50 versões por página.

---

### notifications

Notificações in-app e por e-mail.

**Models:** `Notification`

**Endpoints:**
- `GET /api/v1/notifications/` — lista não lidas (paginado)
- `PATCH /api/v1/notifications/{id}/read/`
- `POST /api/v1/notifications/read-all/`

**Tasks Celery (`tasks.py`):**
- `send_email_notification(notification_id)` — envia e-mail via template
- `create_notification(recipient_id, type, entity_type, entity_id, ...)` — cria no banco

**Signals (`signals.py`):**
- Issue assigned → notificar assignee
- Issue commented → notificar reporter + outros comentaristas
- Issue state → completed → notificar reporter
- Wiki page → membro mencionado com @

**WebSocket consumer (`NotificationConsumer`):**
- Grupo: `user_{user_id}`
- Evento: `notification.new` — push em tempo real
- Payload: objeto Notification serializado

---

## Fase 2 — CPM

### cpm

Calcula e armazena os dados do Caminho Crítico para cada projeto.

**Models:** `CpmIssueData`, `CpmBaseline`

**Endpoints:**
- `GET /api/v1/cpm/projects/{id}/` — retorna todos os CpmIssueData do projeto
- `POST /api/v1/cpm/projects/{id}/calculate/` — força recalculo
- `GET /api/v1/cpm/projects/{id}/network/` — retorna grafo JSON para React Flow
- `GET /api/v1/cpm/projects/{id}/gantt/` — retorna dados para Frappe Gantt
- `POST /api/v1/cpm/projects/{id}/baselines/` — salva snapshot
- `GET /api/v1/cpm/projects/{id}/baselines/` — lista baselines

**`algorithm.py` — função principal:**
```python
def calcular_cpm(project_id: str) -> dict:
    """
    Retorna dict com:
    - nodes: {issue_id: {es, ef, ls, lf, slack, is_critical}}
    - critical_path: [issue_id, ...]
    - project_duration: int (dias)
    """
```

**Task Celery (`tasks.py`):**
```python
@shared_task(bind=True, max_retries=3, queue='cpm')
def recalculate_cpm(self, project_id: str):
    result = calcular_cpm(project_id)
    # Persiste em cpm_issue_data
    # Broadcast via channel group project_{project_id}
    # Verifica alertas: issue crítica atrasada
```

---

## Fase 3 — Portfolio

### portfolio

Visão executiva de múltiplos projetos com RAG, OKRs e EVM.

**Models:** `Portfolio`, `PortfolioProject`, `PortfolioProjectDep`, `PortfolioObjective`, `ObjectiveProject`, `PortfolioCostEntry`

**Endpoints:**
- `CRUD /api/v1/portfolio/`
- `CRUD /api/v1/portfolio/{id}/projects/`
- `GET /api/v1/portfolio/{id}/dashboard/` — usa view `v_portfolio_evm`
- `GET /api/v1/portfolio/{id}/roadmap/` — dados para timeline
- `CRUD /api/v1/portfolio/{id}/objectives/`
- `POST /api/v1/portfolio/{id}/projects/{ppid}/costs/`

**`rag.py` — lógica de RAG:**
```python
def calcular_rag(portfolio_project) -> str:
    """
    Compara % issues concluídas vs % tempo decorrido.
    Retorna 'GREEN', 'AMBER' ou 'RED'.
    GREEN:  variação >= -5%
    AMBER:  variação entre -5% e -15%
    RED:    variação < -15%
    Se rag_override=True, retorna rag_status sem calcular.
    """

def calcular_evm(portfolio_project) -> dict:
    """
    Retorna: {pv, ev, ac, cpi, spi}
    PV = budget_planned * pct_tempo_decorrido
    EV = budget_planned * pct_issues_concluidas
    AC = budget_actual (lançado manualmente)
    CPI = EV / AC
    SPI = EV / PV
    """
```

**Task periódica (Celery Beat):**
- A cada hora: recalcular RAG de todos os portfolios ativos
- Se RAG mudou: criar notificação para o owner do portfolio
