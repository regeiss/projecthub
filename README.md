# ProjectHub

Sistema integrado de gestão de projetos, wiki, CPM e portfolio — Prefeitura de Novo Hamburgo.

---

## Estrutura lógica

### Workspace

O **Workspace** é o tenant raiz do sistema. Todos os dados pertencem a um único workspace (a prefeitura). Os usuários do sistema são **WorkspaceMembers** — criados automaticamente na primeira autenticação via Keycloak.

```
┌─────────────────────────────────────────────────────────────┐
│  Workspace  (ex: "Prefeitura de Novo Hamburgo")             │
│                                                             │
│  ┌──────────────────────────────────────────────┐           │
│  │  WorkspaceMember  (papel: admin/member/guest)│           │
│  │  • Criado automaticamente no 1º login        │           │
│  │  • Vinculado ao Keycloak via keycloak_sub    │           │
│  └──────────────────────────────────────────────┘           │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐    │
│  │ Project  │  │ Project  │  │ Project  │  │ Portfolio │    │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Projeto

Cada **Project** tem seus próprios membros (subconjunto do workspace), estados, labels, issues e wiki. O criador do projeto é automaticamente adicionado como **admin** do projeto.

```
┌──────────────────────────────────────────────────────────────────┐
│  Project  (ex: "Implantação do SEI")                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  ProjectMember  (papel: admin/member/viewer)                │ │
│  │  Subconjunto dos WorkspaceMembers                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐   │
│  │  Issues                 │  │  Wiki                        │   │
│  │  • sequenceId  (#PRJ-1) │  │  WikiSpace                   │   │
│  │  • estado (IssueState)  │  │  └── WikiPage                │   │
│  │  • prioridade           │  │       ├── WikiPageVersion    │   │
│  │  • responsável          │  │       └── WikiPageComment    │   │
│  │  • relações (CPM)       │  └──────────────────────────────┘   │
│  │  • labels               │                                     │
│  │  • anexos               │  ┌──────────────────────────────┐   │
│  │  • atividades           │  │  Cycles (sprints)            │   │
│  └─────────────────────────┘  │  └── CycleIssue              │   │
│                               └──────────────────────────────┘   │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐   │
│  │  IssueStates            │  │  CPM                         │   │
│  │  • Backlog (backlog)    │  │  • CpmIssueData (ES/EF/LS/LF)│   │
│  │  • A fazer  (unstarted) │  │  • CpmBaseline (snapshot)    │   │
│  │  • Em andamento(started)│  │  • Caminho crítico           │   │
│  │  • Em revisão (started) │  │  • Gantt                     │   │
│  │  • Concluído(completed) │  └──────────────────────────────┘   │
│  │  • Cancelado(cancelled) │                                     │
│  └─────────────────────────┘                                     │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐   │
│  │  Modules                │  │  Milestones                  │   │
│  │  • agrupamento temático │  │  • progresso por issues      │   │
│  │  • responsável (lead)   │  │  • seletor de status inline  │   │
│  │  • progress bar         │  └──────────────────────────────┘   │
│  └─────────────────────────┘                                     │
│  ┌─────────────────────────┐                                     │
│  │  Risks                  │                                     │
│  │  • matriz 5×5 (prob×imp)│                                     │
│  │  • score 1–25           │                                     │
│  │  • workflow de status   │                                     │
│  └─────────────────────────┘                                     │
└──────────────────────────────────────────────────────────────────┘
```

### Relacionamento entre entidades

```
Workspace
│
├── WorkspaceMember ──────────────────────────────────┐
│       │                                             │
│       │ (ProjectMember)                             │
│       ▼                                             │
├── Project                                           │
│       ├── IssueState  (estados do quadro)           │
│       ├── Label                                     │
│       ├── Issue ────────────────────────────────┐   │
│       │       ├── IssueState                    │   │
│       │       ├── assignee ────────────────── WorkspaceMember
│       │       ├── IssueLabel                    │
│       │       ├── IssueRelation (FS/SS/FF/SF)   │ (grafo CPM)
│       │       ├── IssueComment                  │
│       │       ├── IssueActivity                 │
│       │       ├── IssueAttachment               │
│       │       └── CpmIssueData (ES/EF/slack)────┘
│       ├── Cycle
│       │       └── CycleIssue
│       ├── Module
│       │       └── ModuleIssue
│       ├── Milestone
│       ├── ProjectRisk (Risk Register)
│       ├── WikiSpace
│       │       └── WikiPage
│       │               ├── WikiPageVersion
│       │               └── WikiPageComment
│       └── CpmBaseline
│
└── Portfolio
        ├── PortfolioProject ──▶ Project
        │       └── PortfolioProjectDep
        ├── PortfolioObjective
        │       └── ObjectiveProject ──▶ Project
        └── PortfolioCostEntry
```

### Fluxo de acesso

```
Keycloak (SSO)
      │
      │  1º login: cria WorkspaceMember automaticamente
      ▼
WorkspaceMember
      │
      │  Admin adiciona em: Projeto → Configurações → Membros
      ▼
ProjectMember  ──▶  pode criar issues, ser responsável, editar wiki
```

---

## Stack

| Camada        | Tecnologia                              |
| ------------- | --------------------------------------- |
| Backend       | Django 5 + DRF + Django Channels (ASGI) |
| Frontend      | React 18 + TypeScript + Vite            |
| Banco         | PostgreSQL 16                           |
| Cache / Filas | Redis 7                                 |
| Worker        | Celery 5 + Celery Beat                  |
| Auth          | Keycloak (OIDC)                         |
| Storage       | OCI Object Storage (S3-compatible)      |
| Proxy         | Nginx 1.25                              |
| CPM           | NetworkX (Python)                       |

---

## Setup rápido

### 1. Pré-requisitos

- Docker 24+ e Docker Compose 2.20+
- Make
- Node 20+ (só para desenvolvimento frontend local)

### 2. Configuração inicial

```bash
# Clone o repositório
git clone https://gitlab.pnh.rs.gov.br/ti/projecthub.git
cd projecthub

# Copie e ajuste as variáveis de ambiente
cp .env.example .env
# Edite o .env com os valores corretos (Keycloak, OCI, banco etc.)
```

### 3. Subir o ambiente

```bash
# Primeira vez: constrói as imagens e sobe tudo
make build
make up

# Acompanhar os logs
make logs

# Verificar se está tudo ok
curl http://localhost/api/health/
```

O banco de dados é inicializado automaticamente com o `scripts/db/init.sql` no primeiro boot do container PostgreSQL.

### 4. Desenvolvimento

```bash
# Subir apenas os serviços de infra (banco, redis, api)
make up-dev

# Frontend em modo dev (hot reload na porta 5173)
make frontend-dev

# Shell Django
make shell

# Testes
make test
```

### 5. Após mudanças no backend (workaround Docker Desktop / Windows)

O volume `./backend:/app` pode não sincronizar automaticamente no Windows. Use:

```bash
# Copia arquivos e reinicia o container da API
make sync-backend

# Reconstruir a imagem (bake permanente das mudanças)
docker compose build api
```

### 6. Frontend — build de produção

O frontend roda como build estático servido pelo Nginx (não Vite hot reload em produção).
Após qualquer mudança no frontend:

```bash
docker compose build frontend && docker compose up -d frontend
```

> **Importante**: o arquivo `frontend/.dockerignore` exclui `node_modules` do contexto de build.
> Sem ele, os `node_modules` do Windows sobrescrevem os binários Alpine instalados no container.

### 7. Sincronizar para WSL

```bash
make sync-wsl   # rsync D:\projecthub → /home/robertogeiss/projecthub
```

---

## Estrutura do projeto

```
projecthub/
├── backend/
│   ├── apps/                 # Módulos Django
│   │   ├── authentication/   # Keycloak OIDC
│   │   ├── workspaces/       # Workspace e membros
│   │   ├── projects/         # Projetos, estados, labels
│   │   ├── issues/           # Issues, relações, atividades
│   │   ├── cycles/           # Sprints
│   │   ├── modules/          # Módulos temáticos
│   │   ├── wiki/             # Spaces, páginas, versões
│   │   ├── notifications/    # Notificações in-app
│   │   ├── cpm/              # Caminho Crítico (Fase 2)
│   │   └── portfolio/        # Portfolio e OKRs (Fase 3)
│   ├── config/
│   │   ├── settings/         # base / development / production
│   │   ├── urls.py
│   │   └── asgi.py
│   ├── core/
│   │   ├── pagination.py
│   │   ├── permissions.py
│   │   └── websocket/
│   └── requirements/
│       ├── base.txt
│       ├── production.txt
│       └── development.txt
├── frontend/
│   └── src/
│       ├── features/         # Board, Wiki, Issues, Modules, Risks, Portfolio...
│       ├── components/       # UI reutilizável
│       ├── hooks/
│       ├── stores/           # Zustand
│       └── services/         # API + WebSocket
├── scripts/
│   └── db/
│       └── init.sql          # Schema completo PostgreSQL
├── nginx/
│   └── conf.d/
│       └── projecthub.conf
├── docker-compose.yml
├── .env.example
└── Makefile
```

---

## Fases de desenvolvimento

| Fase              | Módulos                                          | Status       |
| ----------------- | ------------------------------------------------ | ------------ |
| **1 — MVP**       | Issues + Board + Wiki + Cycles + Auth            | ✅ Concluído |
| **1.1 — Extras**  | Modules + Milestones + Risk Register             | ✅ Concluído |
| **2 — CPM**       | Caminho Crítico + Gantt + Diagrama de Rede       | ✅ Concluído |
| **3 — Portfolio** | Roadmap + RAG/EVM + OKRs + Dashboard Executivo   | ✅ Concluído |

### Funcionalidades por módulo

| Módulo            | Backend | Frontend | Observações                              |
| ----------------- | ------- | -------- | ---------------------------------------- |
| Auth (Keycloak)   | ✅      | ✅       | JWT local via JWKS, cache Redis 1h       |
| Workspaces        | ✅      | ✅       | CRUD + membros                           |
| Projects          | ✅      | ✅       | CRUD + estados + labels + membros        |
| Issues            | ✅      | ✅       | Board Kanban + Backlog + Detail          |
| Wiki              | ✅      | ✅       | TipTap + Yjs colaboração em tempo real   |
| Cycles            | ✅      | ✅       | Sprints com progresso                    |
| Modules           | ✅      | ✅       | Agrupamento temático + progress bar      |
| Milestones        | ✅      | ✅       | Cards com progresso por issues           |
| Risk Register     | ✅      | ✅       | Matriz 5×5, score, workflow de status    |
| CPM / Gantt       | ✅      | ✅       | NetworkX AON, 4 tipos relação, baselines |
| Portfolio         | ✅      | ✅       | Dashboard EVM+RAG, Roadmap, OKRs         |
| Notifications     | ✅      | ✅       | In-app + email + WebSocket               |

---

## Comandos úteis

```bash
make help           # Lista todos os comandos
make psql           # Abre o PostgreSQL
make redis-cli      # Abre o Redis CLI
make db-backup      # Faz backup do banco
make monitoring     # Sobe o Flower (monitoramento Celery)
make keycloak       # Sobe o Keycloak local (se não tiver externo)
make sync-backend   # Copia backend para o container e reinicia a API (Windows workaround)
make sync-wsl       # Sincroniza projeto para WSL (/home/robertogeiss/projecthub)
```

---

## Notas de arquitetura

- **Models com `managed = False`**: o schema está em `scripts/db/init.sql`. Não usar `makemigrations`.
- **PKs sempre UUID** geradas pelo PostgreSQL (`gen_random_uuid()`).
- **Token JWT verificado localmente** via JWKS (cache Redis 1h) — nunca chamar o Keycloak por request.
- **`WorkspaceMember`** é o "usuário" do sistema — o `User` Django é apenas um stub para o ORM.
- **Portfolio**: somente `WorkspaceMember` com `role = 'admin'` pode criar/editar/deletar portfolios.
- **Celery Beat**: `refresh_all_portfolio_rag` recalcula RAG de todos os portfolios a cada hora.

---

## Equipe

Coordenadoria de TI — Prefeitura de Novo Hamburgo / RS
