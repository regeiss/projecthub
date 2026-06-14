import json
import logging

import requests
from django.conf import settings
from django.core.cache import cache
from jwt.algorithms import RSAAlgorithm
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

import jwt

logger = logging.getLogger(__name__)

JWKS_CACHE_KEY = "keycloak_jwks"
JWKS_CACHE_TTL = 3600

# Keycloak session IDs revoked via back-channel logout are stored here.
# TTL is generous (24 h) to cover refresh-token lifetimes; entries are cheap.
_SID_BLACKLIST_PREFIX = "kc_sid_logout:"
_SID_BLACKLIST_TTL = 86400


# ---------------------------------------------------------------------------
# Module-level helpers — shared by the DRF authenticator, WS middleware, and
# the backchannel-logout view so nothing duplicates JWKS fetching.
# ---------------------------------------------------------------------------

def _get_jwks() -> dict:
    jwks = cache.get(JWKS_CACHE_KEY)
    if not jwks:
        try:
            response = requests.get(settings.OIDC_OP_JWKS_ENDPOINT, timeout=5)
            response.raise_for_status()
            jwks = response.json()
            cache.set(JWKS_CACHE_KEY, jwks, JWKS_CACHE_TTL)
        except requests.RequestException as exc:
            raise AuthenticationFailed(f"Não foi possível obter JWKS: {exc}")
    return jwks


def _decode_jwt(token: str, *, verify_aud: bool | None = None) -> dict:
    """
    Decode and verify a Keycloak-issued JWT using the cached JWKS.

    verify_aud=None  → honour KEYCLOAK_VERIFY_AUDIENCE setting (access tokens)
    verify_aud=False → skip audience check (required for logout_token per spec)
    """
    if verify_aud is None:
        verify_aud = getattr(settings, "KEYCLOAK_VERIFY_AUDIENCE", True)

    jwks_data = _get_jwks()

    header = jwt.get_unverified_header(token)
    kid = header.get("kid")

    public_key = None
    for key_data in jwks_data.get("keys", []):
        if key_data.get("kid") == kid:
            public_key = RSAAlgorithm.from_jwk(json.dumps(key_data))
            break

    if public_key is None:
        raise jwt.InvalidTokenError(f"Chave JWK não encontrada para kid={kid}")

    issuer = getattr(settings, "KEYCLOAK_ISSUER", settings.OIDC_OP_JWKS_ENDPOINT.rsplit("/protocol/", 1)[0])
    verify_iss = getattr(settings, "KEYCLOAK_VERIFY_ISSUER", True)

    decode_kwargs: dict = {
        "algorithms": ["RS256"],
        "options": {"verify_exp": True, "verify_iss": verify_iss, "verify_aud": verify_aud},
    }
    if verify_iss:
        decode_kwargs["issuer"] = issuer
    if verify_aud:
        decode_kwargs["audience"] = settings.OIDC_RP_CLIENT_ID

    return jwt.decode(token, public_key, **decode_kwargs)


def blacklist_session(sid: str) -> None:
    """Mark a Keycloak session ID as logged-out. Any token with this sid is rejected."""
    cache.set(f"{_SID_BLACKLIST_PREFIX}{sid}", 1, _SID_BLACKLIST_TTL)


def is_session_blacklisted(sid: str) -> bool:
    return bool(cache.get(f"{_SID_BLACKLIST_PREFIX}{sid}"))


def _is_realm_admin(payload: dict) -> bool:
    """True if the JWT carries a Keycloak realm role matching KEYCLOAK_ADMIN_ROLE (default 'admin')."""
    admin_role = getattr(settings, "KEYCLOAK_ADMIN_ROLE", "admin")
    realm_roles = payload.get("realm_access", {}).get("roles", [])
    return admin_role in realm_roles


# ---------------------------------------------------------------------------
# DRF authenticator
# ---------------------------------------------------------------------------

class KeycloakJWTAuthentication(BaseAuthentication):
    """
    Autentica requests via JWT emitido pelo Keycloak.
    Verifica localmente via JWKS (sem chamar Keycloak a cada request).
    Retorna o WorkspaceMember correspondente ao sub do token.
    """

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            print(f"[AUTH] No Bearer token for {request.path}, header={auth_header!r}", flush=True)
            return None

        token = auth_header.split(" ", 1)[1]
        print(f"[AUTH] Token received, prefix={token[:30]!r}", flush=True)
        try:
            member = self._decode_and_get_member(token, request)
            print(f"[AUTH] Success for member: {member}", flush=True)
            return (member, token)
        except Exception as exc:
            print(f"[AUTH] JWT decode failed: {exc}", flush=True)
            raise

    def authenticate_header(self, request):
        return 'Bearer realm="projecthub"'

    def _decode_and_get_member(self, token, request=None):
        """Decode token and return the WorkspaceMember. Also called by WS middleware."""
        try:
            payload = _decode_jwt(token)
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token expirado.")
        except jwt.InvalidTokenError as exc:
            raise AuthenticationFailed(f"Token inválido: {exc}")

        sid = payload.get("sid")
        if sid and is_session_blacklisted(sid):
            raise AuthenticationFailed("Sessão encerrada.")

        return self._get_or_create_member(payload, request)

    def _get_or_create_member(self, payload, request=None):
        from apps.workspaces.models import Workspace, WorkspaceMember

        sub = payload.get("sub")
        if not sub:
            raise AuthenticationFailed("Token sem sub.")

        email = payload.get("email", "")
        name = payload.get("name") or payload.get("preferred_username", "")
        is_admin = _is_realm_admin(payload)

        workspace = None
        workspace_id = request.headers.get("X-Workspace-ID") if request else None
        if workspace_id:
            try:
                workspace = Workspace.objects.get(pk=workspace_id)
            except (Workspace.DoesNotExist, Exception):
                workspace = None

        if workspace is None:
            existing = (
                WorkspaceMember.objects
                .filter(keycloak_sub=sub)
                .select_related("workspace")
                .first()
            )
            if existing:
                workspace = existing.workspace
            else:
                role = WorkspaceMember.Role.ADMIN if is_admin else WorkspaceMember.Role.MEMBER
                return WorkspaceMember(keycloak_sub=sub, email=email, name=name, role=role)

        if not workspace:
            raise AuthenticationFailed("Nenhum workspace configurado.")

        defaults = {"email": email, "name": name}
        if is_admin:
            defaults["role"] = "admin"

        member, created = WorkspaceMember.objects.get_or_create(
            keycloak_sub=sub,
            workspace=workspace,
            defaults=defaults,
        )

        if not member.is_active:
            raise AuthenticationFailed("Usuário inativo.")

        if not created:
            update_fields = []
            if member.email != email:
                member.email = email
                update_fields.append("email")
            if member.name != name:
                member.name = name
                update_fields.append("name")
            if is_admin and member.role != "admin":
                member.role = "admin"
                update_fields.append("role")
            if update_fields:
                update_fields.append("updated_at")
                member.save(update_fields=update_fields)

        return member
