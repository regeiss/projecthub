import logging

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.authentication import KeycloakJWTAuthentication, _decode_jwt
from apps.workspaces.models import Workspace, WorkspaceMember
from core.pagination import StandardPagination

from .models import AccessRequest
from .serializers import AccessRequestDetailSerializer, AccessRequestSerializer, AdminResolveSerializer

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


def _get_workspace_or_404(slug):
    try:
        return Workspace.objects.get(slug=slug)
    except Workspace.DoesNotExist:
        raise NotFound(f"Workspace '{slug}' não encontrado.")


class AdminAccessRequestListView(APIView):
    authentication_classes = [KeycloakJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        ws = _get_workspace_or_404(slug)
        if request.user.workspace_id != ws.id or request.user.role != "admin":
            raise PermissionDenied()
        status_filter = request.query_params.get("status", "pending")
        qs = AccessRequest.objects.filter(workspace=ws)
        if status_filter != "all":
            qs = qs.filter(status=status_filter)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(
            AccessRequestDetailSerializer(page, many=True).data
        )


class AdminAccessRequestResolveView(APIView):
    authentication_classes = [KeycloakJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, slug, pk):
        ws = _get_workspace_or_404(slug)
        if request.user.workspace_id != ws.id or request.user.role != "admin":
            raise PermissionDenied()

        try:
            req = AccessRequest.objects.get(pk=pk, workspace=ws)
        except AccessRequest.DoesNotExist:
            raise NotFound()

        serializer = AdminResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            now = timezone.now()
            if data["action"] == "approve":
                workspace_ids = [ws.id] + list(data.get("extra_workspace_ids", []))
                for wid in workspace_ids:
                    target_ws = Workspace.objects.filter(pk=wid).first()
                    if not target_ws:
                        continue
                    WorkspaceMember.objects.get_or_create(
                        keycloak_sub=req.keycloak_sub,
                        workspace=target_ws,
                        defaults={
                            "email": req.email,
                            "name": req.name,
                            "role": data.get("role", "member"),
                        },
                    )
                req.status = AccessRequest.Status.APPROVED
                req.resolved_at = now
                req.resolved_by = request.user
                req.save(update_fields=["status", "resolved_at", "resolved_by", "updated_at"])

                from .tasks import send_requester_email
                granted_names = list(
                    Workspace.objects.filter(pk__in=workspace_ids).values_list("name", flat=True)
                )
                send_requester_email.delay(
                    str(req.id), "approved",
                    extra={"workspace_names": granted_names},
                )

            else:
                req.status = AccessRequest.Status.DENIED
                req.denial_reason = data.get("denial_reason", "")
                req.resolved_at = now
                req.resolved_by = request.user
                req.save(update_fields=["status", "denial_reason", "resolved_at", "resolved_by", "updated_at"])

                from .tasks import send_requester_email
                send_requester_email.delay(str(req.id), "denied")

        return Response(AccessRequestSerializer(req).data)
