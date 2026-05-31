# DATABASE.md — Modelagem do Banco de Dados

## Convenções

- Todas as PKs são `UUID` gerado com `gen_random_uuid()`
- Todas as tabelas têm `created_at` e `updated_at` com trigger automático
- Foreign keys com `ON DELETE CASCADE` salvo indicação contrária
- Índices em todas as FKs e campos de busca frequente
- Busca full-text via `tsvector` em issues e wiki_pages
- Schema `keycloak` separado para as tabelas internas do Keycloak

---

## Diagrama de hierarquia

```
Workspace
  └── WorkspaceMember (usuários sincronizados do Keycloak)
        └── Project
              ├── ProjectMember
              ├── IssueState       (estados customizáveis por projeto)
              ├── Label            (labels por projeto)
              ├── Issue
              │     ├── IssueRelation    (dependências + CPM)
              │     ├── IssueComment
              │     ├── IssueActivity
              │     ├── IssueAttachment
              │     ├── CpmIssueData     (Fase 2)
              │     └── CycleIssue / ModuleIssue
              ├── Cycle
              ├── Module
              └── WikiSpace
                    └── WikiPage
                          ├── WikiPageVersion
                          ├── WikiIssueLink
                          └── WikiPageComment

Portfolio (Fase 3)
  ├── PortfolioProject → Project
  ├── PortfolioObjective
  │     └── ObjectiveProject → Project
  └── PortfolioCostEntry
```

---

## Tabelas

### workspaces

```sql
id            UUID PK
name          VARCHAR(255)      -- "Prefeitura de Novo Hamburgo"
slug          VARCHAR(100)      -- "pnh" (único, usado na URL)
logo_url      TEXT
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
```

### workspace_members

```sql
id              UUID PK
workspace_id    UUID FK workspaces
keycloak_sub    VARCHAR(255) UNIQUE  -- subject do JWT
email           VARCHAR(255)
name            VARCHAR(255)
avatar_url      TEXT
role            VARCHAR(20)          -- admin | member | guest
is_active       BOOLEAN DEFAULT true
last_login_at   TIMESTAMPTZ
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### projects

```sql
id              UUID PK
workspace_id    UUID FK workspaces
name            VARCHAR(255)
identifier      VARCHAR(10) UNIQUE   -- "GLPI", "SSO", "HUB"
description     TEXT
icon            VARCHAR(10)          -- emoji
color           VARCHAR(7)           -- hex "#3B82F6"
network         VARCHAR(20)          -- secret | private | public
is_archived     BOOLEAN DEFAULT false
created_by_id   UUID FK workspace_members
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### project_members

```sql
id              UUID PK
project_id      UUID FK projects
member_id       UUID FK workspace_members
role            VARCHAR(20)   -- admin | member | viewer
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
UNIQUE (project_id, member_id)
```

### issue_states

```sql
id              UUID PK
project_id      UUID FK projects
name            VARCHAR(255)   -- "Em Progresso"
color           VARCHAR(7)     -- "#F59E0B"
category        VARCHAR(20)    -- backlog | unstarted | started | completed | cancelled
sequence        INTEGER        -- ordem no board
is_default      BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### labels

```sql
id              UUID PK
project_id      UUID FK projects
name            VARCHAR(100)
color           VARCHAR(7)
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### issues

```sql
id              UUID PK
sequence_id     INTEGER           -- GLPI-1, GLPI-2 (por projeto)
project_id      UUID FK projects
title           VARCHAR(500)
description     JSONB             -- TipTap JSON doc
state_id        UUID FK issue_states
priority        VARCHAR(10)       -- urgent | high | medium | low | none
type            VARCHAR(10)       -- task | bug | story | epic | subtask
assignee_id     UUID FK workspace_members NULL
reporter_id     UUID FK workspace_members
parent_id       UUID FK issues NULL     -- sub-task
epic_id         UUID FK issues NULL
estimate_points INTEGER NULL
start_date      DATE NULL
due_date        DATE NULL
completed_at    TIMESTAMPTZ NULL
sort_order      FLOAT             -- posição no board (lexorank ou float)
created_by_id   UUID FK workspace_members
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
search_vector   TSVECTOR          -- índice full-text
```

**Índices:**
```sql
INDEX ON issues (project_id, state_id)
INDEX ON issues (project_id, assignee_id)
INDEX ON issues (project_id, type)
INDEX ON issues (parent_id)
INDEX ON issues (epic_id)
GIN INDEX ON issues (search_vector)
```

### issue_relations

```sql
id              UUID PK
issue_id        UUID FK issues
related_issue_id UUID FK issues
relation_type   VARCHAR(30)
  -- blocks | blocked_by | duplicates | duplicate_of | relates_to
  -- finish_to_start | start_to_start | finish_to_finish | start_to_finish
lag_days        INTEGER DEFAULT 0   -- usado no CPM
created_by_id   UUID FK workspace_members
created_at      TIMESTAMPTZ
UNIQUE (issue_id, related_issue_id, relation_type)
```

### issue_labels

```sql
issue_id    UUID FK issues
label_id    UUID FK labels
PRIMARY KEY (issue_id, label_id)
```

### issue_comments

```sql
id              UUID PK
issue_id        UUID FK issues
author_id       UUID FK workspace_members
content         JSONB             -- TipTap JSON doc
is_edited       BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### issue_activities

```sql
id              UUID PK
issue_id        UUID FK issues
actor_id        UUID FK workspace_members
verb            VARCHAR(50)       -- "updated_state", "assigned", "commented"...
field           VARCHAR(100) NULL -- campo alterado
old_value       TEXT NULL
new_value       TEXT NULL
created_at      TIMESTAMPTZ
```

### issue_attachments

```sql
id              UUID PK
issue_id        UUID FK issues
uploaded_by_id  UUID FK workspace_members
filename        VARCHAR(255)
file_size       INTEGER           -- bytes
mime_type       VARCHAR(100)
storage_path    TEXT              -- path no OCI Object Storage
created_at      TIMESTAMPTZ
```

### cycles

```sql
id              UUID PK
project_id      UUID FK projects
name            VARCHAR(255)
description     TEXT NULL
start_date      DATE
end_date        DATE
status          VARCHAR(10)   -- draft | active | completed
created_by_id   UUID FK workspace_members
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### cycle_issues

```sql
cycle_id    UUID FK cycles
issue_id    UUID FK issues
added_at    TIMESTAMPTZ DEFAULT now()
PRIMARY KEY (cycle_id, issue_id)
```

### modules

```sql
id              UUID PK
project_id      UUID FK projects
name            VARCHAR(255)
description     TEXT NULL
status          VARCHAR(20)   -- backlog | in-progress | paused | completed | cancelled
lead_id         UUID FK workspace_members NULL
start_date      DATE NULL
target_date     DATE NULL
created_by_id   UUID FK workspace_members
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### module_issues

```sql
module_id   UUID FK modules
issue_id    UUID FK issues
added_at    TIMESTAMPTZ DEFAULT now()
PRIMARY KEY (module_id, issue_id)
```

### wiki_spaces

```sql
id              UUID PK
workspace_id    UUID FK workspaces
project_id      UUID FK projects NULL   -- NULL = wiki global do workspace
name            VARCHAR(255)
description     TEXT NULL
icon            VARCHAR(10) NULL
is_private      BOOLEAN DEFAULT false
created_by_id   UUID FK workspace_members
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### wiki_pages

```sql
id              UUID PK
space_id        UUID FK wiki_spaces
parent_id       UUID FK wiki_pages NULL
title           VARCHAR(500)
content         JSONB              -- TipTap / Yjs doc state
emoji           VARCHAR(10) NULL
cover_url       TEXT NULL
sort_order      FLOAT
is_locked       BOOLEAN DEFAULT false
is_archived     BOOLEAN DEFAULT false
is_published    BOOLEAN DEFAULT false
published_token VARCHAR(64) NULL UNIQUE  -- acesso público
word_count      INTEGER DEFAULT 0
created_by_id   UUID FK workspace_members
updated_by_id   UUID FK workspace_members NULL
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
search_vector   TSVECTOR
```

### wiki_page_versions

```sql
id              UUID PK
page_id         UUID FK wiki_pages
version_number  INTEGER
title           VARCHAR(500)
content         JSONB
change_summary  VARCHAR(500) NULL
created_by_id   UUID FK workspace_members
created_at      TIMESTAMPTZ
```

### wiki_issue_links

```sql
id              UUID PK
page_id         UUID FK wiki_pages
issue_id        UUID FK issues
link_type       VARCHAR(20)   -- spec | runbook | postmortem | decision | related
created_by_id   UUID FK workspace_members
created_at      TIMESTAMPTZ
UNIQUE (page_id, issue_id)
```

### wiki_page_comments

```sql
id              UUID PK
page_id         UUID FK wiki_pages
author_id       UUID FK workspace_members
content         TEXT
selection_text  TEXT NULL    -- texto selecionado que originou o comentário
is_resolved     BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### notifications

```sql
id              UUID PK
recipient_id    UUID FK workspace_members
actor_id        UUID FK workspace_members NULL
type            VARCHAR(50)
  -- issue_assigned | issue_commented | issue_state_changed
  -- cpm_critical_alert | portfolio_rag_changed | wiki_mentioned
entity_type     VARCHAR(50)   -- "issue" | "wiki_page" | "portfolio_project"
entity_id       UUID
title           VARCHAR(500)
message         TEXT NULL
action_url      TEXT NULL
is_read         BOOLEAN DEFAULT false
read_at         TIMESTAMPTZ NULL
created_at      TIMESTAMPTZ
```

---

## Tabelas Fase 2 — CPM

### cpm_issue_data

```sql
id              UUID PK
issue_id        UUID FK issues UNIQUE
duration_days   INTEGER DEFAULT 1
es              INTEGER NULL   -- Early Start
ef              INTEGER NULL   -- Early Finish
ls              INTEGER NULL   -- Late Start
lf              INTEGER NULL   -- Late Finish
slack           INTEGER NULL   -- LS - ES (0 = caminho crítico)
is_critical     BOOLEAN DEFAULT false
calculated_at   TIMESTAMPTZ NULL
```

### cpm_baselines

```sql
id              UUID PK
project_id      UUID FK projects
name            VARCHAR(255)
snapshot        JSONB          -- estado completo do CPM no momento
created_by_id   UUID FK workspace_members
created_at      TIMESTAMPTZ
```

---

## Tabelas Fase 3 — Portfolio

### portfolios

```sql
id              UUID PK
workspace_id    UUID FK workspaces
name            VARCHAR(255)
description     TEXT NULL
owner_id        UUID FK workspace_members
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### portfolio_projects

```sql
id              UUID PK
portfolio_id    UUID FK portfolios
project_id      UUID FK projects
start_date      DATE NULL
end_date        DATE NULL
budget_planned  NUMERIC(15,2) DEFAULT 0
budget_actual   NUMERIC(15,2) DEFAULT 0
rag_status      VARCHAR(10) DEFAULT 'GREEN'   -- GREEN | AMBER | RED
rag_override    BOOLEAN DEFAULT false
rag_note        TEXT NULL
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
UNIQUE (portfolio_id, project_id)
```

### portfolio_project_deps

```sql
id                  UUID PK
portfolio_id        UUID FK portfolios
predecessor_id      UUID FK portfolio_projects
successor_id        UUID FK portfolio_projects
created_at          TIMESTAMPTZ
```

### portfolio_objectives

```sql
id              UUID PK
portfolio_id    UUID FK portfolios
title           VARCHAR(500)
description     TEXT NULL
target_value    NUMERIC(10,2)
current_value   NUMERIC(10,2) DEFAULT 0
unit            VARCHAR(50) NULL   -- "%", "projetos", "R$"
due_date        DATE NULL
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### objective_projects

```sql
objective_id    UUID FK portfolio_objectives
project_id      UUID FK projects
weight          NUMERIC(5,2) DEFAULT 1.0
PRIMARY KEY (objective_id, project_id)
```

### portfolio_cost_entries

```sql
id              UUID PK
portfolio_project_id UUID FK portfolio_projects
date            DATE
amount          NUMERIC(15,2)
category        VARCHAR(20)   -- labor | infrastructure | licenses | services | other
description     TEXT NULL
created_by_id   UUID FK workspace_members
created_at      TIMESTAMPTZ
```

### audit_logs

```sql
id              UUID PK
workspace_id    UUID FK workspaces
actor_id        UUID FK workspace_members NULL
action          VARCHAR(50)    -- create | update | delete | login | export
entity_type     VARCHAR(50)
entity_id       UUID NULL
ip_address      INET NULL
user_agent      TEXT NULL
changes         JSONB NULL     -- {field: {old, new}}
created_at      TIMESTAMPTZ
```

---

## Views

### v_issues_summary

Desnormaliza dados frequentemente consultados para evitar JOINs repetitivos:

```sql
SELECT
    i.*,
    p.name        AS project_name,
    p.identifier  AS project_identifier,
    s.name        AS state_name,
    s.color       AS state_color,
    s.category    AS state_category,
    m.name        AS assignee_name,
    m.avatar_url  AS assignee_avatar,
    cd.slack      AS cpm_slack,
    cd.is_critical
FROM issues i
JOIN projects p        ON p.id = i.project_id
JOIN issue_states s    ON s.id = i.state_id
LEFT JOIN workspace_members m ON m.id = i.assignee_id
LEFT JOIN cpm_issue_data cd   ON cd.issue_id = i.id
```

### v_portfolio_evm

Calcula métricas EVM por portfolio_project:

```sql
SELECT
    pp.*,
    p.name AS project_name,
    COUNT(i.id)                                           AS total_issues,
    COUNT(i.id) FILTER (WHERE s.category = 'completed')  AS completed_issues,
    ROUND(
        COUNT(i.id) FILTER (WHERE s.category = 'completed')::NUMERIC
        / NULLIF(COUNT(i.id), 0) * 100, 2
    )                                                     AS pct_issues_completed,
    EXTRACT(EPOCH FROM (now() - pp.start_date)) /
    NULLIF(EXTRACT(EPOCH FROM (pp.end_date - pp.start_date)), 0) * 100
                                                          AS pct_time_elapsed
FROM portfolio_projects pp
JOIN projects p ON p.id = pp.project_id
LEFT JOIN issues i ON i.project_id = pp.project_id
LEFT JOIN issue_states s ON s.id = i.state_id
GROUP BY pp.id, p.name
```

---

## Funções auxiliares

### trigger_set_updated_at()

Aplicada em todas as tabelas com `updated_at`:

```sql
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### next_sequence_id(project_id UUID)

Gera `sequence_id` incremental por projeto (GLPI-1, GLPI-2...):

```sql
CREATE OR REPLACE FUNCTION next_sequence_id(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_id INTEGER;
BEGIN
    SELECT COALESCE(MAX(sequence_id), 0) + 1
    INTO next_id
    FROM issues
    WHERE project_id = p_project_id;
    RETURN next_id;
END;
$$ LANGUAGE plpgsql;
```

Chamar no `save()` do model Django quando `sequence_id` for None.
