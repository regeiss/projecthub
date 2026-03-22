import uuid

from django.test import TestCase
from rest_framework.test import APIClient

from apps.issues.models import Issue, IssueRelation
from apps.projects.models import IssueState, Project, ProjectMember
from apps.workspaces.models import Workspace, WorkspaceMember


_seq = 0


def make_issue(project, state, member, title='Issue', type='task'):
  global _seq
  _seq += 1
  return Issue.objects.create(
    project=project, title=title, state=state, priority='none',
    type=type, reporter=member, created_by=member, sequence_id=_seq,
  )


class IssueRelationSerializerTests(TestCase):
  def setUp(self):
    self.client = APIClient()
    sub = str(uuid.uuid4())
    self.workspace = Workspace.objects.create(name='WS', slug='ws-rel')
    self.member = WorkspaceMember.objects.create(
      workspace=self.workspace,
      keycloak_sub=sub,
      email=f'{sub}@test.com',
      name='Test User',
      role='member',
    )
    self.project = Project.objects.create(
      workspace=self.workspace, name='Project One', identifier='PO',
      created_by=self.member,
    )
    ProjectMember.objects.create(project=self.project, member=self.member, role='admin')
    self.state = IssueState.objects.create(
      project=self.project, name='Backlog', color='#aaa', category='backlog', sequence=1
    )
    self.issue = make_issue(self.project, self.state, self.member, 'Issue A')
    self.other = make_issue(self.project, self.state, self.member, 'Issue B')
    self.client.force_authenticate(user=self.member)

  def test_relation_serializer_includes_derived_fields(self):
    IssueRelation.objects.create(
      issue=self.issue,
      related_issue=self.other,
      relation_type='relates_to',
      lag_days=2,
    )
    resp = self.client.get(f'/api/v1/issues/{self.issue.id}/relations/')
    self.assertEqual(resp.status_code, 200)
    r = resp.data['results'][0]
    self.assertEqual(r['related_issue_title'], 'Issue B')
    self.assertEqual(r['related_issue_sequence_id'], self.other.sequence_id)
    self.assertEqual(str(r['related_issue_project_id']), str(self.project.id))
    self.assertEqual(r['related_issue_project_name'], 'Project One')

  def test_self_relation_returns_400(self):
    resp = self.client.post(
      f'/api/v1/issues/{self.issue.id}/relations/',
      {
        'related_issue': str(self.issue.id),
        'relation_type': 'relates_to',
        'lag_days': 0,
      },
      format='json',
    )
    self.assertEqual(resp.status_code, 400)

  def test_duplicate_relation_returns_400(self):
    data = {
      'related_issue': str(self.other.id),
      'relation_type': 'relates_to',
      'lag_days': 0,
    }
    self.client.post(
      f'/api/v1/issues/{self.issue.id}/relations/', data, format='json'
    )
    resp = self.client.post(
      f'/api/v1/issues/{self.issue.id}/relations/', data, format='json'
    )
    self.assertEqual(resp.status_code, 400)
