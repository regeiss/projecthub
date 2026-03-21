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


def make_issue(project, state, member, title="Issue", parent=None):
  return Issue.objects.create(
    project=project,
    title=title,
    state=state,
    priority="none",
    type="task",
    reporter=member,
    created_by=member,
    parent=parent,
  )


def make_client(member):
  """Return an authenticated APIClient that bypasses JWT validation."""
  client = APIClient()
  client.force_authenticate(user=member)
  return client
