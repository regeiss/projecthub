from mozilla_django_oidc.auth import OIDCAuthenticationBackend


class KeycloakOIDCBackend(OIDCAuthenticationBackend):
    """
    Backend OIDC para o fluxo web Keycloak (mozilla-django-oidc).
    A autenticação da API REST é feita por KeycloakJWTAuthentication.
    Este backend é usado apenas para o fluxo de login web (admin Django, etc.).
    """
    pass
