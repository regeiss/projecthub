from core.permissions import (  # noqa: F401
    IsProjectAdmin,
    IsProjectMember,
    IsProjectMemberOrReadOnly,
    IsProjectViewer,
    IsWorkspaceAdmin,
    IsWorkspaceMember,
)
from rest_framework.permissions import BasePermission

from .models import ProjectMember


class CanManageProjectMembers(BasePermission):
    """Somente admin do projeto pode gerenciar membros."""
    message = "Apenas administradores do projeto podem gerenciar membros."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == "admin":
            return True
        try:
            pm = ProjectMember.objects.get(project=obj, member=user)
            return pm.role == "admin"
        except ProjectMember.DoesNotExist:
            return False
