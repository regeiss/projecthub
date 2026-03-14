from rest_framework.permissions import SAFE_METHODS, BasePermission

# ---------------------------------------------------------------------------
# Hierarquia de papéis no projeto
# ---------------------------------------------------------------------------
_ROLE_RANK = {"admin": 3, "member": 2, "viewer": 1}


def _get_project_role(user, project):
    """Retorna o papel efetivo do usuário no projeto, ou None se sem acesso."""
    if getattr(user, "role", None) == "admin":
        return "admin"  # workspace admin tem acesso total
    from apps.projects.models import ProjectMember

    try:
        pm = ProjectMember.objects.get(project=project, member=user)
        return pm.role
    except ProjectMember.DoesNotExist:
        return None


def _resolve_project(obj):
    """Obtém instância de Project a partir de obj (Project, Issue, Cycle...)."""
    from apps.projects.models import Project

    if isinstance(obj, Project):
        return obj
    if hasattr(obj, "project") and isinstance(obj.project, Project):
        return obj.project
    if hasattr(obj, "project_id"):
        try:
            return Project.objects.get(pk=obj.project_id)
        except Project.DoesNotExist:
            return None
    return None


# ---------------------------------------------------------------------------
# Permissões de workspace
# ---------------------------------------------------------------------------


class IsWorkspaceAdmin(BasePermission):
    """Somente administradores do workspace."""
    message = "Requer perfil de administrador do workspace."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class IsWorkspaceMember(BasePermission):
    """Qualquer membro ativo do workspace (não guest)."""
    message = "Acesso restrito a membros do workspace."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("admin", "member")
        )


# ---------------------------------------------------------------------------
# Permissões de projeto (verificadas via has_object_permission)
# ---------------------------------------------------------------------------


class _ProjectRolePermission(BasePermission):
    """Base para permissões de projeto. Subclasses definem required_rank."""
    required_rank = 1
    message = "Acesso negado ao projeto."

    def has_object_permission(self, request, view, obj):
        project = _resolve_project(obj)
        if project is None:
            return False
        role = _get_project_role(request.user, project)
        return _ROLE_RANK.get(role, 0) >= self.required_rank


class IsProjectViewer(_ProjectRolePermission):
    """Viewer, member e admin — acesso de leitura."""
    required_rank = 1


class IsProjectMember(_ProjectRolePermission):
    """Member e admin — leitura e escrita."""
    required_rank = 2


class IsProjectAdmin(_ProjectRolePermission):
    """Somente admin do projeto (ou workspace admin)."""
    required_rank = 3


class IsProjectMemberOrReadOnly(_ProjectRolePermission):
    """Viewer pode ler; member/admin podem escrever."""
    required_rank = 1

    def has_object_permission(self, request, view, obj):
        project = _resolve_project(obj)
        if project is None:
            return False
        role = _get_project_role(request.user, project)
        rank = _ROLE_RANK.get(role, 0)
        if request.method in SAFE_METHODS:
            return rank >= 1
        return rank >= 2
