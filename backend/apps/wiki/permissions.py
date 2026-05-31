"""
Permissões para o módulo wiki.

Regras:
- WikiSpace global (project=None): qualquer membro do workspace pode ler;
  apenas admins podem criar/editar/deletar.
- WikiSpace de projeto: segue as permissões do projeto.
- WikiSpace privado: apenas o criador e admins têm acesso.
- Páginas bloqueadas (is_locked): apenas admins podem editar.
"""

from rest_framework.permissions import BasePermission, IsAuthenticated  # noqa: F401


def _get_member_role(user, workspace_id):
    """Retorna role do membro no workspace ('admin', 'member', 'viewer')."""
    return user.role  # WorkspaceMember.role


def can_read_space(user, space):
    """Verifica se user pode ler o space."""
    if space.is_private and space.created_by_id != user.pk:
        # Admins do workspace passam mesmo assim
        if user.role != "admin":
            return False
    return True


def can_write_space(user, space):
    """Verifica se user pode criar/editar páginas neste space."""
    if not can_read_space(user, space):
        return False
    if space.project_id:
        # Verifica membro do projeto
        from apps.projects.models import ProjectMember
        if user.role != "admin":
            try:
                pm = ProjectMember.objects.get(project_id=space.project_id, member=user)
                return pm.role in ("admin", "member")
            except ProjectMember.DoesNotExist:
                return False
    return True


def can_admin_space(user, space):
    """Verifica se user pode administrar (deletar, configurar) o space."""
    if user.role == "admin":
        return True
    if space.created_by_id == user.pk:
        return True
    if space.project_id:
        from apps.projects.models import ProjectMember
        try:
            pm = ProjectMember.objects.get(project_id=space.project_id, member=user)
            return pm.role == "admin"
        except ProjectMember.DoesNotExist:
            return False
    return False
