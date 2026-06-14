# Product Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native Product Discovery module for ProjectHub with ideas, custom fields, saved views, scoring, and insights, without relying on Jira or external integrations.

**Architecture:** Add a dedicated Django app, `apps.discovery`, instead of overloading `issues`. Keep stable idea properties on the `Idea` model and store configurable product-discovery fields in definition/value tables scoped to a workspace. Expose the feature through workspace-level routes and a focused frontend feature folder, then add project-promotion hooks only after the core discovery workflows are stable.

**Tech Stack:** Django, Django REST Framework, React, React Router, TanStack Query, Zustand workspace store, Vitest, pytest/Django test suite

---

## File Structure

**Backend**

- Create: `backend/apps/discovery/__init__.py`
- Create: `backend/apps/discovery/apps.py`
- Create: `backend/apps/discovery/models.py`
- Create: `backend/apps/discovery/serializers.py`
- Create: `backend/apps/discovery/views.py`
- Create: `backend/apps/discovery/permissions.py`
- Create: `backend/apps/discovery/urls.py`
- Create: `backend/apps/discovery/tests/test_ideas_api.py`
- Create: `backend/apps/discovery/tests/test_views_api.py`
- Create: `backend/apps/discovery/tests/test_scoring_api.py`
- Create: `backend/apps/discovery/migrations/0001_initial.py`
- Modify: `backend/config/settings/base.py`
- Modify: `backend/config/urls.py`

**Frontend**

- Create: `frontend/src/types/discovery.ts`
- Create: `frontend/src/services/discovery.service.ts`
- Create: `frontend/src/hooks/useDiscovery.ts`
- Create: `frontend/src/features/discovery/DiscoveryPage.tsx`
- Create: `frontend/src/features/discovery/IdeaTableView.tsx`
- Create: `frontend/src/features/discovery/IdeaBoardView.tsx`
- Create: `frontend/src/features/discovery/IdeaForm.tsx`
- Create: `frontend/src/features/discovery/FieldBuilder.tsx`
- Create: `frontend/src/features/discovery/ScorecardPanel.tsx`
- Create: `frontend/src/features/discovery/InsightPanel.tsx`
- Create: `frontend/src/features/discovery/DiscoveryPage.test.tsx`
- Create: `frontend/src/features/discovery/IdeaForm.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

**Docs**

- Modify: `docs/ARCHITECTURE.md`

### Domain Model

- `Idea`: workspace-scoped discovery record with title, summary, status, owner, creator, optional project link, optional promoted issue link, and timestamps.
- `IdeaFieldDefinition`: workspace-scoped custom field metadata with key, label, type, config, ordering, and active flag.
- `IdeaFieldValue`: value row per idea and field definition, stored in typed nullable columns plus JSON fallback for multi-select.
- `IdeaView`: saved view with name, type (`table`, `board`, later `roadmap`), filters, visible columns, grouping, ordering, and owner/workspace scope.
- `IdeaInsight`: evidence item attached to an idea with type (`note`, `link`, `feedback`) and rich content.
- `IdeaScorecard`: normalized scoring inputs on an idea such as impact, effort, confidence, and reach, plus computed score.

### Delivery Order

1. Discovery backend skeleton + idea CRUD
2. Workspace route + basic list/create/edit UI
3. Custom field definitions and values
4. Saved views and table/board rendering
5. Scorecard and prioritization
6. Insights and evidence capture
7. Documentation and optional promotion hooks

### Task 1: Scaffold the Discovery Backend App

**Files:**
- Create: `backend/apps/discovery/__init__.py`
- Create: `backend/apps/discovery/apps.py`
- Create: `backend/apps/discovery/models.py`
- Create: `backend/apps/discovery/migrations/0001_initial.py`
- Modify: `backend/config/settings/base.py`

- [ ] **Step 1: Write the failing app-registration test**

```python
# backend/apps/discovery/tests/test_ideas_api.py
from django.apps import apps
from django.test import TestCase


class DiscoveryAppRegistrationTests(TestCase):
    def test_discovery_app_is_installed(self):
        self.assertIsNotNone(apps.get_app_config("discovery"))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/apps/discovery/tests/test_ideas_api.py::DiscoveryAppRegistrationTests::test_discovery_app_is_installed -v`
Expected: FAIL with `LookupError: No installed app with label 'discovery'`

- [ ] **Step 3: Write minimal app configuration and models**

```python
# backend/apps/discovery/apps.py
from django.apps import AppConfig


class DiscoveryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.discovery"
    label = "discovery"
```

```python
# backend/config/settings/base.py
INSTALLED_APPS = [
    # ...
    "apps.discovery",
]
```

```python
# backend/apps/discovery/models.py
import uuid

from django.db import models


class Idea(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "Nova"
        REVIEWING = "reviewing", "Em análise"
        PLANNED = "planned", "Planejada"
        BUILDING = "building", "Em execução"
        SHIPPED = "shipped", "Entregue"
        PARKED = "parked", "Estacionada"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey("workspaces.Workspace", on_delete=models.CASCADE, related_name="ideas")
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    owner = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_ideas",
    )
    created_by = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="created_ideas",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ideas",
    )
    promoted_issue = models.ForeignKey(
        "issues.Issue",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_ideas",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

- [ ] **Step 4: Create and review the initial migration**

Run: `python backend/manage.py makemigrations discovery`
Expected: Django creates `backend/apps/discovery/migrations/0001_initial.py`

- [ ] **Step 5: Run the registration test to verify it passes**

Run: `python -m pytest backend/apps/discovery/tests/test_ideas_api.py::DiscoveryAppRegistrationTests::test_discovery_app_is_installed -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/apps/discovery backend/config/settings/base.py
git commit -m "feat: scaffold discovery backend app"
```

### Task 2: Add Idea CRUD API with Workspace Scoping

**Files:**
- Modify: `backend/apps/discovery/models.py`
- Create: `backend/apps/discovery/serializers.py`
- Create: `backend/apps/discovery/views.py`
- Create: `backend/apps/discovery/permissions.py`
- Create: `backend/apps/discovery/urls.py`
- Modify: `backend/config/urls.py`
- Test: `backend/apps/discovery/tests/test_ideas_api.py`

- [ ] **Step 1: Write the failing API tests**

```python
class IdeaApiTests(APITestCase):
    def test_list_only_returns_ideas_for_active_workspace(self):
        response = self.client.get("/api/v1/discovery/ideas/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_create_idea_sets_workspace_from_authenticated_member(self):
        response = self.client.post(
            "/api/v1/discovery/ideas/",
            {"title": "Portal de sugestões", "status": "new"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["title"], "Portal de sugestões")
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python -m pytest backend/apps/discovery/tests/test_ideas_api.py -v`
Expected: FAIL with `404` or import errors because discovery routes/views do not exist yet

- [ ] **Step 3: Implement serializer, queryset scoping, and routes**

```python
# backend/apps/discovery/serializers.py
from rest_framework import serializers
from .models import Idea


class IdeaSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.name", read_only=True, default=None)

    class Meta:
        model = Idea
        fields = [
            "id",
            "workspace",
            "title",
            "summary",
            "status",
            "owner",
            "owner_name",
            "project",
            "promoted_issue",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "workspace", "created_by", "created_at", "updated_at"]
```

```python
# backend/apps/discovery/views.py
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from .models import Idea
from .serializers import IdeaSerializer


class IdeaViewSet(ModelViewSet):
    serializer_class = IdeaSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        return Idea.objects.select_related("owner", "created_by", "project").filter(
            workspace=self.request.user.workspace
        )

    def perform_create(self, serializer):
        serializer.save(
            workspace=self.request.user.workspace,
            created_by=self.request.user,
        )
```

```python
# backend/apps/discovery/urls.py
from rest_framework.routers import DefaultRouter
from .views import IdeaViewSet

router = DefaultRouter()
router.register("ideas", IdeaViewSet, basename="discovery-idea")

urlpatterns = router.urls
```

```python
# backend/config/urls.py
path("api/v1/discovery/", include(("apps.discovery.urls", "discovery"))),
```

- [ ] **Step 4: Run the API tests to verify they pass**

Run: `python -m pytest backend/apps/discovery/tests/test_ideas_api.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/apps/discovery backend/config/urls.py
git commit -m "feat: add workspace-scoped discovery idea api"
```

### Task 3: Add Discovery Frontend Route and Basic Idea Screen

**Files:**
- Create: `frontend/src/types/discovery.ts`
- Create: `frontend/src/services/discovery.service.ts`
- Create: `frontend/src/hooks/useDiscovery.ts`
- Create: `frontend/src/features/discovery/DiscoveryPage.tsx`
- Create: `frontend/src/features/discovery/IdeaForm.tsx`
- Create: `frontend/src/features/discovery/DiscoveryPage.test.tsx`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Write the failing route/render test**

```tsx
it('renders the discovery page route', async () => {
  render(
    <MemoryRouter initialEntries={['/discovery']}>
      <App />
    </MemoryRouter>,
  )

  expect(await screen.findByText('Product Discovery')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/features/discovery/DiscoveryPage.test.tsx`
Expected: FAIL because `/discovery` is not routed yet

- [ ] **Step 3: Add discovery types, service, hook, page, and route**

```ts
// frontend/src/types/discovery.ts
export interface Idea {
  id: string
  title: string
  summary: string | null
  status: 'new' | 'reviewing' | 'planned' | 'building' | 'shipped' | 'parked'
  owner: string | null
  ownerName: string | null
  project: string | null
  promotedIssue: string | null
  createdAt: string
  updatedAt: string
}
```

```tsx
// frontend/src/features/discovery/DiscoveryPage.tsx
export function DiscoveryPage() {
  const { data: ideas = [], isLoading } = useIdeas()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Product Discovery</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Ideias, priorização e evidências em um só lugar.</p>
        </div>
      </div>

      {isLoading ? <PageSpinner /> : <IdeaTableView ideas={ideas} />}
    </div>
  )
}
```

```tsx
// frontend/src/App.tsx
<Route path="/discovery" element={<DiscoveryPage />} />
```

- [ ] **Step 4: Run the route test to verify it passes**

Run: `npm run test -- src/features/discovery/DiscoveryPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types frontend/src/services frontend/src/hooks frontend/src/features/discovery frontend/src/App.tsx frontend/src/components/layout/Sidebar.tsx
git commit -m "feat: add discovery route and basic idea screen"
```

### Task 4: Add Custom Field Definitions and Idea Field Values

**Files:**
- Modify: `backend/apps/discovery/models.py`
- Modify: `backend/apps/discovery/serializers.py`
- Modify: `backend/apps/discovery/views.py`
- Create: `backend/apps/discovery/tests/test_views_api.py`
- Create: `frontend/src/features/discovery/FieldBuilder.tsx`
- Modify: `frontend/src/features/discovery/IdeaForm.tsx`

- [ ] **Step 1: Write the failing backend tests for field definitions**

```python
def test_workspace_can_create_field_definition(self):
    response = self.client.post(
        "/api/v1/discovery/fields/",
        {"name": "Impact", "key": "impact", "type": "number"},
        format="json",
    )
    self.assertEqual(response.status_code, 201)

def test_idea_can_store_custom_field_value(self):
    response = self.client.patch(
        f"/api/v1/discovery/ideas/{self.idea.id}/",
        {"field_values": [{"field": str(self.impact_field.id), "number_value": 8}]},
        format="json",
    )
    self.assertEqual(response.status_code, 200)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python -m pytest backend/apps/discovery/tests/test_views_api.py -v`
Expected: FAIL because field definition endpoints and nested values are missing

- [ ] **Step 3: Implement field-definition and value models**

```python
class IdeaFieldDefinition(models.Model):
    class FieldType(models.TextChoices):
        TEXT = "text", "Texto"
        NUMBER = "number", "Número"
        SELECT = "select", "Seleção"
        MULTI_SELECT = "multi_select", "Múltipla seleção"
        DATE = "date", "Data"
        USER = "user", "Usuário"

class IdeaFieldValue(models.Model):
    idea = models.ForeignKey("Idea", on_delete=models.CASCADE, related_name="field_values")
    field = models.ForeignKey("IdeaFieldDefinition", on_delete=models.CASCADE, related_name="values")
    text_value = models.TextField(blank=True, null=True)
    number_value = models.FloatField(blank=True, null=True)
    date_value = models.DateField(blank=True, null=True)
    user_value = models.ForeignKey("workspaces.WorkspaceMember", null=True, blank=True, on_delete=models.SET_NULL)
    json_value = models.JSONField(blank=True, null=True)
```

- [ ] **Step 4: Implement minimal field builder UI**

```tsx
export function FieldBuilder() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Campos</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Crie campos como impacto, esforço, segmento e data alvo.
      </p>
    </div>
  )
}
```

- [ ] **Step 5: Run backend tests**

Run: `python -m pytest backend/apps/discovery/tests/test_views_api.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/apps/discovery frontend/src/features/discovery/FieldBuilder.tsx
git commit -m "feat: add discovery custom fields"
```

### Task 5: Add Saved Views with Table and Board Support

**Files:**
- Modify: `backend/apps/discovery/models.py`
- Modify: `backend/apps/discovery/serializers.py`
- Modify: `backend/apps/discovery/views.py`
- Create: `frontend/src/features/discovery/IdeaTableView.tsx`
- Create: `frontend/src/features/discovery/IdeaBoardView.tsx`
- Modify: `frontend/src/features/discovery/DiscoveryPage.tsx`
- Test: `backend/apps/discovery/tests/test_views_api.py`

- [ ] **Step 1: Write the failing saved-view tests**

```python
def test_workspace_can_save_a_table_view(self):
    response = self.client.post(
        "/api/v1/discovery/views/",
        {
            "name": "Priorização",
            "view_type": "table",
            "visible_columns": ["title", "status", "score"],
            "group_by": None,
        },
        format="json",
    )
    self.assertEqual(response.status_code, 201)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python -m pytest backend/apps/discovery/tests/test_views_api.py -v`
Expected: FAIL because `IdeaView` API does not exist yet

- [ ] **Step 3: Implement saved views and frontend switching**

```python
class IdeaView(models.Model):
    class ViewType(models.TextChoices):
        TABLE = "table", "Tabela"
        BOARD = "board", "Quadro"
        ROADMAP = "roadmap", "Roadmap"
```

```tsx
export function DiscoveryPage() {
  const [viewType, setViewType] = useState<'table' | 'board'>('table')

  return viewType === 'table'
    ? <IdeaTableView ideas={ideas} />
    : <IdeaBoardView ideas={ideas} />
}
```

- [ ] **Step 4: Run the saved-view tests**

Run: `python -m pytest backend/apps/discovery/tests/test_views_api.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/apps/discovery frontend/src/features/discovery
git commit -m "feat: add discovery saved views"
```

### Task 6: Add Scorecards and Prioritization

**Files:**
- Modify: `backend/apps/discovery/models.py`
- Modify: `backend/apps/discovery/serializers.py`
- Create: `backend/apps/discovery/tests/test_scoring_api.py`
- Create: `frontend/src/features/discovery/ScorecardPanel.tsx`
- Modify: `frontend/src/features/discovery/IdeaForm.tsx`
- Modify: `frontend/src/features/discovery/IdeaTableView.tsx`

- [ ] **Step 1: Write the failing score calculation test**

```python
def test_score_is_computed_from_inputs(self):
    response = self.client.patch(
        f"/api/v1/discovery/ideas/{self.idea.id}/scorecard/",
        {"impact": 8, "effort": 3, "confidence": 7},
        format="json",
    )
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data["score"], 18.67)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest backend/apps/discovery/tests/test_scoring_api.py -v`
Expected: FAIL because scorecard action does not exist

- [ ] **Step 3: Implement minimal scorecard model and calculation**

```python
class IdeaScorecard(models.Model):
    idea = models.OneToOneField("Idea", on_delete=models.CASCADE, related_name="scorecard")
    impact = models.FloatField(default=0)
    effort = models.FloatField(default=0)
    confidence = models.FloatField(default=0)

    @property
    def score(self):
        if self.effort <= 0:
            return 0
        return round((self.impact * self.confidence) / self.effort, 2)
```

- [ ] **Step 4: Surface the score in the UI**

```tsx
<td className="text-sm font-medium text-gray-900 dark:text-gray-100">
  {idea.scorecard?.score?.toFixed(2) ?? '0.00'}
</td>
```

- [ ] **Step 5: Run the score tests**

Run: `python -m pytest backend/apps/discovery/tests/test_scoring_api.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/apps/discovery frontend/src/features/discovery
git commit -m "feat: add discovery scorecards"
```

### Task 7: Add Insights and Evidence Capture

**Files:**
- Modify: `backend/apps/discovery/models.py`
- Modify: `backend/apps/discovery/serializers.py`
- Modify: `backend/apps/discovery/views.py`
- Create: `frontend/src/features/discovery/InsightPanel.tsx`
- Create: `backend/apps/discovery/tests/test_insights_api.py`

- [ ] **Step 1: Write the failing insight tests**

```python
def test_add_note_insight_to_idea(self):
    response = self.client.post(
        f"/api/v1/discovery/ideas/{self.idea.id}/insights/",
        {"kind": "note", "title": "Cliente pediu filtro", "content": {"text": "Usuários enterprise precisam disso"}},
        format="json",
    )
    self.assertEqual(response.status_code, 201)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest backend/apps/discovery/tests/test_insights_api.py -v`
Expected: FAIL because insights do not exist

- [ ] **Step 3: Implement note/link/feedback insight support**

```python
class IdeaInsight(models.Model):
    class Kind(models.TextChoices):
        NOTE = "note", "Nota"
        LINK = "link", "Link"
        FEEDBACK = "feedback", "Feedback"
```

```tsx
export function InsightPanel({ ideaId }: { ideaId: string }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Insights</h2>
    </section>
  )
}
```

- [ ] **Step 4: Run the insight tests**

Run: `python -m pytest backend/apps/discovery/tests/test_insights_api.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/apps/discovery frontend/src/features/discovery/InsightPanel.tsx
git commit -m "feat: add discovery insights"
```

### Task 8: Document the Module and Prepare Optional Promotion Hooks

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `backend/apps/discovery/models.py`
- Modify: `backend/apps/discovery/views.py`
- Modify: `frontend/src/features/discovery/DiscoveryPage.tsx`

- [ ] **Step 1: Write a failing backend test for idea promotion**

```python
def test_promote_idea_to_issue_creates_linked_issue(self):
    response = self.client.post(f"/api/v1/discovery/ideas/{self.idea.id}/promote/", {}, format="json")
    self.assertEqual(response.status_code, 201)
    self.assertIsNotNone(response.data["promoted_issue"])
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest backend/apps/discovery/tests/test_ideas_api.py::IdeaApiTests::test_promote_idea_to_issue_creates_linked_issue -v`
Expected: FAIL because promote action is not implemented

- [ ] **Step 3: Implement minimal promotion action**

```python
@action(detail=True, methods=["post"], url_path="promote")
def promote(self, request, pk=None):
    idea = self.get_object()
    issue = Issue.objects.create(
        project=idea.project,
        title=idea.title,
        description={"type": "doc", "content": []},
        state=idea.project.states.filter(is_default=True).first() or idea.project.states.first(),
        reporter=request.user,
        created_by=request.user,
    )
    idea.promoted_issue = issue
    idea.save(update_fields=["promoted_issue", "updated_at"])
    return Response(self.get_serializer(idea).data, status=201)
```

- [ ] **Step 4: Update architecture documentation**

```md
## Discovery Module

The Discovery module is workspace-scoped and intentionally separate from Issues. Ideas can later be promoted into project execution artifacts, but custom fielding, saved views, scoring, and insights remain native to discovery.
```

- [ ] **Step 5: Run targeted tests**

Run: `python -m pytest backend/apps/discovery/tests -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add docs/ARCHITECTURE.md backend/apps/discovery frontend/src/features/discovery
git commit -m "feat: document discovery architecture and promotion flow"
```

## Self-Review

- Spec coverage: this plan covers ideas, custom fields, views, scoring, insights, and a minimal promotion flow. It intentionally leaves roadmap rendering and advanced formulas for a follow-up plan after the core experience is stable.
- Placeholder scan: no `TODO`/`TBD` placeholders remain; each task names exact files and commands.
- Type consistency: the plan consistently uses `Idea`, `IdeaFieldDefinition`, `IdeaFieldValue`, `IdeaView`, `IdeaScorecard`, and `IdeaInsight` across backend and frontend tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-12-product-discovery.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
