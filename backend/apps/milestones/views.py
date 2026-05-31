from rest_framework import generics
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated

from core.pagination import StandardPagination

from .models import Milestone
from .serializers import MilestoneSerializer


def _get_project(pk, user):
    from apps.projects.models import Project

    try:
        project = Project.objects.get(pk=pk)
    except Project.DoesNotExist:
        raise NotFound('Projeto não encontrado.')
    if user.role != 'admin' and not project.members.filter(member=user).exists():
        raise NotFound('Projeto não encontrado.')
    return project


class MilestoneListCreateView(generics.ListCreateAPIView):
    """GET /projects/{project_pk}/milestones/  — lista milestones do projeto.
    POST /projects/{project_pk}/milestones/    — cria um novo milestone."""

    serializer_class   = MilestoneSerializer
    permission_classes = [IsAuthenticated]
    pagination_class   = StandardPagination

    def _project(self):
        return _get_project(self.kwargs['project_pk'], self.request.user)

    def get_queryset(self):
        return Milestone.objects.filter(project=self._project())

    def perform_create(self, serializer):
        serializer.save(project=self._project())


class MilestoneDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /projects/{project_pk}/milestones/{pk}/"""

    serializer_class   = MilestoneSerializer
    permission_classes = [IsAuthenticated]
    http_method_names  = ['get', 'patch', 'delete', 'head', 'options']

    def get_object(self):
        project = _get_project(self.kwargs['project_pk'], self.request.user)
        try:
            return Milestone.objects.get(pk=self.kwargs['pk'], project=project)
        except Milestone.DoesNotExist:
            raise NotFound('Milestone não encontrado.')
