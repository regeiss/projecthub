import uuid

from django.test import TestCase
from rest_framework.test import APIClient

from apps.issues.models import Issue
from apps.projects.models import IssueState, Project, ProjectMember
from apps.workspaces.models import Workspace, WorkspaceMember


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def make_workspace():
  ws = Workspace.objects.create(name="WS", slug="ws")
  return ws


def make_member(workspace, role="admin"):
  sub = str(uuid.uuid4())
  return WorkspaceMember.objects.create(
    workspace=workspace,
    keycloak_sub=sub,
    email=f"{sub}@test.com",
    name="Admin",
    role=role,
  )


def make_project(workspace, member):
  project = Project.objects.create(
    workspace=workspace,
    name="Proj",
    identifier="PROJ",
    created_by=member,
  )
  ProjectMember.objects.create(project=project, member=member, role="admin")
  return project


def make_state(project, category="backlog"):
  return IssueState.objects.create(
    project=project,
    name=category.capitalize(),
    color="#aaaaaa",
    category=category,
    sequence=1,
  )


_issue_seq = 0

def make_issue(project, state, member, title="Issue", parent=None):
  global _issue_seq
  _issue_seq += 1
  return Issue.objects.create(
    project=project,
    title=title,
    state=state,
    priority="none",
    type="task",
    reporter=member,
    created_by=member,
    parent=parent,
    sequence_id=_issue_seq,
  )


def make_client(member):
  """Return an authenticated APIClient that bypasses JWT validation."""
  client = APIClient()
  client.force_authenticate(user=member)
  return client


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class SubtaskListCreateTests(TestCase):
  def setUp(self):
    self.ws = make_workspace()
    self.member = make_member(self.ws)
    self.project = make_project(self.ws, self.member)
    self.state = make_state(self.project, "backlog")
    self.done_state = make_state(self.project, "completed")
    self.parent = make_issue(self.project, self.state, self.member, "Parent")
    self.client = make_client(self.member)

  def test_list_subtasks_returns_only_children(self):
    child1 = make_issue(self.project, self.state, self.member, "Child 1", parent=self.parent)
    child2 = make_issue(self.project, self.state, self.member, "Child 2", parent=self.parent)
    other = make_issue(self.project, self.state, self.member, "Other")

    resp = self.client.get(f"/api/issues/{self.parent.id}/subtasks/")

    # The subtasks endpoint has pagination_class = None so resp.data is a plain list
    self.assertEqual(resp.status_code, 200)
    ids = [r["id"] for r in resp.data]
    self.assertIn(str(child1.id), ids)
    self.assertIn(str(child2.id), ids)
    self.assertNotIn(str(other.id), ids)

  def test_create_subtask_sets_parent_and_type(self):
    resp = self.client.post(f"/api/issues/{self.parent.id}/subtasks/", {
      "title": "Sub 1",
      "state": str(self.state.id),
      "priority": "none",
    })

    self.assertEqual(resp.status_code, 201)
    issue = Issue.objects.get(id=resp.data["id"])
    self.assertEqual(str(issue.parent_id), str(self.parent.id))
    self.assertEqual(issue.type, "subtask")

  def test_create_subtask_ignores_client_type(self):
    """Server must force type=subtask regardless of what client sends."""
    resp = self.client.post(f"/api/issues/{self.parent.id}/subtasks/", {
      "title": "Sub 2",
      "state": str(self.state.id),
      "priority": "none",
      "type": "bug",
    })

    self.assertEqual(resp.status_code, 201)
    issue = Issue.objects.get(id=resp.data["id"])
    self.assertEqual(issue.type, "subtask")

  def test_create_subtask_of_subtask_returns_400(self):
    """Max 1 level of nesting."""
    child = make_issue(self.project, self.state, self.member, "Child", parent=self.parent)

    resp = self.client.post(f"/api/issues/{child.id}/subtasks/", {
      "title": "Grandchild",
      "state": str(self.state.id),
      "priority": "none",
    })

    self.assertEqual(resp.status_code, 400)


class SubtaskCountAnnotationTests(TestCase):
  def setUp(self):
    self.ws = make_workspace()
    self.member = make_member(self.ws)
    self.project = make_project(self.ws, self.member)
    self.state = make_state(self.project, "backlog")
    self.done_state = make_state(self.project, "completed")
    self.client = make_client(self.member)

  def test_list_response_includes_count_for_all_issues(self):
    parent = make_issue(self.project, self.state, self.member, "Parent")
    no_children = make_issue(self.project, self.state, self.member, "Leaf")

    resp = self.client.get(f"/api/issues/?project_id={self.project.id}")

    self.assertEqual(resp.status_code, 200)
    results = {r["id"]: r for r in resp.data["results"]}
    self.assertIn("subtask_count", results[str(parent.id)])
    self.assertIn("subtask_count", results[str(no_children.id)])
    self.assertEqual(results[str(no_children.id)]["subtask_count"], 0)

  def test_count_annotation_values_are_correct(self):
    parent = make_issue(self.project, self.state, self.member, "Parent")
    make_issue(self.project, self.state, self.member, "Open sub", parent=parent)
    make_issue(self.project, self.done_state, self.member, "Done sub", parent=parent)

    resp = self.client.get(f"/api/issues/?project_id={self.project.id}")

    self.assertEqual(resp.status_code, 200)
    results = {r["id"]: r for r in resp.data["results"]}
    parent_data = results[str(parent.id)]
    self.assertEqual(parent_data["subtask_count"], 2)
    self.assertEqual(parent_data["completed_subtask_count"], 1)
