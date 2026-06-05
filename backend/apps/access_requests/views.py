import logging

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.authentication import _decode_jwt
from apps.workspaces.models import Workspace

from .models import AccessRequest
from .serializers import AccessRequestSerializer

logger = logging.getLogger(__name__)


def _decode_from_request(request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise ValueError("Token necessário.")
    token = auth.split(" ", 1)[1]
    import jwt as pyjwt
    try:
        return _decode_jwt(token)
    except pyjwt.ExpiredSignatureError:
        raise ValueError("Token expirado.")
    except Exception as exc:
        raise ValueError(f"Token inválido: {exc}")


def notify_admins_of_new_request(access_request):
    if not access_request.workspace:
        return
    from apps.workspaces.models import WorkspaceMember
    from .tasks import send_admin_notification
    admins = WorkspaceMember.objects.filter(
        workspace=access_request.workspace, role="admin", is_active=True,
    )
    for admin in admins:
        send_admin_notification.delay(str(access_request.id), str(admin.id))


class AccessRequestSubmitView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        try:
            payload = _decode_from_request(request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=401)

        sub = payload.get("sub")
        email = payload.get("email", "")
        name = payload.get("name") or payload.get("preferred_username", "")

        workspace_id = request.data.get("workspace_id")
        workspace_name = request.data.get("workspace_name", "").strip()
        secretaria = request.data.get("secretaria", "").strip()
        reason = request.data.get("reason", "").strip()

        workspace = None
        if workspace_id:
            workspace = Workspace.objects.filter(pk=workspace_id).first()
        if workspace and not workspace_name:
            workspace_name = workspace.name

        if not workspace_name or not secretaria:
            return Response(
                {"detail": "workspace_name e secretaria são obrigatórios."}, status=400
            )

        existing = AccessRequest.objects.filter(
            keycloak_sub=sub, status=AccessRequest.Status.PENDING,
        ).first()
        if existing:
            return Response(AccessRequestSerializer(existing).data, status=200)

        previous = AccessRequest.objects.filter(
            keycloak_sub=sub, status=AccessRequest.Status.DENIED,
        ).order_by("-requested_at").first()

        req = AccessRequest.objects.create(
            keycloak_sub=sub,
            email=email,
            name=name,
            workspace=workspace,
            workspace_name=workspace_name,
            secretaria=secretaria,
            reason=reason,
            previous_request=previous,
        )

        notify_admins_of_new_request(req)

        return Response(AccessRequestSerializer(req).data, status=201)


class AccessRequestStatusView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        try:
            payload = _decode_from_request(request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=401)

        sub = payload.get("sub")
        req = AccessRequest.objects.filter(
            keycloak_sub=sub,
        ).order_by("-requested_at").first()

        if not req:
            return Response({"detail": "Nenhuma solicitação encontrada."}, status=404)

        return Response(AccessRequestSerializer(req).data)
