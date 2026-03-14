from rest_framework.permissions import BasePermission

from core.permissions import _ROLE_RANK, _get_project_role


class IsIssueProjectMember(BasePermission):
    """Qualquer membro do projeto (member ou admin) pode escrever."""
    message = "Acesso negado ao projeto desta issue."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == "admin":
            return True
        role = _get_project_role(user, obj.project)
        return _ROLE_RANK.get(role, 0) >= 2


class IsIssueReporterOrProjectMember(BasePermission):
    """Reporter sempre pode editar sua issue; demais precisam ser member+."""
    message = "Apenas o reporter ou membros do projeto podem editar esta issue."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == "admin":
            return True
        if str(obj.reporter_id) == str(user.id):
            return True
        role = _get_project_role(user, obj.project)
        return _ROLE_RANK.get(role, 0) >= 2
