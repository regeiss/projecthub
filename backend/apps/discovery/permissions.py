from rest_framework.permissions import BasePermission


class IsWorkspaceMember(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and getattr(user, "is_authenticated", False) and getattr(user, "workspace", None))

