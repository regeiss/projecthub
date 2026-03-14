import json
import logging

import requests
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from jwt.algorithms import RSAAlgorithm
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

import jwt

logger = logging.getLogger(__name__)

JWKS_CACHE_KEY = "keycloak_jwks"
JWKS_CACHE_TTL = 3600  # 1 hora


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
            return None  # não é JWT — deixar para outro authenticator

        token = auth_header.split(" ", 1)[1]
        print(f"[AUTH] Token received, prefix={token[:30]!r}", flush=True)
        try:
            member = self._decode_and_get_member(token)
            print(f"[AUTH] Success for member: {member}", flush=True)
            return (member, token)
        except Exception as exc:
            print(f"[AUTH] JWT decode failed: {exc}", flush=True)
            raise

    def authenticate_header(self, request):
        return 'Bearer realm="projecthub"'

    def _decode_and_get_member(self, token):
        """Decodifica o token e retorna o WorkspaceMember. Usado também pelo middleware WS."""
        try:
            payload = self._decode_token(token)
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token expirado.")
        except jwt.InvalidTokenError as exc:
            raise AuthenticationFailed(f"Token inválido: {exc}")

        return self._get_or_create_member(payload)

    def _get_jwks(self):
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

    def _decode_token(self, token):
        jwks_data = self._get_jwks()

        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        public_key = None
        for key_data in jwks_data.get("keys", []):
            if key_data.get("kid") == kid:
                public_key = RSAAlgorithm.from_jwk(json.dumps(key_data))
                break

        if public_key is None:
            raise jwt.InvalidTokenError(f"Chave JWK não encontrada para kid={kid}")

        # Deriva o issuer a partir do JWKS endpoint
        issuer = settings.OIDC_OP_JWKS_ENDPOINT.rsplit("/protocol/", 1)[0]

        verify_iss = getattr(settings, "KEYCLOAK_VERIFY_ISSUER", True)
        verify_aud = getattr(settings, "KEYCLOAK_VERIFY_AUDIENCE", True)
        decode_kwargs = {
            "algorithms": ["RS256"],
            "options": {"verify_exp": True, "verify_iss": verify_iss, "verify_aud": verify_aud},
        }
        # PyJWT validates audience whenever the audience kwarg is passed, regardless of verify_aud.
        # Only include issuer/audience kwargs when verification is actually enabled.
        if verify_iss:
            decode_kwargs["issuer"] = issuer
        if verify_aud:
            decode_kwargs["audience"] = settings.OIDC_RP_CLIENT_ID
        return jwt.decode(token, public_key, **decode_kwargs)

    def _get_or_create_member(self, payload):
        from apps.workspaces.models import Workspace, WorkspaceMember

        sub = payload.get("sub")
        if not sub:
            raise AuthenticationFailed("Token sem sub.")

        workspace = Workspace.objects.first()
        if not workspace:
            raise AuthenticationFailed("Nenhum workspace configurado.")

        member, created = WorkspaceMember.objects.get_or_create(
            keycloak_sub=sub,
            defaults={
                "workspace": workspace,
                "email": payload.get("email", ""),
                "name": (
                    payload.get("name")
                    or payload.get("preferred_username", "")
                ),
            },
        )

        if not member.is_active:
            raise AuthenticationFailed("Usuário inativo.")

        if not created:
            # Sincroniza dados que podem ter mudado no Keycloak
            update_fields = []
            new_email = payload.get("email", "")
            new_name = payload.get("name") or payload.get("preferred_username", "")

            if member.email != new_email:
                member.email = new_email
                update_fields.append("email")

            if member.name != new_name:
                member.name = new_name
                update_fields.append("name")

            if update_fields:
                update_fields.append("updated_at")
                member.save(update_fields=update_fields)

        return member
