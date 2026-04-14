# backend/apps/resources/views.py
from rest_framework.exceptions import PermissionDenied
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
