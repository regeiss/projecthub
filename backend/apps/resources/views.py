# backend/apps/resources/views.py
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics, status

from core.permissions import IsWorkspaceMember
from core.permissions import _get_project_role, _ROLE_RANK

from .models import MemberCapacity, ResourceProfile, TimeEntry
from .serializers import (
    MemberCapacitySerializer,
    ResourceProfileSerializer,
    TimeEntrySerializer,
)


def _require_project_admin(user, project):
    rank = _ROLE_RANK.get(_get_project_role(user, project), 0)
    if rank < 3:
        raise PermissionDenied('Requer permissão de admin no projeto.')


# ---------------------------------------------------------------------------
# ResourceProfile
# ---------------------------------------------------------------------------

class ResourceProfileListCreateView(APIView):
    permission_classes = [IsWorkspaceMember]

    def get(self, request):
        qs = ResourceProfile.objects.select_related('member').filter(
            project__workspace=request.user.workspace
        )
        project_id = request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return Response(ResourceProfileSerializer(qs, many=True).data)

    def post(self, request):
        serializer = ResourceProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = serializer.validated_data['project']
        if str(project.workspace_id) != str(request.user.workspace_id):
            raise PermissionDenied()
        _require_project_admin(request.user, project)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ResourceProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ResourceProfileSerializer
    permission_classes = [IsWorkspaceMember]

    def get_queryset(self):
        return ResourceProfile.objects.select_related('member', 'project').filter(
            project__workspace=self.request.user.workspace
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        _require_project_admin(request.user, instance.project)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        _require_project_admin(request.user, instance.project)
        return super().destroy(request, *args, **kwargs)


# ---------------------------------------------------------------------------
# MemberCapacity
# ---------------------------------------------------------------------------

class MemberCapacityListCreateView(APIView):
    permission_classes = [IsWorkspaceMember]

    def get(self, request):
        qs = MemberCapacity.objects.select_related('member').filter(
            member__workspace=request.user.workspace
        )
        member_id = request.query_params.get('member')
        if member_id:
            qs = qs.filter(member_id=member_id)
        year = request.query_params.get('year')
        if year:
            qs = qs.filter(year=year)
        month = request.query_params.get('month')
        if month:
            qs = qs.filter(month=month)
        return Response(MemberCapacitySerializer(qs, many=True).data)

    def post(self, request):
        serializer = MemberCapacitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = serializer.validated_data['member']
        if str(member.workspace_id) != str(request.user.workspace_id):
            raise PermissionDenied()
        if request.user.role != 'admin' and str(member.id) != str(request.user.id):
            raise PermissionDenied('Apenas admins podem definir capacidade de outros membros.')
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MemberCapacityDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MemberCapacitySerializer
    permission_classes = [IsWorkspaceMember]

    def get_queryset(self):
        return MemberCapacity.objects.select_related('member').filter(
            member__workspace=self.request.user.workspace
        )

    def _check_write(self, instance):
        if (self.request.user.role != 'admin' and
                str(instance.member_id) != str(self.request.user.id)):
            raise PermissionDenied('Apenas admins podem editar capacidade de outros membros.')

    def update(self, request, *args, **kwargs):
        self._check_write(self.get_object())
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._check_write(self.get_object())
        return super().destroy(request, *args, **kwargs)


# ---------------------------------------------------------------------------
# TimeEntry
# ---------------------------------------------------------------------------

class TimeEntryListCreateView(APIView):
    permission_classes = [IsWorkspaceMember]

    def get(self, request):
        from apps.projects.models import ProjectMember
        qs = TimeEntry.objects.select_related('member', 'issue__project').filter(
            issue__project__workspace=request.user.workspace
        )
        # Non-admins can only see entries for projects they belong to
        if request.user.role != 'admin':
            member_project_ids = ProjectMember.objects.filter(
                member=request.user
            ).values_list('project_id', flat=True)
            qs = qs.filter(issue__project_id__in=member_project_ids)
        issue_id = request.query_params.get('issue')
        if issue_id:
            qs = qs.filter(issue_id=issue_id)
        member_id = request.query_params.get('member')
        if member_id:
            qs = qs.filter(member_id=member_id)
        date_from = request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        date_to = request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(date__lte=date_to)
        project_id = request.query_params.get('project')
        if project_id:
            qs = qs.filter(issue__project_id=project_id)
        return Response(TimeEntrySerializer(qs, many=True).data)

    def post(self, request):
        serializer = TimeEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        issue = serializer.validated_data['issue']
        member = serializer.validated_data['member']
        if str(issue.project.workspace_id) != str(request.user.workspace_id):
            raise PermissionDenied()
        # Any member can log for themselves; project admin can log for others
        if str(member.id) != str(request.user.id):
            _require_project_admin(request.user, issue.project)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TimeEntryDestroyView(generics.DestroyAPIView):
    permission_classes = [IsWorkspaceMember]

    def get_queryset(self):
        return TimeEntry.objects.select_related('member', 'issue__project').filter(
            issue__project__workspace=self.request.user.workspace
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        is_owner = str(instance.member_id) == str(request.user.id)
        is_project_admin = _ROLE_RANK.get(
            _get_project_role(request.user, instance.issue.project), 0
        ) >= 3
        if not (is_owner or is_project_admin):
            raise PermissionDenied('Apenas o autor ou admin do projeto pode excluir este apontamento.')
        return super().destroy(request, *args, **kwargs)


# ---------------------------------------------------------------------------
# Workload
# ---------------------------------------------------------------------------

import calendar
from datetime import date as date_type

from .utils import compute_workload


def _parse_period(period_param):
    """Parse 'YYYY-MM' string. Returns (period_start, period_end) or raises ValueError."""
    year = int(period_param[:4])
    month = int(period_param[5:7])
    _, last_day = calendar.monthrange(year, month)
    return date_type(year, month, 1), date_type(year, month, last_day)


def _period_from_request(request):
    """Return (period_start, period_end) from query params or current month."""
    from rest_framework.exceptions import ValidationError
    cycle_id = request.query_params.get('cycle_id')
    period_param = request.query_params.get('period')

    if cycle_id:
        from apps.cycles.models import Cycle
        try:
            cycle = Cycle.objects.get(pk=cycle_id)
        except Cycle.DoesNotExist:
            raise NotFound('Ciclo não encontrado.')
        return cycle.start_date, cycle.end_date

    if period_param:
        try:
            return _parse_period(period_param)
        except (ValueError, IndexError):
            raise ValidationError({'period': 'Use o formato YYYY-MM.'})

    today = date_type.today()
    _, last_day = calendar.monthrange(today.year, today.month)
    return date_type(today.year, today.month, 1), date_type(today.year, today.month, last_day)


class WorkspaceWorkloadView(APIView):
    permission_classes = [IsWorkspaceMember]

    def get(self, request):
        from apps.workspaces.models import WorkspaceMember
        period_start, period_end = _period_from_request(request)
        members = WorkspaceMember.objects.filter(
            workspace=request.user.workspace, is_active=True
        )
        return Response(compute_workload(members, period_start, period_end))


class ProjectWorkloadView(APIView):
    permission_classes = [IsWorkspaceMember]

    def get(self, request, project_pk):
        from apps.projects.models import Project
        from apps.workspaces.models import WorkspaceMember
        try:
            project = Project.objects.get(pk=project_pk, workspace=request.user.workspace)
        except Project.DoesNotExist:
            raise NotFound('Projeto não encontrado.')

        period_start, period_end = _period_from_request(request)
        members = WorkspaceMember.objects.filter(
            project_memberships__project=project, is_active=True
        ).distinct()
        return Response(compute_workload(members, period_start, period_end, project=project))
