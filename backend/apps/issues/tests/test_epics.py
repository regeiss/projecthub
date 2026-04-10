from django.test import TestCase
from rest_framework.test import APIClient
from apps.issues.models import Issue
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project, IssueState


def _make_workspace():
    ws = Workspace.objects.create(name='WS', slug='ws')
    member = WorkspaceMember.objects.create(
        workspace=ws, email='u@test.com', role='admin', name='U'
    )
    return ws, member


def _make_project(ws, member):
    proj = Project.objects.create(
        workspace=ws, name='Proj', identifier='PR', created_by=member
    )
    state = IssueState.objects.create(
        project=proj, name='Backlog', color='#aaaaaa', category='backlog', sequence=1
    )
    return proj, state


class EpicListTests(TestCase):
    def setUp(self):
        self.ws, self.member = _make_workspace()
        self.project, self.state = _make_project(self.ws, self.member)
        self.client = APIClient()
        self.client.force_authenticate(user=self.member)

    def _epic(self, title='Epic', **kw):
        return Issue.objects.create(
            project=self.project, title=title, state=self.state,
            type='epic', created_by=self.member, reporter=self.member, **kw
        )

    def _task(self, title='Task', epic=None, **kw):
        return Issue.objects.create(
            project=self.project, title=title, state=self.state,
            type='task', epic=epic, created_by=self.member, reporter=self.member, **kw
        )

    def test_list_returns_only_epics(self):
        epic = self._epic()
        self._task()  # should not appear
        r = self.client.get(f'/api/v1/projects/{self.project.id}/epics/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]['id'], str(epic.id))

    def test_child_count_and_completed_count(self):
        epic = self._epic()
        self._task(epic=epic)
        done_state = IssueState.objects.create(
            project=self.project, name='Done', color='#00aa00', category='completed',
            sequence=2
        )
        Issue.objects.create(
            project=self.project, title='Done task', state=done_state,
            type='task', epic=epic, created_by=self.member, reporter=self.member
        )
        r = self.client.get(f'/api/v1/projects/{self.project.id}/epics/')
        self.assertEqual(r.data[0]['child_count'], 2)
        self.assertEqual(r.data[0]['completed_count'], 1)
