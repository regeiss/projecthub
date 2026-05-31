# AUTH.md — Autenticação Keycloak OIDC

## Infraestrutura existente

O Keycloak já está em produção na Prefeitura:
- URL: `https://sso.nh.rs.gov.br`
- Realm: `prefeitura`
- Usado por outros sistemas (GLPI, gov.br integration)

O ProjectHub é um **novo client** nesse Keycloak — não instalar nem configurar novo Keycloak.

---

## Configuração do client no Keycloak

Criar dois clients no realm `prefeitura`:

### Client: `projecthub-frontend`
- Client type: `public` (SPA — sem client secret)
- Valid redirect URIs: `https://projecthub.nh.rs.gov.br/*`
- Web origins: `https://projecthub.nh.rs.gov.br`
- Standard flow: enabled
- Direct access grants: disabled

### Client: `projecthub-backend`
- Client type: `confidential`
- Service account: enabled
- Valid redirect URIs: `https://projecthub.nh.rs.gov.br/*`
- Standard flow: enabled

---

## Fluxo completo (Authorization Code Flow + PKCE)

```
1. Usuário acessa projecthub.nh.rs.gov.br
2. keycloak-js (frontend) detecta ausência de sessão
3. Redirect para:
   https://sso.nh.rs.gov.br/realms/prefeitura/protocol/openid-connect/auth
   ?client_id=projecthub-frontend
   &redirect_uri=https://projecthub.nh.rs.gov.br/
   &response_type=code
   &scope=openid email profile
   &code_challenge=<PKCE>
   &code_challenge_method=S256

4. Usuário faz login (pode usar gov.br via federation)

5. Keycloak redireciona de volta:
   https://projecthub.nh.rs.gov.br/?code=AUTH_CODE

6. keycloak-js troca o code por tokens:
   POST https://sso.nh.rs.gov.br/realms/prefeitura/protocol/openid-connect/token
   {code, redirect_uri, code_verifier, client_id, grant_type=authorization_code}

7. Recebe: {access_token, refresh_token, id_token, expires_in}

8. axios.ts injeta em todas as requests:
   Authorization: Bearer <access_token>

9. keycloak-js renova automaticamente o token antes de expirar (minValidity: 30s)
```

---

## Verificação JWT no backend

Implementar em `apps/authentication/authentication.py`:

```python
import jwt
import requests
from django.core.cache import cache
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


JWKS_CACHE_KEY = 'keycloak_jwks'
JWKS_CACHE_TTL = 3600  # 1 hora


class KeycloakJWTAuthentication(BaseAuthentication):

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None  # não é JWT — deixar passar para outro authenticator

        token = auth_header.split(' ', 1)[1]

        try:
            payload = self._decode_token(token)
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token expirado.')
        except jwt.InvalidTokenError as e:
            raise AuthenticationFailed(f'Token inválido: {e}')

        member = self._get_or_create_member(payload)
        return (member, token)

    def _get_jwks(self):
        jwks = cache.get(JWKS_CACHE_KEY)
        if not jwks:
            url = settings.OIDC_OP_JWKS_ENDPOINT
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            jwks = response.json()
            cache.set(JWKS_CACHE_KEY, jwks, JWKS_CACHE_TTL)
        return jwks

    def _decode_token(self, token):
        jwks = self._get_jwks()
        # Usar PyJWT ou python-jose para verificar
        # Verificar: assinatura, exp, iss, aud
        ...

    def _get_or_create_member(self, payload):
        from apps.workspaces.models import WorkspaceMember
        sub = payload.get('sub')
        if not sub:
            raise AuthenticationFailed('Token sem sub.')

        member, created = WorkspaceMember.objects.get_or_create(
            keycloak_sub=sub,
            defaults={
                'email': payload.get('email', ''),
                'name': payload.get('name', payload.get('preferred_username', '')),
            }
        )

        if not created:
            # Atualizar dados se mudaram no Keycloak
            updated = False
            if member.email != payload.get('email', ''):
                member.email = payload.get('email', '')
                updated = True
            if updated:
                member.save(update_fields=['email', 'updated_at'])

        return member
```

---

## Claims do token Keycloak

| Claim | Tipo | Descrição |
|---|---|---|
| `sub` | string UUID | Identificador único do usuário — usar como `keycloak_sub` |
| `email` | string | E-mail |
| `name` | string | Nome completo |
| `preferred_username` | string | Login (CPF no caso do gov.br) |
| `given_name` | string | Primeiro nome |
| `family_name` | string | Sobrenome |
| `exp` | int | Unix timestamp de expiração |
| `iss` | string | Issuer: `https://sso.nh.rs.gov.br/realms/prefeitura` |
| `aud` | string/list | Audience: `projecthub-backend` |

---

## Frontend — keycloak-js

Implementar em `frontend/src/lib/keycloak.ts`:

```typescript
import Keycloak from 'keycloak-js'

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
})

export default keycloak
```

Implementar em `frontend/src/features/auth/AuthProvider.tsx`:

```typescript
// Inicializar Keycloak no mount
// Configurar renovação automática do token (onTokenExpired)
// Salvar token e dados do usuário no authStore
// Mostrar loading enquanto inicializa
```

Implementar em `frontend/src/lib/axios.ts`:

```typescript
// Interceptor de request: injetar Authorization: Bearer <token>
// Interceptor de response: se 401, chamar keycloak.updateToken() e retry
```

---

## Segurança

- Nunca salvar o access_token em localStorage — keycloak-js usa sessionStorage por padrão (configurável)
- O refresh_token tem vida mais longa (configurar no Keycloak: 30 min para access, 1 dia para refresh)
- Em caso de logout, chamar `keycloak.logout()` que invalida a sessão no Keycloak também
- O backend não valida o refresh_token — apenas o access_token
