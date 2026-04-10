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


_project_counter = 0


def _make_project(ws, member):
    global _project_counter
    _project_counter += 1
    identifier = f'P{_project_counter}'
    proj = Project.objects.create(
        workspace=ws, name=f'Proj{_project_counter}', identifier=identifier, created_by=member
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


class IssueEpicValidationTests(TestCase):
    def setUp(self):
        self.ws, self.member = _make_workspace()
        self.project, self.state = _make_project(self.ws, self.member)
        self.client = APIClient()
        self.client.force_authenticate(user=self.member)
        self.epic = Issue.objects.create(
            project=self.project, title='Epic', state=self.state,
            type='epic', created_by=self.member, reporter=self.member
        )

    def _post(self, payload):
        return self.client.post('/api/v1/issues/', payload, format='json')

    def test_create_issue_linked_to_epic(self):
        r = self._post({
            'project': str(self.project.id),
            'title': 'Child',
            'state': str(self.state.id),
            'type': 'task',
            'epic_id': str(self.epic.id),
        })
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['epic']['id'], str(self.epic.id))
        self.assertEqual(r.data['epic']['title'], 'Epic')

    def test_epic_cannot_have_epic_id(self):
        r = self._post({
            'project': str(self.project.id),
            'title': 'Bad',
            'state': str(self.state.id),
            'type': 'epic',
            'epic_id': str(self.epic.id),
        })
        self.assertEqual(r.status_code, 400)

    def test_subtask_cannot_have_epic_id(self):
        parent = Issue.objects.create(
            project=self.project, title='Parent', state=self.state,
            type='task', created_by=self.member, reporter=self.member
        )
        r = self._post({
            'project': str(self.project.id),
            'title': 'Sub',
            'state': str(self.state.id),
            'type': 'task',
            'parent': str(parent.id),
            'epic_id': str(self.epic.id),
        })
        self.assertEqual(r.status_code, 400)

    def test_cross_project_epic_rejected(self):
        # Create a second project in the same workspace
        other_proj, other_state = _make_project(self.ws, self.member)
        # Create an epic in the OTHER project
        other_epic = Issue.objects.create(
            project=other_proj, title='OtherEpic', state=other_state,
            type='epic', created_by=self.member, reporter=self.member
        )
        # Try to assign other_epic (project B) to an issue in self.project (project A)
        r = self._post({
            'project': str(self.project.id),
            'title': 'Issue',
            'state': str(self.state.id),
            'type': 'task',
            'epic_id': str(other_epic.id),
        })
        self.assertEqual(r.status_code, 400)

    def test_invalid_color_hex_rejected(self):
        r = self._post({
            'project': str(self.project.id),
            'title': 'Epic',
            'state': str(self.state.id),
            'type': 'epic',
            'color': 'notacolor',
        })
        self.assertEqual(r.status_code, 400)

    def test_valid_color_accepted(self):
        r = self._post({
            'project': str(self.project.id),
            'title': 'Colored Epic',
            'state': str(self.state.id),
            'type': 'epic',
            'color': '#6366f1',
        })
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['color'], '#6366f1')
