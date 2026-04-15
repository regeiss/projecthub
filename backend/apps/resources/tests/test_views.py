# backend/apps/resources/tests/test_views.py
from rest_framework.test import APITestCase
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project, ProjectMember, IssueState
from apps.resources.models import MemberCapacity, ResourceProfile


def make_workspace():
    ws = Workspace.objects.create(name='WS', slug='ws-test')
    admin = WorkspaceMember.objects.create(
        workspace=ws, keycloak_sub='sub-admin', email='admin@x.com',
        name='Admin', role='admin',
    )
    return ws, admin


def make_project(ws, creator):
    project = Project.objects.create(
        workspace=ws, name='Proj', identifier='PRJ', created_by=creator,
    )
    ProjectMember.objects.create(project=project, member=creator, role='admin')
    return project


class ResourceProfileViewTest(APITestCase):
    def setUp(self):
        self.ws, self.admin = make_workspace()
        self.project = make_project(self.ws, self.admin)
        self.client.force_authenticate(user=self.admin)

    def test_create_profile(self):
        res = self.client.post('/api/v1/resources/profiles/', {
            'project': str(self.project.id),
            'member': str(self.admin.id),
            'daily_rate_brl': '350.00',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['daily_rate_brl'], '350.00')

    def test_create_profile_non_project_member_fails(self):
        other = WorkspaceMember.objects.create(
            workspace=self.ws, keycloak_sub='sub-2', email='b@x.com',
            name='Bob', role='member',
        )
        res = self.client.post('/api/v1/resources/profiles/', {
            'project': str(self.project.id),
            'member': str(other.id),
            'daily_rate_brl': '300.00',
        })
        self.assertEqual(res.status_code, 400)

    def test_list_profiles(self):
        ResourceProfile.objects.create(
            project=self.project, member=self.admin, daily_rate_brl='400.00'
        )
        res = self.client.get(f'/api/v1/resources/profiles/?project={self.project.id}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_update_profile(self):
        profile = ResourceProfile.objects.create(
            project=self.project, member=self.admin, daily_rate_brl='300.00'
        )
        res = self.client.patch(f'/api/v1/resources/profiles/{profile.id}/', {
            'daily_rate_brl': '450.00',
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['daily_rate_brl'], '450.00')


class MemberCapacityViewTest(APITestCase):
    def setUp(self):
        self.ws, self.admin = make_workspace()
        self.client.force_authenticate(user=self.admin)

    def test_create_capacity(self):
        res = self.client.post('/api/v1/resources/capacity/', {
            'member': str(self.admin.id),
            'year': 2026,
            'month': 4,
            'available_days': '20.0',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(float(res.data['available_days']), 20.0)

    def test_invalid_month_fails(self):
        res = self.client.post('/api/v1/resources/capacity/', {
            'member': str(self.admin.id),
            'year': 2026,
            'month': 13,
            'available_days': '20.0',
        })
        self.assertEqual(res.status_code, 400)


from apps.resources.models import TimeEntry
from apps.issues.models import Issue


def make_issue(project, creator, state):
    return Issue.objects.create(
        project=project,
        title='Test Issue',
        state=state,
        priority='none',
        reporter=creator,
        created_by=creator,
    )


class TimeEntryViewTest(APITestCase):
    def setUp(self):
        self.ws, self.admin = make_workspace()
        self.project = make_project(self.ws, self.admin)
        self.state = IssueState.objects.create(
            project=self.project,
            name='Backlog',
            color='#aaa',
            category='backlog',
            sequence=1,
        )
        self.issue = make_issue(self.project, self.admin, self.state)
        self.client.force_authenticate(user=self.admin)

    def test_create_time_entry(self):
        res = self.client.post('/api/v1/resources/time-entries/', {
            'issue': str(self.issue.id),
            'member': str(self.admin.id),
            'date': '2026-04-14',
            'hours': '4.00',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['hours'], '4.00')

    def test_list_time_entries_filtered_by_issue(self):
        TimeEntry.objects.create(
            issue=self.issue, member=self.admin,
            date='2026-04-14', hours='3.00',
        )
        res = self.client.get(f'/api/v1/resources/time-entries/?issue={self.issue.id}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_delete_time_entry(self):
        entry = TimeEntry.objects.create(
            issue=self.issue, member=self.admin,
            date='2026-04-14', hours='2.00',
        )
        res = self.client.delete(f'/api/v1/resources/time-entries/{entry.id}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(TimeEntry.objects.filter(id=entry.id).exists())

    def test_member_cannot_delete_others_entry(self):
        other = WorkspaceMember.objects.create(
            workspace=self.ws, keycloak_sub='sub-3', email='c@x.com',
            name='Carol', role='member',
        )
        ProjectMember.objects.create(project=self.project, member=other, role='member')
        entry = TimeEntry.objects.create(
            issue=self.issue, member=self.admin,
            date='2026-04-14', hours='2.00',
        )
        self.client.force_authenticate(user=other)
        res = self.client.delete(f'/api/v1/resources/time-entries/{entry.id}/')
        self.assertEqual(res.status_code, 403)


class WorkloadViewTest(APITestCase):
    def setUp(self):
        self.ws, self.admin = make_workspace()
        self.project = make_project(self.ws, self.admin)
        self.state = IssueState.objects.create(
            project=self.project, name='Backlog', color='#aaa',
            category='backlog', sequence=1,
        )
        MemberCapacity.objects.create(
            member=self.admin, year=2026, month=4, available_days='20.0'
        )
        self.client.force_authenticate(user=self.admin)

    def test_workspace_workload_returns_member(self):
        res = self.client.get('/api/v1/resources/workload/?period=2026-04')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['member_name'], 'Admin')
        self.assertAlmostEqual(res.data[0]['available_days'], 20.0)

    def test_project_workload(self):
        res = self.client.get(
            f'/api/v1/resources/projects/{self.project.id}/workload/?period=2026-04'
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data[0]['member_name'], 'Admin')
