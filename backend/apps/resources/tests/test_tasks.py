# backend/apps/resources/tests/test_tasks.py
from django.test import TestCase
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project, ProjectMember, IssueState
from apps.issues.models import Issue
from apps.portfolio.models import Portfolio, PortfolioProject
from apps.resources.models import ResourceProfile, TimeEntry
from apps.resources.tasks import sync_labor_costs


def _setup_world():
    ws = Workspace.objects.create(name='WS', slug='ws-t2')
    admin = WorkspaceMember.objects.create(
        workspace=ws, keycloak_sub='sub-t2', email='t2@x.com', name='T2', role='admin',
    )
    project = Project.objects.create(
        workspace=ws, name='P', identifier='PP', created_by=admin,
    )
    ProjectMember.objects.create(project=project, member=admin, role='admin')
    state = IssueState.objects.create(
        project=project, name='Backlog', color='#aaa', category='backlog', sequence=1,
    )
    issue = Issue.objects.create(
        project=project, title='T', state=state, priority='none', reporter=admin, created_by=admin,
    )
    portfolio = Portfolio.objects.create(workspace=ws, name='Port', owner=admin)
    pp = PortfolioProject.objects.create(portfolio=portfolio, project=project)
    ResourceProfile.objects.create(project=project, member=admin, daily_rate_brl='400.00')
    return issue, admin, pp


class SyncLaborCostsTest(TestCase):
    def test_creates_cost_entry(self):
        issue, admin, pp = _setup_world()
        TimeEntry.objects.create(issue=issue, member=admin, date='2026-04-10', hours='8.00')

        sync_labor_costs(str(issue.id), 2026, 4)

        from apps.portfolio.models import PortfolioCostEntry
        entry = PortfolioCostEntry.objects.get(portfolio_project=pp, category='labor')
        self.assertAlmostEqual(float(entry.amount), 400.00, places=2)
        self.assertEqual(entry.description, 'Auto: mão de obra 2026-04')

    def test_updates_existing_auto_entry(self):
        issue, admin, pp = _setup_world()
        TimeEntry.objects.create(issue=issue, member=admin, date='2026-04-10', hours='8.00')
        sync_labor_costs(str(issue.id), 2026, 4)

        TimeEntry.objects.create(issue=issue, member=admin, date='2026-04-11', hours='8.00')
        sync_labor_costs(str(issue.id), 2026, 4)

        from apps.portfolio.models import PortfolioCostEntry
        entries = PortfolioCostEntry.objects.filter(portfolio_project=pp, category='labor')
        self.assertEqual(entries.count(), 1)
        self.assertAlmostEqual(float(entries.first().amount), 800.00, places=2)

    def test_no_portfolio_project_exits_silently(self):
        ws = Workspace.objects.create(name='WS2', slug='ws-t3')
        admin = WorkspaceMember.objects.create(
            workspace=ws, keycloak_sub='sub-t3', email='t3@x.com', name='T3', role='admin',
        )
        project = Project.objects.create(
            workspace=ws, name='P2', identifier='P2', created_by=admin,
        )
        state = IssueState.objects.create(
            project=project, name='Backlog', color='#bbb', category='backlog', sequence=1,
        )
        issue = Issue.objects.create(
            project=project, title='T', state=state, priority='none', reporter=admin, created_by=admin,
        )
        # No PortfolioProject — should not raise
        sync_labor_costs(str(issue.id), 2026, 4)
