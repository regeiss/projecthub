from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import WorkspaceMemberSerializer


class MeView(APIView):
    """
    GET /api/v1/auth/me/
    Retorna os dados do usuário autenticado (WorkspaceMember).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = WorkspaceMemberSerializer(request.user)
        return Response(serializer.data)
