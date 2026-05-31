# Risk Register — Design Spec

**Data:** 2026-03-11

## Goal

Adicionar registro de riscos a nível de projeto (PMI 5×5), com visualização de matriz interativa e agregação no portfólio.

## Scope

- Cada projeto tem sua própria lista de riscos
- Riscos aparecem agregados na view de portfólio (contagem por severidade)
- Sem notificações automáticas nesta fase (incremento futuro)

---

## 1. Modelo de Dados

### Tabela: `project_risks`

| Campo            | Tipo                      | Notas                                      |
|------------------|---------------------------|--------------------------------------------|
| id               | UUID PK                   | default uuid4, editable=False              |
| project          | FK → projects.Project     | CASCADE                                    |
| title            | CharField(255)            |                                            |
| description      | TextField                 | nullable                                   |
| category         | CharField choices         | technical, schedule, cost, resource, external, stakeholder |
| probability      | IntegerField              | 1–5                                        |
| impact           | IntegerField              | 1–5                                        |
| score            | IntegerField              | computed: probability × impact (1–25)      |
| status           | CharField choices         | identified, analyzing, mitigating, monitoring, closed, accepted, occurred |
| response_type    | CharField choices         | avoid, transfer, mitigate, accept          |
| owner            | FK → WorkspaceMember      | nullable, PROTECT                          |
| mitigation_plan  | TextField                 | nullable                                   |
| contingency_plan | TextField                 | nullable                                   |
| due_date         | DateField                 | nullable                                   |
| created_by       | FK → WorkspaceMember      | PROTECT, db_column="created_by"            |
| created_at       | DateTimeField             | auto_now_add                               |
| updated_at       | DateTimeField             | auto_now                                   |

**Score thresholds:**
- Verde: score ≤ 6
- Amarelo: score 7–14
- Vermelho/crítico: score ≥ 15

### managed = False
Schema adicionado em `scripts/db/init.sql`. Sem migrations Django.

---

## 2. Backend

### App: `backend/apps/risks/`

**Arquivos:**
- `models.py` — Risk com `save()` que calcula score
- `serializers.py` — RiskSerializer + `owner_name` SerializerMethodField
- `views.py` — RiskListCreateView, RiskDetailView
- `urls.py` — rotas nested em projeto
- `admin.py`, `apps.py`

**Endpoints:**
```
GET    /api/v1/projects/{pk}/risks/       lista (filtros: status, category, score_gte)
POST   /api/v1/projects/{pk}/risks/       cria
GET    /api/v1/projects/{pk}/risks/{id}/  detalhe
PATCH  /api/v1/projects/{pk}/risks/{id}/  edita
DELETE /api/v1/projects/{pk}/risks/{id}/  remove (apenas project admin)
```

**Permissões:**
- Leitura: `IsProjectViewer`
- Escrita (create/update): `IsProjectMember`
- Delete: `IsProjectAdmin`

### Portfolio Integration

`PortfolioProject` serializer ganha dois SerializerMethodFields:
- `risk_count`: total de riscos com status não-fechado (excluindo closed/accepted/occurred)
- `critical_risk_count`: riscos com score ≥ 15

---

## 3. Frontend

### Novos arquivos:
```
frontend/src/
├── types/risk.ts
├── services/risk.service.ts
├── hooks/useRisks.ts
└── features/risks/
    ├── RisksPage.tsx
    ├── RiskMatrix.tsx
    ├── RiskCard.tsx
    └── RiskForm.tsx
```

### Rota nova em App.tsx:
```tsx
<Route path="risks" element={<RisksPage />} />
```

### ProjectNav:
Nova aba "Riscos" entre Backlog e Gantt.

### RisksPage layout:
- Topo: botão "Novo Risco" + filtros (status, categoria)
- Grid 2 colunas:
  - Esquerda: RiskMatrix (grade 5×5, células coloridas, riscos como pontos clicáveis)
  - Direita: lista de RiskCards ordenada por score desc

### RiskMatrix:
- Eixo X: Probabilidade 1–5
- Eixo Y: Impacto 1–5
- Cores de célula por score: verde ≤ 6, amarelo 7–14, vermelho ≥ 15
- Riscos plotados como pontos com tooltip (título + score)

### Portfolio (ExecutiveDashboard.tsx):
- Coluna "Riscos" na tabela de projetos: badge `🔴 2 críticos` quando critical_risk_count > 0, senão `✅ sem críticos`

---

## 4. DB Migration (init.sql)

```sql
CREATE TABLE project_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    probability SMALLINT NOT NULL CHECK (probability BETWEEN 1 AND 5),
    impact SMALLINT NOT NULL CHECK (impact BETWEEN 1 AND 5),
    score SMALLINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'identified',
    response_type VARCHAR(20),
    owner_id UUID REFERENCES workspace_members(id) ON DELETE SET NULL,
    mitigation_plan TEXT,
    contingency_plan TEXT,
    due_date DATE,
    created_by UUID NOT NULL REFERENCES workspace_members(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_risks_project ON project_risks(project_id);
CREATE INDEX idx_project_risks_score ON project_risks(score DESC);
CREATE INDEX idx_project_risks_status ON project_risks(status);
```
