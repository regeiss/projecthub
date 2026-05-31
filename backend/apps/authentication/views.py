import jwt
from django.http import HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import _decode_jwt, blacklist_session
from .serializers import WorkspaceMemberSerializer, WorkspaceMemberUpdateSerializer

_BACKCHANNEL_LOGOUT_EVENT = "http://schemas.openid.net/event/backchannel-logout"


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


@csrf_exempt
@require_POST
def backchannel_logout(request):
    """
    POST /api/v1/auth/logout/backchannel/

    Called by Keycloak when a user logs out from any client in the SSO realm.
    Validates the logout_token via JWKS, then blacklists the Keycloak session ID
    in Redis so future requests with tokens from that session are rejected.
    """
    logout_token = request.POST.get("logout_token")
    if not logout_token:
        return HttpResponseBadRequest("logout_token ausente")

    try:
        # audience verification is skipped — logout tokens use a different aud
        payload = _decode_jwt(logout_token, verify_aud=False)
    except jwt.ExpiredSignatureError:
        return HttpResponse("logout_token expirado", status=400)
    except jwt.InvalidTokenError as exc:
        return HttpResponse(f"logout_token inválido: {exc}", status=400)
    except Exception as exc:
        return HttpResponse(f"Erro ao validar token: {exc}", status=400)

    # Spec requires: logout token must have sid and the backchannel-logout event
    sid = payload.get("sid")
    events = payload.get("events", {})
    if not sid or _BACKCHANNEL_LOGOUT_EVENT not in events:
        return HttpResponseBadRequest("logout_token não contém sid ou evento de logout")

    blacklist_session(sid)
    return HttpResponse(status=200)
