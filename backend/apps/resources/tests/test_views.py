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
