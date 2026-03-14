-- =============================================================================
-- ProjectHub — Script de Inicialização do Banco de Dados
-- PostgreSQL 16
-- Módulos: Workspace, Projetos, Issues, Ciclos, Wiki, CPM, Portfolio
-- =============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- busca full-text trigram
CREATE EXTENSION IF NOT EXISTS "unaccent";       -- busca sem acentos

-- Schema para o Keycloak (caso use o Keycloak no mesmo banco)
CREATE SCHEMA IF NOT EXISTS keycloak;

-- =============================================================================
-- FUNÇÕES AUXILIARES
-- =============================================================================

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gera sequence_id por projeto (ex: GLPI-1, GLPI-2...)
CREATE OR REPLACE FUNCTION next_sequence_id(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_next INTEGER;
BEGIN
    SELECT COALESCE(MAX(sequence_id), 0) + 1
    INTO v_next
    FROM issues
    WHERE project_id = p_project_id;
    RETURN v_next;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- MÓDULO 1 — WORKSPACE E MEMBROS
-- =============================================================================

CREATE TABLE workspaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255)    NOT NULL,
    slug            VARCHAR(100)    NOT NULL UNIQUE,
    description     TEXT,
    logo_url        VARCHAR(500),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Membros sincronizados a partir do Keycloak via OIDC
CREATE TABLE workspace_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    keycloak_sub    VARCHAR(255)    NOT NULL UNIQUE,  -- subject do token JWT
    name            VARCHAR(255),
    email           VARCHAR(255),
    avatar_url      VARCHAR(500),
    role            VARCHAR(20)     NOT NULL DEFAULT 'member'
                        CHECK (role IN ('admin', 'member', 'guest')),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMP,
    joined_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_email ON workspace_members(email);

CREATE TRIGGER trg_workspace_members_updated_at
    BEFORE UPDATE ON workspace_members
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- =============================================================================
-- MÓDULO 2 — PROJETOS
-- =============================================================================

CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(255)    NOT NULL,
    identifier      VARCHAR(10)     NOT NULL,     -- ex: "GLPI", "SSO", "OCI"
    description     TEXT,
    icon            VARCHAR(10),                  -- emoji
    color           VARCHAR(7),                   -- hex: #3B82F6
    status          VARCHAR(20)     NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    is_private      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_by      UUID            REFERENCES workspace_members(id) ON DELETE SET NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, identifier)
);

CREATE INDEX idx_projects_workspace ON projects(workspace_id);

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Membros do projeto com papel específico
CREATE TABLE project_members (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    project_id      UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    member_id       UUID            NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
    role            VARCHAR(20)     NOT NULL DEFAULT 'member'
                        CHECK (role IN ('admin', 'member', 'viewer')),
    joined_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, member_id)
);

-- Estados customizáveis por projeto
CREATE TABLE issue_states (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(100)    NOT NULL,
    color           VARCHAR(7)      NOT NULL DEFAULT '#6B7280',
    category        VARCHAR(20)     NOT NULL
                        CHECK (category IN ('backlog', 'unstarted', 'started', 'completed', 'cancelled')),
    position        INTEGER         NOT NULL DEFAULT 0,
    is_default      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_states_project ON issue_states(project_id);

-- Labels por projeto
CREATE TABLE labels (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(100)    NOT NULL,
    color           VARCHAR(7)      NOT NULL DEFAULT '#6B7280',
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_labels_project ON labels(project_id);


-- =============================================================================
-- MÓDULO 3 — ISSUES
-- =============================================================================

CREATE TABLE issues (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sequence_id     INTEGER         NOT NULL,     -- GLPI-1, GLPI-2 (gerado por função)
    title           VARCHAR(500)    NOT NULL,
    description     JSONB,                        -- conteúdo TipTap serializado
    state_id        UUID            REFERENCES issue_states(id) ON DELETE SET NULL,
    priority        VARCHAR(20)     NOT NULL DEFAULT 'none'
                        CHECK (priority IN ('urgent', 'high', 'medium', 'low', 'none')),
    type            VARCHAR(20)     NOT NULL DEFAULT 'task'
                        CHECK (type IN ('task', 'bug', 'story', 'epic', 'subtask')),
    assignee_id     UUID            REFERENCES workspace_members(id) ON DELETE SET NULL,
    reporter_id     UUID            REFERENCES workspace_members(id) ON DELETE SET NULL,
    parent_id       UUID            REFERENCES issues(id) ON DELETE SET NULL,   -- sub-task
    epic_id         UUID            REFERENCES issues(id) ON DELETE SET NULL,   -- épico pai
    estimate_points INTEGER,
    size            VARCHAR(5)      CHECK (size IN ('xs','s','m','l','xl')),
    estimate_days   FLOAT,
    milestone_id    UUID            REFERENCES milestones(id) ON DELETE SET NULL,
    due_date        DATE,
    start_date      DATE,
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    sort_order      FLOAT           NOT NULL DEFAULT 0,  -- ordem no board
    created_by      UUID            REFERENCES workspace_members(id) ON DELETE SET NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, sequence_id)
);

CREATE INDEX idx_issues_project       ON issues(project_id);
CREATE INDEX idx_issues_state         ON issues(state_id);
CREATE INDEX idx_issues_assignee      ON issues(assignee_id);
CREATE INDEX idx_issues_epic          ON issues(epic_id);
CREATE INDEX idx_issues_parent        ON issues(parent_id);
CREATE INDEX idx_issues_due_date      ON issues(due_date);
CREATE INDEX idx_issues_milestone     ON issues(milestone_id);
CREATE INDEX idx_issues_updated_at    ON issues(updated_at DESC);

-- Índice de busca full-text
CREATE INDEX idx_issues_fts ON issues
    USING GIN (to_tsvector('portuguese', title || ' ' || COALESCE(description::text, '')));

CREATE TRIGGER trg_issues_updated_at
    BEFORE UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Relacionamentos e dependências entre issues
CREATE TABLE issue_relations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id        UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    related_id      UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    relation_type   VARCHAR(30)     NOT NULL
                        CHECK (relation_type IN (
                            'blocks',           -- bloqueia
                            'blocked_by',       -- é bloqueado por
                            'duplicates',       -- duplica
                            'duplicate_of',     -- é duplicata de
                            'relates_to',       -- relacionado a
                            'finish_to_start',  -- CPM: B inicia após A terminar
                            'start_to_start',   -- CPM: B inicia quando A inicia
                            'finish_to_finish'  -- CPM: B termina quando A termina
                        )),
    lag_days        INTEGER         NOT NULL DEFAULT 0,   -- CPM: lag positivo / lead negativo
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (issue_id, related_id, relation_type)
);

CREATE INDEX idx_issue_relations_issue   ON issue_relations(issue_id);
CREATE INDEX idx_issue_relations_related ON issue_relations(related_id);

-- Labels das issues
CREATE TABLE issue_labels (
    issue_id        UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    label_id        UUID            NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (issue_id, label_id)
);

-- Comentários
CREATE TABLE issue_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id        UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    author_id       UUID            NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
    content         JSONB           NOT NULL,     -- TipTap
    is_edited       BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_comments_issue ON issue_comments(issue_id);

CREATE TRIGGER trg_issue_comments_updated_at
    BEFORE UPDATE ON issue_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Histórico de atividade (log de alterações)
CREATE TABLE issue_activities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id        UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    actor_id        UUID            REFERENCES workspace_members(id) ON DELETE SET NULL,
    activity_type   VARCHAR(50)     NOT NULL,     -- 'state_changed', 'assigned', 'commented'...
    field           VARCHAR(100),                 -- campo alterado
    old_value       TEXT,
    new_value       TEXT,
    old_identifier  VARCHAR(255),                 -- nome legível do valor antigo
    new_identifier  VARCHAR(255),                 -- nome legível do valor novo
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_activities_issue ON issue_activities(issue_id);
CREATE INDEX idx_issue_activities_created ON issue_activities(created_at DESC);

-- Anexos
CREATE TABLE issue_attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id        UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    uploaded_by     UUID            NOT NULL REFERENCES workspace_members(id),
    file_name       VARCHAR(500)    NOT NULL,
    file_size       INTEGER,
    mime_type       VARCHAR(100),
    storage_path    VARCHAR(1000)   NOT NULL,     -- caminho no OCI Object Storage
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_attachments_issue ON issue_attachments(issue_id);


-- =============================================================================
-- MÓDULO 4 — CICLOS (SPRINTS)
-- =============================================================================

CREATE TABLE cycles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    start_date      DATE,
    end_date        DATE,
    status          VARCHAR(20)     NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'completed')),
    created_by      UUID            REFERENCES workspace_members(id) ON DELETE SET NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cycles_project ON cycles(project_id);

CREATE TRIGGER trg_cycles_updated_at
    BEFORE UPDATE ON cycles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE cycle_issues (
    cycle_id        UUID            NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
    issue_id        UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    added_at        TIMESTAMP       NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cycle_id, issue_id)
);

CREATE INDEX idx_cycle_issues_issue ON cycle_issues(issue_id);


-- =============================================================================
-- MÓDULO 4b — MILESTONES
-- =============================================================================

CREATE TABLE IF NOT EXISTS milestones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    due_date    DATE,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'reached', 'missed')),
    created_by  UUID REFERENCES workspace_members(id) ON DELETE SET NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);

CREATE TRIGGER trg_milestones_updated_at
    BEFORE UPDATE ON milestones
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- =============================================================================
-- MÓDULO 5 — MÓDULOS (agrupadores temáticos de issues)
-- =============================================================================

CREATE TABLE modules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    status          VARCHAR(20)     NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('backlog', 'in_progress', 'paused', 'completed', 'cancelled')),
    lead_id         UUID            REFERENCES workspace_members(id) ON DELETE SET NULL,
    start_date      DATE,
    target_date     DATE,
    created_by      UUID            REFERENCES workspace_members(id) ON DELETE SET NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modules_project ON modules(project_id);

CREATE TRIGGER trg_modules_updated_at
    BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE module_issues (
    module_id       UUID            NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    issue_id        UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    added_at        TIMESTAMP       NOT NULL DEFAULT NOW(),
    PRIMARY KEY (module_id, issue_id)
);


-- =============================================================================
-- MÓDULO 6 — WIKI
-- =============================================================================

-- Spaces: agrupadores de documentos
-- project_id NULL = wiki global do workspace
CREATE TABLE wiki_spaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id      UUID            REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    icon            VARCHAR(10),                  -- emoji
    color           VARCHAR(7),
    is_private      BOOLEAN         NOT NULL DEFAULT FALSE,
    position        INTEGER         NOT NULL DEFAULT 0,
    created_by      UUID            REFERENCES workspace_members(id) ON DELETE SET NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wiki_spaces_workspace ON wiki_spaces(workspace_id);
CREATE INDEX idx_wiki_spaces_project   ON wiki_spaces(project_id);

CREATE TRIGGER trg_wiki_spaces_updated_at
    BEFORE UPDATE ON wiki_spaces
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Páginas com hierarquia
CREATE TABLE wiki_pages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id        UUID            NOT NULL REFERENCES wiki_spaces(id) ON DELETE CASCADE,
    parent_id       UUID            REFERENCES wiki_pages(id) ON DELETE CASCADE,
    title           VARCHAR(500)    NOT NULL DEFAULT 'Página sem título',
    content         JSONB,                        -- documento TipTap completo
    emoji           VARCHAR(10),
    cover_url       VARCHAR(500),
    is_locked       BOOLEAN         NOT NULL DEFAULT FALSE,
    is_archived     BOOLEAN         NOT NULL DEFAULT FALSE,
    is_published    BOOLEAN         NOT NULL DEFAULT FALSE,   -- acesso público
    published_token VARCHAR(64),                              -- token para link público
    position        FLOAT           NOT NULL DEFAULT 0,
    view_count      INTEGER         NOT NULL DEFAULT 0,
    word_count      INTEGER         NOT NULL DEFAULT 0,
    created_by      UUID            NOT NULL REFERENCES workspace_members(id),
    updated_by      UUID            REFERENCES workspace_members(id),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wiki_pages_space     ON wiki_pages(space_id);
CREATE INDEX idx_wiki_pages_parent    ON wiki_pages(parent_id);
CREATE INDEX idx_wiki_pages_published ON wiki_pages(published_token) WHERE published_token IS NOT NULL;

-- Índice de busca full-text para wiki
CREATE INDEX idx_wiki_pages_fts ON wiki_pages
    USING GIN (to_tsvector('portuguese', title || ' ' || COALESCE(content::text, '')));

CREATE TRIGGER trg_wiki_pages_updated_at
    BEFORE UPDATE ON wiki_pages
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Versionamento de páginas
CREATE TABLE wiki_page_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         UUID            NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
    title           VARCHAR(500),
    content         JSONB,
    version         INTEGER         NOT NULL,
    change_summary  VARCHAR(255),                 -- resumo opcional da alteração
    saved_by        UUID            NOT NULL REFERENCES workspace_members(id),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wiki_page_versions_page ON wiki_page_versions(page_id, version DESC);

-- Vínculo nativo entre página wiki e issue
CREATE TABLE wiki_issue_links (
    page_id         UUID            NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
    issue_id        UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    link_type       VARCHAR(30)     NOT NULL DEFAULT 'related'
                        CHECK (link_type IN ('spec', 'runbook', 'postmortem', 'decision', 'related')),
    created_by      UUID            REFERENCES workspace_members(id) ON DELETE SET NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    PRIMARY KEY (page_id, issue_id)
);

CREATE INDEX idx_wiki_issue_links_issue ON wiki_issue_links(issue_id);

-- Comentários nas páginas wiki
CREATE TABLE wiki_page_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         UUID            NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
    author_id       UUID            NOT NULL REFERENCES workspace_members(id),
    content         TEXT            NOT NULL,
    selection_text  TEXT,                         -- trecho do texto comentado
    resolved        BOOLEAN         NOT NULL DEFAULT FALSE,
    resolved_by     UUID            REFERENCES workspace_members(id),
    resolved_at     TIMESTAMP,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wiki_page_comments_page ON wiki_page_comments(page_id);


-- =============================================================================
-- MÓDULO 7 — NOTIFICAÇÕES
-- =============================================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    recipient_id    UUID            NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
    actor_id        UUID            REFERENCES workspace_members(id) ON DELETE SET NULL,
    type            VARCHAR(50)     NOT NULL,
                                                  -- 'issue_assigned', 'issue_commented',
                                                  -- 'issue_state_changed', 'page_mentioned',
                                                  -- 'cpm_critical_alert', 'portfolio_rag_changed'
    title           VARCHAR(255)    NOT NULL,
    body            TEXT,
    entity_type     VARCHAR(30),                  -- 'issue', 'page', 'cycle', 'project'
    entity_id       UUID,
    action_url      VARCHAR(500),
    is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMP,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_entity    ON notifications(entity_type, entity_id);


-- =============================================================================
-- MÓDULO 8 — CPM (CAMINHO CRÍTICO)
-- Fase 2 — dados adicionais por issue para o algoritmo CPM
-- =============================================================================

CREATE TABLE cpm_issue_data (
    issue_id        UUID PRIMARY KEY REFERENCES issues(id) ON DELETE CASCADE,
    duration_days   INTEGER         NOT NULL DEFAULT 1 CHECK (duration_days > 0),
    -- Forward pass
    es              INTEGER         NOT NULL DEFAULT 0,    -- Early Start (dias desde início do projeto)
    ef              INTEGER         NOT NULL DEFAULT 1,    -- Early Finish
    -- Backward pass
    ls              INTEGER         NOT NULL DEFAULT 0,    -- Late Start
    lf              INTEGER         NOT NULL DEFAULT 1,    -- Late Finish
    -- Resultado
    slack           INTEGER         NOT NULL DEFAULT 0,    -- Folga total (LS - ES)
    is_critical     BOOLEAN         NOT NULL DEFAULT FALSE,
    calculated_at   TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Baseline: snapshot do plano original para comparar com o realizado
CREATE TABLE cpm_baselines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(255)    NOT NULL DEFAULT 'Baseline Original',
    snapshot        JSONB           NOT NULL,     -- cópia de cpm_issue_data no momento do save
    created_by      UUID            REFERENCES workspace_members(id),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cpm_baselines_project ON cpm_baselines(project_id);


-- =============================================================================
-- MÓDULO 9 — PORTFOLIO
-- Fase 3 — gestão estratégica multi-projeto
-- =============================================================================

CREATE TABLE portfolios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    owner_id        UUID            REFERENCES workspace_members(id) ON DELETE SET NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolios_workspace ON portfolios(workspace_id);

CREATE TRIGGER trg_portfolios_updated_at
    BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Projetos vinculados ao portfolio com dados estratégicos
CREATE TABLE portfolio_projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id    UUID            NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    project_id      UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    start_date      DATE,
    end_date        DATE,
    budget_planned  NUMERIC(15,2)   NOT NULL DEFAULT 0,
    budget_actual   NUMERIC(15,2)   NOT NULL DEFAULT 0,
    rag_status      VARCHAR(10)     NOT NULL DEFAULT 'GREEN'
                        CHECK (rag_status IN ('GREEN', 'AMBER', 'RED')),
    rag_override    BOOLEAN         NOT NULL DEFAULT FALSE,  -- PM força o RAG manualmente
    rag_note        TEXT,                                    -- justificativa do override
    position        INTEGER         NOT NULL DEFAULT 0,
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (portfolio_id, project_id)
);

CREATE INDEX idx_portfolio_projects_portfolio ON portfolio_projects(portfolio_id);
CREATE INDEX idx_portfolio_projects_project   ON portfolio_projects(project_id);

CREATE TRIGGER trg_portfolio_projects_updated_at
    BEFORE UPDATE ON portfolio_projects
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Dependências entre projetos no portfolio
CREATE TABLE portfolio_project_deps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    predecessor_id  UUID            NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
    successor_id    UUID            NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
    description     TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (predecessor_id, successor_id)
);

-- Objetivos estratégicos (OKR)
CREATE TABLE portfolio_objectives (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id    UUID            NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    title           VARCHAR(500)    NOT NULL,
    description     TEXT,
    target_value    NUMERIC         NOT NULL DEFAULT 100,
    current_value   NUMERIC         NOT NULL DEFAULT 0,
    unit            VARCHAR(50)     NOT NULL DEFAULT '%',    -- '%', 'R$', 'unidades'...
    due_date        DATE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolio_objectives_portfolio ON portfolio_objectives(portfolio_id);

CREATE TRIGGER trg_portfolio_objectives_updated_at
    BEFORE UPDATE ON portfolio_objectives
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Vincula projetos a objetivos com peso (para cálculo de progresso ponderado)
CREATE TABLE objective_projects (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    objective_id    UUID            NOT NULL REFERENCES portfolio_objectives(id) ON DELETE CASCADE,
    project_id      UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    weight          NUMERIC(5,2)    NOT NULL DEFAULT 1.0 CHECK (weight > 0),
    PRIMARY KEY (objective_id, project_id)
);

-- Lançamentos de custo real por projeto
CREATE TABLE portfolio_cost_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_project_id UUID       NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
    description     VARCHAR(500)    NOT NULL,
    amount          NUMERIC(15,2)   NOT NULL,
    entry_date      DATE            NOT NULL DEFAULT CURRENT_DATE,
    category        VARCHAR(50)     NOT NULL DEFAULT 'other'
                        CHECK (category IN ('labor', 'infrastructure', 'licenses', 'services', 'other')),
    registered_by   UUID            REFERENCES workspace_members(id),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolio_cost_entries_pp ON portfolio_cost_entries(portfolio_project_id);


-- =============================================================================
-- MÓDULO 10 — AUDITORIA GERAL
-- =============================================================================

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    actor_id        UUID            REFERENCES workspace_members(id) ON DELETE SET NULL,
    action          VARCHAR(50)     NOT NULL,     -- 'create', 'update', 'delete', 'login'
    entity_type     VARCHAR(50)     NOT NULL,     -- 'issue', 'project', 'page', 'user'...
    entity_id       UUID,
    entity_name     VARCHAR(500),                 -- snapshot do nome no momento
    ip_address      INET,
    user_agent      TEXT,
    changes         JSONB,                        -- diff das mudanças
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor     ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity    ON audit_logs(entity_type, entity_id);


-- =============================================================================
-- DADOS INICIAIS — Workspace padrão
-- =============================================================================

DO $$
DECLARE
    v_workspace_id  UUID := gen_random_uuid();
    v_project_id    UUID := gen_random_uuid();
BEGIN

    -- Workspace inicial
    INSERT INTO workspaces (id, name, slug, description)
    VALUES (
        v_workspace_id,
        'Prefeitura de Novo Hamburgo',
        'pnh',
        'Workspace principal — Transformação Digital TI'
    );

    -- Projeto de exemplo
    INSERT INTO projects (id, workspace_id, name, identifier, description, icon, color)
    VALUES (
        v_project_id,
        v_workspace_id,
        'ProjectHub — Implantação',
        'HUB',
        'Projeto de desenvolvimento e implantação do ProjectHub',
        '🚀',
        '#3B82F6'
    );

    -- Estados padrão para o projeto de exemplo
    INSERT INTO issue_states (project_id, name, color, category, position, is_default) VALUES
        (v_project_id, 'Backlog',       '#6B7280', 'backlog',    1, FALSE),
        (v_project_id, 'A Fazer',       '#3B82F6', 'unstarted',  2, TRUE),
        (v_project_id, 'Em Progresso',  '#F59E0B', 'started',    3, FALSE),
        (v_project_id, 'Em Revisão',    '#8B5CF6', 'started',    4, FALSE),
        (v_project_id, 'Concluído',     '#10B981', 'completed',  5, FALSE),
        (v_project_id, 'Cancelado',     '#EF4444', 'cancelled',  6, FALSE);

    -- Labels padrão
    INSERT INTO labels (project_id, name, color) VALUES
        (v_project_id, 'bug',            '#EF4444'),
        (v_project_id, 'funcionalidade', '#3B82F6'),
        (v_project_id, 'melhoria',       '#10B981'),
        (v_project_id, 'documentação',   '#F59E0B'),
        (v_project_id, 'urgente',        '#DC2626');

    -- Wiki Space global
    INSERT INTO wiki_spaces (workspace_id, project_id, name, icon, description, position)
    VALUES (
        v_workspace_id,
        v_project_id,
        'Documentação TI',
        '📚',
        'Base de conhecimento da Coordenadoria de TI',
        1
    );

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao inserir dados iniciais: %', SQLERRM;
END;
$$;


-- =============================================================================
-- VIEWS ÚTEIS
-- =============================================================================

-- Visão completa de issues com dados desnormalizados (para listagens)
CREATE VIEW v_issues_summary AS
SELECT
    i.id,
    i.project_id,
    p.name                  AS project_name,
    p.identifier            AS project_identifier,
    i.sequence_id,
    p.identifier || '-' || i.sequence_id AS issue_key,
    i.title,
    i.priority,
    i.type,
    s.name                  AS state_name,
    s.color                 AS state_color,
    s.category              AS state_category,
    a.name                  AS assignee_name,
    a.email                 AS assignee_email,
    i.due_date,
    i.estimate_points,
    i.created_at,
    i.updated_at,
    i.completed_at,
    -- CPM
    cpm.is_critical,
    cpm.slack               AS cpm_slack,
    cpm.duration_days
FROM issues i
JOIN projects p          ON p.id = i.project_id
LEFT JOIN issue_states s ON s.id = i.state_id
LEFT JOIN workspace_members a ON a.id = i.assignee_id
LEFT JOIN cpm_issue_data cpm ON cpm.issue_id = i.id;

-- Visão do portfolio com EVM calculado
CREATE VIEW v_portfolio_evm AS
SELECT
    pp.id                   AS portfolio_project_id,
    pp.portfolio_id,
    p.name                  AS project_name,
    p.identifier,
    pp.start_date,
    pp.end_date,
    pp.budget_planned,
    pp.budget_actual,
    pp.rag_status,
    -- Percentual de tempo decorrido
    CASE
        WHEN pp.end_date IS NULL OR pp.start_date IS NULL THEN 0
        ELSE ROUND(
            EXTRACT(DAY FROM (NOW() - pp.start_date::timestamp)) /
            NULLIF(EXTRACT(DAY FROM (pp.end_date::timestamp - pp.start_date::timestamp)), 0) * 100
        , 1)
    END                     AS pct_time_elapsed,
    -- Percentual de issues concluídas (EV proxy)
    ROUND(
        COUNT(i.id) FILTER (WHERE s.category = 'completed')::NUMERIC /
        NULLIF(COUNT(i.id), 0) * 100
    , 1)                    AS pct_issues_completed,
    COUNT(i.id)             AS total_issues,
    COUNT(i.id) FILTER (WHERE s.category = 'completed') AS completed_issues,
    COUNT(i.id) FILTER (WHERE s.category IN ('started', 'unstarted')) AS open_issues
FROM portfolio_projects pp
JOIN projects p ON p.id = pp.project_id
LEFT JOIN issues i ON i.project_id = p.id
LEFT JOIN issue_states s ON s.id = i.state_id
GROUP BY pp.id, pp.portfolio_id, p.name, p.identifier,
         pp.start_date, pp.end_date, pp.budget_planned, pp.budget_actual, pp.rag_status;


-- =============================================================================
-- MÓDULO — REGISTRO DE RISCOS
-- =============================================================================

CREATE TABLE project_risks (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id       UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    category         VARCHAR(50)  NOT NULL DEFAULT 'technical',
    probability      SMALLINT     NOT NULL CHECK (probability BETWEEN 1 AND 5),
    impact           SMALLINT     NOT NULL CHECK (impact BETWEEN 1 AND 5),
    score            SMALLINT     NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'identified',
    response_type    VARCHAR(20),
    owner_id         UUID         REFERENCES workspace_members(id) ON DELETE SET NULL,
    mitigation_plan  TEXT,
    contingency_plan TEXT,
    due_date         DATE,
    created_by       UUID         NOT NULL REFERENCES workspace_members(id) ON DELETE RESTRICT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_risks_project ON project_risks(project_id);
CREATE INDEX idx_project_risks_score   ON project_risks(score DESC);
CREATE INDEX idx_project_risks_status  ON project_risks(status);

CREATE TRIGGER set_updated_at_project_risks
    BEFORE UPDATE ON project_risks
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- =============================================================================
-- FIM DO SCRIPT
-- =============================================================================

COMMENT ON DATABASE dev_projecthub IS 'ProjectHub — Sistema integrado de gestão de projetos, wiki, CPM e portfolio';