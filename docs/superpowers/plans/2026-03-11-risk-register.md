# Risk Register — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar registro de riscos PMI 5×5 por projeto com matriz visual interativa e agregação no dashboard de portfólio.

**Architecture:** Nova app Django `risks` com model `Risk` (managed=False, schema em init.sql). Frontend: nova aba "Riscos" no ProjectNav com página de matriz 5×5 + lista. Portfólio: colunas risk_count e critical_risk_count no PortfolioDashboardProjectSerializer.

**Tech Stack:** Django 5.1 + DRF + React 18 + TypeScript + TanStack Query + Tailwind CSS

---

## Chunk 1: Backend

### Task 1: DB Schema

**Files:**
- Modify: `scripts/db/init.sql`

- [ ] **Step 1: Adicionar tabela `project_risks` ao final do init.sql**

Abrir `scripts/db/init.sql` e adicionar ao final (depois da tabela `milestones`):

```sql
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
```

- [ ] **Step 2: Executar no banco de dados (desenvolvimento local)**

```bash
# No container do banco ou via psql
docker exec -i projecthub_db psql -U projecthub -d projecthub < scripts/db/init.sql
# Se a tabela já existe parcialmente, execute apenas o bloco novo:
docker exec -i projecthub_db psql -U projecthub -d projecthub -c "
CREATE TABLE IF NOT EXISTS project_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'technical',
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
);"
```

Expected: `CREATE TABLE` (ou `NOTICE: relation already exists` se já criada)

- [ ] **Step 3: Commit**

```bash
git add scripts/db/init.sql
git commit -m "feat(db): add project_risks table"
```

---

### Task 2: App Django `risks`

**Files:**
- Create: `backend/apps/risks/__init__.py`
- Create: `backend/apps/risks/apps.py`
- Create: `backend/apps/risks/models.py`
- Create: `backend/apps/risks/admin.py`

- [ ] **Step 1: Criar `backend/apps/risks/__init__.py`**

Arquivo vazio.

- [ ] **Step 2: Criar `backend/apps/risks/apps.py`**

```python
from django.apps import AppConfig


class RisksConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.risks"
    verbose_name = "Riscos"
```

- [ ] **Step 3: Criar `backend/apps/risks/models.py`**

```python
import uuid

from django.db import models


class Risk(models.Model):
    class Category(models.TextChoices):
        TECHNICAL   = "technical",   "Técnico"
        SCHEDULE    = "schedule",    "Prazo"
        COST        = "cost",        "Custo"
        RESOURCE    = "resource",    "Recurso"
        EXTERNAL    = "external",    "Externo"
        STAKEHOLDER = "stakeholder", "Stakeholder"

    class Status(models.TextChoices):
        IDENTIFIED = "identified", "Identificado"
        ANALYZING  = "analyzing",  "Em análise"
        MITIGATING = "mitigating", "Mitigando"
        MONITORING = "monitoring", "Monitorando"
        CLOSED     = "closed",     "Fechado"
        ACCEPTED   = "accepted",   "Aceito"
        OCCURRED   = "occurred",   "Ocorreu"

    class ResponseType(models.TextChoices):
        AVOID    = "avoid",    "Evitar"
        TRANSFER = "transfer", "Transferir"
        MITIGATE = "mitigate", "Mitigar"
        ACCEPT   = "accept",   "Aceitar"

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project          = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="risks"
    )
    title            = models.CharField(max_length=255)
    description      = models.TextField(blank=True, null=True)
    category         = models.CharField(
        max_length=50, choices=Category.choices, default=Category.TECHNICAL
    )
    probability      = models.SmallIntegerField()  # 1-5
    impact           = models.SmallIntegerField()  # 1-5
    score            = models.SmallIntegerField(editable=False)
    status           = models.CharField(
        max_length=20, choices=Status.choices, default=Status.IDENTIFIED
    )
    response_type    = models.CharField(
        max_length=20, choices=ResponseType.choices, blank=True, null=True
    )
    owner            = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="owned_risks",
        null=True,
        blank=True,
    )
    mitigation_plan  = models.TextField(blank=True, null=True)
    contingency_plan = models.TextField(blank=True, null=True)
    due_date         = models.DateField(null=True, blank=True)
    created_by       = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="created_risks",
        db_column="created_by",
    )
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        managed  = False
        db_table = "project_risks"
        ordering = ["-score", "title"]

    def save(self, *args, **kwargs):
        self.score = self.probability * self.impact
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} (score={self.score})"
```

- [ ] **Step 4: Criar `backend/apps/risks/admin.py`**

```python
from django.contrib import admin
from .models import Risk


@admin.register(Risk)
class RiskAdmin(admin.ModelAdmin):
    list_display  = ("title", "project", "category", "probability", "impact", "score", "status")
    list_filter   = ("status", "category")
    search_fields = ("title",)
    ordering      = ("-score",)
```

- [ ] **Step 5: Registrar app em `backend/config/settings/base.py`**

Abrir `backend/config/settings/base.py` e adicionar `"apps.risks"` na lista `INSTALLED_APPS` (logo após `"apps.milestones"`):

```python
    "apps.milestones",
    "apps.risks",       # <-- adicionar esta linha
```

- [ ] **Step 6: Commit**

```bash
git add backend/apps/risks/ backend/config/settings/base.py
git commit -m "feat(risks): add Risk model and app skeleton"
```

---

### Task 3: Serializer e Views

**Files:**
- Create: `backend/apps/risks/serializers.py`
- Create: `backend/apps/risks/views.py`
- Create: `backend/apps/risks/urls.py`

- [ ] **Step 1: Criar `backend/apps/risks/serializers.py`**

```python
from rest_framework import serializers
from .models import Risk


class RiskSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model  = Risk
        fields = [
            "id", "project",
            "title", "description", "category",
            "probability", "impact", "score",
            "status", "response_type",
            "owner", "owner_name",
            "mitigation_plan", "contingency_plan",
            "due_date",
            "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "project", "score", "created_by", "created_at", "updated_at"]

    def get_owner_name(self, obj: Risk) -> str | None:
        if obj.owner_id:
            return obj.owner.name
        return None

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
```

- [ ] **Step 2: Criar `backend/apps/risks/views.py`**

```python
from rest_framework import generics
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated

from core.pagination import StandardPagination

from .models import Risk
from .serializers import RiskSerializer


def _get_project(pk, user):
    from apps.projects.models import Project

    try:
        project = Project.objects.get(pk=pk)
    except Project.DoesNotExist:
        raise NotFound("Projeto não encontrado.")
    if user.role != "admin" and not project.members.filter(member=user).exists():
        raise NotFound("Projeto não encontrado.")
    return project


class RiskListCreateView(generics.ListCreateAPIView):
    """GET /projects/{project_pk}/risks/   — lista riscos do projeto
    POST /projects/{project_pk}/risks/   — cria novo risco"""

    serializer_class   = RiskSerializer
    permission_classes = [IsAuthenticated]
    pagination_class   = StandardPagination

    def _project(self):
        return _get_project(self.kwargs["project_pk"], self.request.user)

    def get_queryset(self):
        qs = Risk.objects.filter(project=self._project())
        status   = self.request.query_params.get("status")
        category = self.request.query_params.get("category")
        score_gte = self.request.query_params.get("score_gte")
        if status:
            qs = qs.filter(status=status)
        if category:
            qs = qs.filter(category=category)
        if score_gte:
            qs = qs.filter(score__gte=int(score_gte))
        return qs

    def perform_create(self, serializer):
        serializer.save(project=self._project())


class RiskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /projects/{project_pk}/risks/{pk}/"""

    serializer_class   = RiskSerializer
    permission_classes = [IsAuthenticated]
    http_method_names  = ["get", "patch", "delete", "head", "options"]

    def _project(self):
        return _get_project(self.kwargs["project_pk"], self.request.user)

    def get_object(self):
        project = self._project()
        try:
            return Risk.objects.get(pk=self.kwargs["pk"], project=project)
        except Risk.DoesNotExist:
            raise NotFound("Risco não encontrado.")

    def perform_destroy(self, instance):
        user = self.request.user
        project = self._project()
        is_admin = (
            user.role == "admin"
            or project.members.filter(member=user, role="admin").exists()
        )
        if not is_admin:
            raise PermissionDenied("Apenas admins podem deletar riscos.")
        instance.delete()
```

- [ ] **Step 3: Criar `backend/apps/risks/urls.py`**

```python
from django.urls import path
from .views import RiskDetailView, RiskListCreateView

urlpatterns = [
    path("",         RiskListCreateView.as_view(), name="risk-list"),
    path("<uuid:pk>/", RiskDetailView.as_view(),   name="risk-detail"),
]
```

- [ ] **Step 4: Registrar URLs em `backend/apps/projects/urls.py`**

Abrir `backend/apps/projects/urls.py`. Ao final da lista `urlpatterns`, adicionar:

```python
    # Risks (aninhados)
    path("<uuid:project_pk>/risks/", include(("apps.risks.urls", "project-risks"))),
```

Certificar que `include` já está importado (já está na linha 1).

- [ ] **Step 5: Testar endpoints manualmente**

```bash
# Após sync/restart do backend:
make sync-backend   # ou: docker compose restart api

# Criar risco (substituir TOKEN e PROJECT_ID):
curl -X POST http://localhost:8000/api/v1/projects/{PROJECT_ID}/risks/ \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Risco de prazo","category":"schedule","probability":4,"impact":4,"status":"identified"}'
# Esperado: 201 Created com o risco criado e score=16

# Listar riscos:
curl http://localhost:8000/api/v1/projects/{PROJECT_ID}/risks/ \
  -H "Authorization: Bearer {TOKEN}"
# Esperado: 200 com lista paginada
```

- [ ] **Step 6: Commit**

```bash
git add backend/apps/risks/serializers.py backend/apps/risks/views.py backend/apps/risks/urls.py backend/apps/projects/urls.py
git commit -m "feat(risks): add RiskSerializer, views, and URL routing"
```

---

### Task 4: Portfolio Integration (Backend)

**Files:**
- Modify: `backend/apps/portfolio/serializers.py`

- [ ] **Step 1: Adicionar `risk_count` e `critical_risk_count` ao `PortfolioDashboardProjectSerializer`**

Abrir `backend/apps/portfolio/serializers.py`. No `PortfolioDashboardProjectSerializer`:

1. Adicionar dois campos após `evm = serializers.SerializerMethodField()`:

```python
    risk_count          = serializers.SerializerMethodField()
    critical_risk_count = serializers.SerializerMethodField()
```

2. Adicionar `"risk_count"` e `"critical_risk_count"` à lista `fields` da `Meta`:

```python
        fields = [
            "id", "project", "project_name", "project_identifier",
            "start_date", "end_date",
            "budget_planned", "budget_actual",
            "rag_status", "rag_override", "rag_note",
            "evm",
            "risk_count", "critical_risk_count",   # <-- adicionar
        ]
```

3. Adicionar os dois métodos dentro da classe:

```python
    def get_risk_count(self, obj) -> int:
        active_statuses = ["identified", "analyzing", "mitigating", "monitoring"]
        return obj.project.risks.filter(status__in=active_statuses).count()

    def get_critical_risk_count(self, obj) -> int:
        active_statuses = ["identified", "analyzing", "mitigating", "monitoring"]
        return obj.project.risks.filter(status__in=active_statuses, score__gte=15).count()
```

- [ ] **Step 2: Verificar que o endpoint de dashboard retorna os novos campos**

```bash
make sync-backend
curl http://localhost:8000/api/v1/portfolio/{PORTFOLIO_ID}/dashboard/ \
  -H "Authorization: Bearer {TOKEN}"
# Esperado: cada projeto no array tem risk_count e critical_risk_count
```

- [ ] **Step 3: Commit**

```bash
git add backend/apps/portfolio/serializers.py
git commit -m "feat(portfolio): add risk_count and critical_risk_count to dashboard"
```

---

## Chunk 2: Frontend

### Task 5: Types e Service

**Files:**
- Create: `frontend/src/types/risk.ts`
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/services/risk.service.ts`

- [ ] **Step 1: Criar `frontend/src/types/risk.ts`**

```typescript
export type RiskCategory =
  | 'technical'
  | 'schedule'
  | 'cost'
  | 'resource'
  | 'external'
  | 'stakeholder'

export type RiskStatus =
  | 'identified'
  | 'analyzing'
  | 'mitigating'
  | 'monitoring'
  | 'closed'
  | 'accepted'
  | 'occurred'

export type RiskResponseType = 'avoid' | 'transfer' | 'mitigate' | 'accept'

export interface Risk {
  id: string
  projectId: string
  title: string
  description: string | null
  category: RiskCategory
  probability: number   // 1-5
  impact: number        // 1-5
  score: number         // probability * impact (1-25)
  status: RiskStatus
  responseType: RiskResponseType | null
  ownerId: string | null
  ownerName: string | null
  mitigationPlan: string | null
  contingencyPlan: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateRiskDto {
  title: string
  description?: string
  category: RiskCategory
  probability: number
  impact: number
  status?: RiskStatus
  responseType?: RiskResponseType
  ownerId?: string
  mitigationPlan?: string
  contingencyPlan?: string
  dueDate?: string
}

export interface UpdateRiskDto extends Partial<CreateRiskDto> {}
```

- [ ] **Step 2: Exportar `risk.ts` em `frontend/src/types/index.ts`**

Adicionar a linha abaixo das outras exportações:

```typescript
export * from './risk'
```

- [ ] **Step 3: Criar `frontend/src/services/risk.service.ts`**

```typescript
import api from '@/lib/axios'
import type { Risk, CreateRiskDto, UpdateRiskDto, PaginatedResponse } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRisk(raw: any): Risk {
  return {
    id:              raw.id,
    projectId:       raw.project,
    title:           raw.title,
    description:     raw.description ?? null,
    category:        raw.category,
    probability:     raw.probability,
    impact:          raw.impact,
    score:           raw.score,
    status:          raw.status,
    responseType:    raw.response_type ?? null,
    ownerId:         raw.owner ?? null,
    ownerName:       raw.owner_name ?? null,
    mitigationPlan:  raw.mitigation_plan ?? null,
    contingencyPlan: raw.contingency_plan ?? null,
    dueDate:         raw.due_date ?? null,
    createdAt:       raw.created_at,
    updatedAt:       raw.updated_at,
  }
}

export const riskService = {
  list: (projectId: string, params?: { status?: string; category?: string; score_gte?: number }) =>
    api
      .get<PaginatedResponse<unknown>>(`/projects/${projectId}/risks/`, { params })
      .then((r) => r.data.results.map(mapRisk)),

  get: (projectId: string, riskId: string) =>
    api
      .get<unknown>(`/projects/${projectId}/risks/${riskId}/`)
      .then((r) => mapRisk(r.data)),

  create: (projectId: string, data: CreateRiskDto) =>
    api
      .post<unknown>(`/projects/${projectId}/risks/`, {
        title:            data.title,
        description:      data.description,
        category:         data.category,
        probability:      data.probability,
        impact:           data.impact,
        status:           data.status ?? 'identified',
        response_type:    data.responseType,
        owner:            data.ownerId,
        mitigation_plan:  data.mitigationPlan,
        contingency_plan: data.contingencyPlan,
        due_date:         data.dueDate,
      })
      .then((r) => mapRisk(r.data)),

  update: (projectId: string, riskId: string, data: UpdateRiskDto) =>
    api
      .patch<unknown>(`/projects/${projectId}/risks/${riskId}/`, {
        ...(data.title            !== undefined && { title: data.title }),
        ...(data.description      !== undefined && { description: data.description }),
        ...(data.category         !== undefined && { category: data.category }),
        ...(data.probability      !== undefined && { probability: data.probability }),
        ...(data.impact           !== undefined && { impact: data.impact }),
        ...(data.status           !== undefined && { status: data.status }),
        ...(data.responseType     !== undefined && { response_type: data.responseType }),
        ...(data.ownerId          !== undefined && { owner: data.ownerId }),
        ...(data.mitigationPlan   !== undefined && { mitigation_plan: data.mitigationPlan }),
        ...(data.contingencyPlan  !== undefined && { contingency_plan: data.contingencyPlan }),
        ...(data.dueDate          !== undefined && { due_date: data.dueDate }),
      })
      .then((r) => mapRisk(r.data)),

  delete: (projectId: string, riskId: string) =>
    api.delete(`/projects/${projectId}/risks/${riskId}/`),
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/risk.ts frontend/src/types/index.ts frontend/src/services/risk.service.ts
git commit -m "feat(risks): add Risk types and service"
```

---

### Task 6: Hook

**Files:**
- Create: `frontend/src/hooks/useRisks.ts`

- [ ] **Step 1: Criar `frontend/src/hooks/useRisks.ts`**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { riskService } from '@/services/risk.service'
import type { CreateRiskDto, UpdateRiskDto } from '@/types'

export function useRisks(projectId: string) {
  return useQuery({
    queryKey: ['risks', projectId],
    queryFn:  () => riskService.list(projectId),
    enabled:  !!projectId,
  })
}

export function useCreateRisk(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRiskDto) => riskService.create(projectId, data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['risks', projectId] }),
  })
}

export function useUpdateRisk(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ riskId, data }: { riskId: string; data: UpdateRiskDto }) =>
      riskService.update(projectId, riskId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', projectId] }),
  })
}

export function useDeleteRisk(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (riskId: string) => riskService.delete(projectId, riskId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['risks', projectId] }),
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useRisks.ts
git commit -m "feat(risks): add useRisks hooks"
```

---

### Task 7: RiskForm Modal

**Files:**
- Create: `frontend/src/features/risks/RiskForm.tsx`

- [ ] **Step 1: Criar `frontend/src/features/risks/RiskForm.tsx`**

```tsx
import { useState } from 'react'
import { useCreateRisk, useUpdateRisk } from '@/hooks/useRisks'
import { useProjectMembers } from '@/hooks/useProjects'
import type { Risk, RiskCategory, RiskStatus, RiskResponseType } from '@/types'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const CATEGORIES: { value: RiskCategory; label: string }[] = [
  { value: 'technical',   label: 'Técnico' },
  { value: 'schedule',    label: 'Prazo' },
  { value: 'cost',        label: 'Custo' },
  { value: 'resource',    label: 'Recurso' },
  { value: 'external',    label: 'Externo' },
  { value: 'stakeholder', label: 'Stakeholder' },
]

const STATUSES: { value: RiskStatus; label: string }[] = [
  { value: 'identified', label: 'Identificado' },
  { value: 'analyzing',  label: 'Em análise' },
  { value: 'mitigating', label: 'Mitigando' },
  { value: 'monitoring', label: 'Monitorando' },
  { value: 'closed',     label: 'Fechado' },
  { value: 'accepted',   label: 'Aceito' },
  { value: 'occurred',   label: 'Ocorreu' },
]

const RESPONSE_TYPES: { value: RiskResponseType; label: string }[] = [
  { value: 'avoid',    label: 'Evitar' },
  { value: 'transfer', label: 'Transferir' },
  { value: 'mitigate', label: 'Mitigar' },
  { value: 'accept',   label: 'Aceitar' },
]

const SCORE_LABELS = ['', 'Muito baixo', 'Baixo', 'Médio', 'Alto', 'Muito alto']

interface RiskFormProps {
  projectId: string
  open: boolean
  onClose: () => void
  risk?: Risk
}

export function RiskForm({ projectId, open, onClose, risk }: RiskFormProps) {
  const isEdit = !!risk
  const { data: members = [] } = useProjectMembers(projectId)
  const create = useCreateRisk(projectId)
  const update = useUpdateRisk(projectId)

  const [title,           setTitle]           = useState(risk?.title ?? '')
  const [description,     setDescription]     = useState(risk?.description ?? '')
  const [category,        setCategory]        = useState<RiskCategory>(risk?.category ?? 'technical')
  const [probability,     setProbability]     = useState(risk?.probability ?? 3)
  const [impact,          setImpact]          = useState(risk?.impact ?? 3)
  const [status,          setStatus]          = useState<RiskStatus>(risk?.status ?? 'identified')
  const [responseType,    setResponseType]    = useState<RiskResponseType | ''>(risk?.responseType ?? '')
  const [ownerId,         setOwnerId]         = useState(risk?.ownerId ?? '')
  const [mitigationPlan,  setMitigationPlan]  = useState(risk?.mitigationPlan ?? '')
  const [contingencyPlan, setContingencyPlan] = useState(risk?.contingencyPlan ?? '')
  const [dueDate,         setDueDate]         = useState(risk?.dueDate ?? '')

  const previewScore = probability * impact

  function scoreColor(s: number) {
    if (s <= 6)  return 'text-green-600 bg-green-50'
    if (s <= 14) return 'text-amber-600 bg-amber-50'
    return 'text-red-600 bg-red-50'
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      title,
      description: description || undefined,
      category,
      probability,
      impact,
      status,
      responseType: (responseType || undefined) as RiskResponseType | undefined,
      ownerId: ownerId || undefined,
      mitigationPlan:  mitigationPlan  || undefined,
      contingencyPlan: contingencyPlan || undefined,
      dueDate: dueDate || undefined,
    }
    if (isEdit && risk) {
      update.mutate({ riskId: risk.id, data }, { onSuccess: onClose })
    } else {
      create.mutate(data, { onSuccess: onClose })
    }
  }

  const selectCls = "h-8 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar risco' : 'Novo risco'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Descreva o risco brevemente"
          required
          autoFocus
        />

        <Textarea
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Contexto adicional (opcional)"
          rows={3}
        />

        <div className="grid grid-cols-2 gap-3">
          {/* Category */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Categoria</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as RiskCategory)} className={selectCls}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as RiskStatus)} className={selectCls}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Probability + Impact + Score preview */}
        <div className="grid grid-cols-3 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Probabilidade: <span className="font-semibold">{probability}</span> — {SCORE_LABELS[probability]}
            </label>
            <input
              type="range" min={1} max={5} value={probability}
              onChange={(e) => setProbability(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Impacto: <span className="font-semibold">{impact}</span> — {SCORE_LABELS[impact]}
            </label>
            <input
              type="range" min={1} max={5} value={impact}
              onChange={(e) => setImpact(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs font-medium text-gray-500">Score</p>
            <span className={`rounded-full px-4 py-1 text-lg font-bold ${scoreColor(previewScore)}`}>
              {previewScore}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Response type */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Resposta</label>
            <select value={responseType} onChange={(e) => setResponseType(e.target.value as RiskResponseType | '')} className={selectCls}>
              <option value="">— não definida —</option>
              {RESPONSE_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {/* Owner */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Responsável</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={selectCls}>
              <option value="">— sem responsável —</option>
              {members.map((m) => (
                <option key={m.id} value={m.memberId}>{m.memberName}</option>
              ))}
            </select>
          </div>
        </div>

        <Textarea
          label="Plano de mitigação"
          value={mitigationPlan}
          onChange={(e) => setMitigationPlan(e.target.value)}
          placeholder="Como reduzir a probabilidade ou impacto deste risco?"
          rows={2}
        />

        <Textarea
          label="Plano de contingência"
          value={contingencyPlan}
          onChange={(e) => setContingencyPlan(e.target.value)}
          placeholder="O que fazer se o risco ocorrer?"
          rows={2}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Data limite</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-8 w-48 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={create.isPending || update.isPending}>
            {isEdit ? 'Salvar' : 'Criar'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/risks/RiskForm.tsx
git commit -m "feat(risks): add RiskForm modal"
```

---

### Task 8: RiskMatrix Component

**Files:**
- Create: `frontend/src/features/risks/RiskMatrix.tsx`

- [ ] **Step 1: Criar `frontend/src/features/risks/RiskMatrix.tsx`**

```tsx
import type { Risk } from '@/types'

interface RiskMatrixProps {
  risks: Risk[]
  onRiskClick: (risk: Risk) => void
}

function cellColor(p: number, i: number): string {
  const score = p * i
  if (score <= 6)  return 'bg-green-100 hover:bg-green-200'
  if (score <= 14) return 'bg-amber-100 hover:bg-amber-200'
  return 'bg-red-100 hover:bg-red-200'
}

function scoreLabel(score: number): string {
  if (score <= 6)  return 'Baixo'
  if (score <= 14) return 'Médio'
  return 'Alto'
}

const LEVEL_LABELS = ['', 'Muito baixo', 'Baixo', 'Médio', 'Alto', 'Muito alto']

export function RiskMatrix({ risks, onRiskClick }: RiskMatrixProps) {
  // Group risks by (probability, impact) cell
  const cellRisks: Record<string, Risk[]> = {}
  for (const r of risks) {
    const key = `${r.probability}-${r.impact}`
    if (!cellRisks[key]) cellRisks[key] = []
    cellRisks[key].push(r)
  }

  return (
    <div className="overflow-auto rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-2 text-center text-xs font-medium text-gray-500">Probabilidade →</div>
      <div className="flex gap-1">
        {/* Y-axis label */}
        <div className="flex w-6 items-center justify-center">
          <span
            className="text-xs font-medium text-gray-500"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Impacto ↑
          </span>
        </div>

        <div>
          {/* Column headers */}
          <div className="mb-1 grid grid-cols-5 gap-1 pl-12">
            {[1, 2, 3, 4, 5].map((p) => (
              <div key={p} className="w-16 text-center text-[10px] text-gray-400">
                {p}<br />{LEVEL_LABELS[p].split(' ')[0]}
              </div>
            ))}
          </div>

          {/* Grid rows (impact 5 → 1, top to bottom) */}
          {[5, 4, 3, 2, 1].map((impact) => (
            <div key={impact} className="mb-1 flex items-center gap-1">
              {/* Row header */}
              <div className="w-12 text-right text-[10px] text-gray-400 pr-1">
                {impact}<br />{LEVEL_LABELS[impact].split(' ')[0]}
              </div>

              {[1, 2, 3, 4, 5].map((prob) => {
                const key  = `${prob}-${impact}`
                const cell = cellRisks[key] ?? []
                return (
                  <div
                    key={prob}
                    className={`relative flex h-16 w-16 flex-col items-center justify-center rounded transition-colors ${cellColor(prob, impact)}`}
                  >
                    {/* Score in corner */}
                    <span className="absolute top-0.5 right-1 text-[9px] text-gray-500 font-mono">
                      {prob * impact}
                    </span>

                    {/* Risk dots */}
                    <div className="flex flex-wrap gap-0.5 justify-center px-1">
                      {cell.slice(0, 6).map((r) => (
                        <button
                          key={r.id}
                          title={`${r.title} (score ${r.score})`}
                          onClick={() => onRiskClick(r)}
                          className="h-4 w-4 rounded-full bg-gray-700 text-[8px] text-white flex items-center justify-center hover:bg-indigo-600 transition-colors"
                        >
                          {r.title.charAt(0).toUpperCase()}
                        </button>
                      ))}
                      {cell.length > 6 && (
                        <span className="text-[9px] text-gray-500">+{cell.length - 6}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-green-200" />
          Baixo (≤6)
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-amber-200" />
          Médio (7-14)
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-red-200" />
          Alto (≥15)
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/risks/RiskMatrix.tsx
git commit -m "feat(risks): add RiskMatrix 5x5 component"
```

---

### Task 9: RisksPage

**Files:**
- Create: `frontend/src/features/risks/RisksPage.tsx`

- [ ] **Step 1: Criar `frontend/src/features/risks/RisksPage.tsx`**

```tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, ShieldAlert, Trash2, Edit2 } from 'lucide-react'
import { useRisks, useDeleteRisk } from '@/hooks/useRisks'
import type { Risk, RiskStatus, RiskCategory } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { RiskMatrix } from './RiskMatrix'
import { RiskForm } from './RiskForm'

const STATUS_LABEL: Record<RiskStatus, string> = {
  identified: 'Identificado',
  analyzing:  'Em análise',
  mitigating: 'Mitigando',
  monitoring: 'Monitorando',
  closed:     'Fechado',
  accepted:   'Aceito',
  occurred:   'Ocorreu',
}

const CATEGORY_LABEL: Record<RiskCategory, string> = {
  technical:   'Técnico',
  schedule:    'Prazo',
  cost:        'Custo',
  resource:    'Recurso',
  external:    'Externo',
  stakeholder: 'Stakeholder',
}

function scoreBadgeClass(score: number): string {
  if (score <= 6)  return 'bg-green-100 text-green-700'
  if (score <= 14) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function scoreLabel(score: number): string {
  if (score <= 6)  return 'Baixo'
  if (score <= 14) return 'Médio'
  return 'Crítico'
}

const ACTIVE_STATUSES: RiskStatus[] = ['identified', 'analyzing', 'mitigating', 'monitoring']

export function RisksPage() {
  const { projectId = '' } = useParams()
  const { data: risks = [], isLoading } = useRisks(projectId)
  const deleteRisk = useDeleteRisk(projectId)

  const [creating,        setCreating]        = useState(false)
  const [editingRisk,     setEditingRisk]     = useState<Risk | null>(null)
  const [filterStatus,    setFilterStatus]    = useState<RiskStatus | ''>('')
  const [filterCategory,  setFilterCategory]  = useState<RiskCategory | ''>('')

  if (isLoading) return <PageSpinner />

  const activeRisks   = risks.filter((r) => ACTIVE_STATUSES.includes(r.status))
  const criticalCount = activeRisks.filter((r) => r.score >= 15).length

  const filtered = risks.filter((r) => {
    if (filterStatus   && r.status   !== filterStatus)   return false
    if (filterCategory && r.category !== filterCategory) return false
    return true
  })

  // For matrix, show only active risks
  const matrixRisks = filterStatus
    ? filtered.filter((r) => ACTIVE_STATUSES.includes(r.status))
    : activeRisks

  function handleDelete(risk: Risk) {
    if (!confirm(`Deletar "${risk.title}"?`)) return
    deleteRisk.mutate(risk.id)
  }

  const selectCls = "h-8 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Registro de Riscos</h1>
          <p className="text-sm text-gray-500">
            {activeRisks.length} risco{activeRisks.length !== 1 ? 's' : ''} ativo{activeRisks.length !== 1 ? 's' : ''}
            {criticalCount > 0 && (
              <span className="ml-2 font-medium text-red-600">· {criticalCount} crítico{criticalCount !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          Novo risco
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as RiskStatus | '')} className={selectCls}>
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_LABEL) as RiskStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as RiskCategory | '')} className={selectCls}>
          <option value="">Todas as categorias</option>
          {(Object.keys(CATEGORY_LABEL) as RiskCategory[]).map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </select>
      </div>

      {risks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-500">Nenhum risco registrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_380px] gap-6 items-start">
          {/* Risk list */}
          <div className="space-y-2">
            {filtered.sort((a, b) => b.score - a.score).map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${scoreBadgeClass(r.score)}`}>
                        {r.score} — {scoreLabel(r.score)}
                      </span>
                      <span className="text-xs text-gray-400">{CATEGORY_LABEL[r.category]}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">{STATUS_LABEL[r.status]}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                    {r.description && (
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{r.description}</p>
                    )}
                    {r.ownerName && (
                      <p className="mt-0.5 text-xs text-gray-400">Responsável: {r.ownerName}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setEditingRisk(r)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">Nenhum risco com estes filtros</p>
            )}
          </div>

          {/* Matrix */}
          <div className="sticky top-4">
            <RiskMatrix
              risks={matrixRisks}
              onRiskClick={(r) => setEditingRisk(r)}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <RiskForm
        projectId={projectId}
        open={creating}
        onClose={() => setCreating(false)}
      />
      {editingRisk && (
        <RiskForm
          projectId={projectId}
          open={!!editingRisk}
          onClose={() => setEditingRisk(null)}
          risk={editingRisk}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/risks/RisksPage.tsx
git commit -m "feat(risks): add RisksPage with matrix and list"
```

---

### Task 10: Routing + Nav + Portfolio

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/ProjectNav.tsx`
- Modify: `frontend/src/features/portfolio/ExecutiveDashboard.tsx`
- Modify: `frontend/src/types/portfolio.ts`
- Modify: `frontend/src/services/portfolio.service.ts` (se necessário)

- [ ] **Step 1: Adicionar rota em `App.tsx`**

Abrir `frontend/src/App.tsx`. Adicionar import:

```tsx
import { RisksPage } from './features/risks/RisksPage'
```

Dentro do bloco `<Route path="/projects/:projectId" element={<ProjectProvider />}>`, adicionar após a rota de milestones:

```tsx
<Route path="risks" element={<RisksPage />} />
```

- [ ] **Step 2: Adicionar aba em `ProjectNav.tsx`**

Abrir `frontend/src/components/layout/ProjectNav.tsx`. Adicionar `ShieldAlert` ao import do lucide-react:

```tsx
import { KanbanSquare, List, RotateCcw, Network, BookOpen, Flag, ShieldAlert } from 'lucide-react'
```

Na array `tabs`, adicionar após `milestones`:

```tsx
  { path: 'risks', label: 'Riscos', icon: ShieldAlert },
```

- [ ] **Step 3: Atualizar tipos de portfólio em `frontend/src/types/portfolio.ts`**

Na interface `PortfolioDashboardProject`, adicionar campos após `evm`:

```typescript
export interface PortfolioDashboardProject extends PortfolioProject {
  evm: EvmData
  riskCount: number
  criticalRiskCount: number
}
```

- [ ] **Step 4: Atualizar `mapPortfolioDashboardProject` no portfolio service**

Abrir `frontend/src/services/portfolio.service.ts`. Na função que mapeia projetos do dashboard (procurar por `mapDashboardProject` ou a função que retorna `PortfolioDashboardProject`), adicionar:

```typescript
    riskCount:         raw.risk_count         ?? 0,
    criticalRiskCount: raw.critical_risk_count ?? 0,
```

- [ ] **Step 5: Adicionar coluna "Riscos" em `ExecutiveDashboard.tsx`**

Abrir `frontend/src/features/portfolio/ExecutiveDashboard.tsx`.

No `<thead>`, adicionar após a coluna RAG:

```tsx
<th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">Riscos</th>
```

No `<tbody>`, dentro do `{projects.map(...)}`, adicionar após a célula RAG:

```tsx
<td className="px-4 py-3 text-center">
  {pp.criticalRiskCount > 0 ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
      🔴 {pp.criticalRiskCount} crítico{pp.criticalRiskCount !== 1 ? 's' : ''}
    </span>
  ) : pp.riskCount > 0 ? (
    <span className="text-xs text-amber-600">{pp.riskCount} ativo{pp.riskCount !== 1 ? 's' : ''}</span>
  ) : (
    <span className="text-xs text-green-600">✓ sem riscos</span>
  )}
</td>
```

- [ ] **Step 6: Verificar compilação TypeScript**

```bash
cd frontend && npx tsc --noEmit
# Esperado: sem erros
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/layout/ProjectNav.tsx \
        frontend/src/types/portfolio.ts frontend/src/services/portfolio.service.ts \
        frontend/src/features/portfolio/ExecutiveDashboard.tsx
git commit -m "feat(risks): integrate RisksPage into routing, nav, and portfolio dashboard"
```

---

## Checklist de verificação final

- [ ] `GET /api/v1/projects/{id}/risks/` retorna 200 com lista paginada
- [ ] `POST /api/v1/projects/{id}/risks/` cria risco com score calculado automaticamente
- [ ] `PATCH /api/v1/projects/{id}/risks/{id}/` atualiza e recalcula score
- [ ] `DELETE` por não-admin retorna 403
- [ ] `/portfolio/{id}/dashboard/` retorna `risk_count` e `critical_risk_count` em cada projeto
- [ ] Aba "Riscos" aparece no ProjectNav
- [ ] RisksPage carrega riscos e exibe matriz 5×5
- [ ] Pontos na matriz são clicáveis e abrem RiskForm em modo edição
- [ ] Coluna "Riscos" aparece no ExecutiveDashboard
