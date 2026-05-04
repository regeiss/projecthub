from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import WorkspaceMemberSerializer, WorkspaceMemberUpdateSerializer


class MeView(APIView):
    """
    GET  /api/v1/auth/me/  — dados do usuário autenticado
    PATCH /api/v1/auth/me/ — atualiza name e/ou avatar_url
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = WorkspaceMemberSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = WorkspaceMemberUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(WorkspaceMemberSerializer(request.user).data)
