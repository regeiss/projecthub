# ARCHITECTURE.md — Arquitetura do ProjectHub

## Visão geral

```
Browser
  │
  ├── HTTPS :443 ──► Nginx
  │                     ├── /          ──► React SPA (build estático)
  │                     ├── /api/      ──► Django API (Daphne ASGI)
  │                     └── /ws/       ──► Django Channels (WebSocket)
  │
  └── SSO ──► Keycloak (https://sso.nh.rs.gov.br)


Django API
  ├── DRF ViewSets (REST)
  ├── Django Channels (WebSocket)
  ├── Celery Worker (tasks assíncronas)
  └── Celery Beat (tasks periódicas)

Dados
  ├── PostgreSQL 16   — dados relacionais
  └── Redis 7         — cache, filas Celery, channel layer WebSocket

Storage
  └── OCI Object Storage (S3-compatible) — uploads de mídia
```

---

## Decisões técnicas

### Por que Daphne + Channels em vez de Uvicorn + FastAPI

O projeto usa Django para aproveitar o ORM, admin, migrations e o ecossistema de packages já dominado pela equipe. Channels é a extensão natural para WebSocket no Django. Daphne é o servidor ASGI recomendado para Channels.

### Por que não separar API e WebSocket em serviços distintos

Com 2-3 desenvolvedores e escala municipal, manter um único processo Django simplifica deploy, monitoramento e debugging. Quando a carga justificar, o Daphne pode ser escalado horizontalmente sem mudar a arquitetura.

### Por que Redis para channel layer

O channel layer Redis permite múltiplas instâncias do Daphne compartilharem o estado dos grupos WebSocket. Mesmo com uma instância hoje, isso garante que um futuro scale-out funcione sem mudança de código.

### Por que não GraphQL

O projeto usa REST puro. GraphQL foi avaliado mas descartado: a equipe domina REST, o DRF tem filtros e paginação prontos, e a complexidade extra do GraphQL não se justifica para o tamanho da equipe.

### Por que TipTap para o editor wiki

TipTap é construído sobre ProseMirror, é extensível, tem suporte a Yjs para colaboração em tempo real, e tem pacotes prontos para tabelas, código, imagens e menções — tudo necessário para a wiki.

### Por que Yjs para colaboração

Yjs implementa CRDT (Conflict-free Replicated Data Type) — o mesmo algoritmo do Google Docs. O backend apenas faz relay das mensagens via WebSocket (awareness protocol). Não há lógica de merge no servidor.

### Por que NetworkX para CPM

NetworkX é a biblioteca de grafos mais madura do Python. O algoritmo CPM é um problema de grafo dirigido acíclico (DAG) — NetworkX resolve com `topological_sort` e travessia forward/backward pass em poucas linhas.

---

## Fluxo de autenticação

```
1. Browser abre ProjectHub
2. keycloak-js detecta que não há sessão
3. Redirect para Keycloak login (https://sso.nh.rs.gov.br)
4. Usuário autentica (pode usar gov.br via OIDC federation)
5. Keycloak redireciona de volta com authorization_code
6. keycloak-js troca o code por access_token + refresh_token
7. axios.ts injeta "Authorization: Bearer <access_token>" em todas as requests
8. Django verifica o JWT localmente via JWKS (sem chamar Keycloak)
9. Extrai keycloak_sub e busca/cria WorkspaceMember
```

---

## Fluxo WebSocket (Wiki)

```
1. Frontend abre conexão: wss://host/ws/wiki/pages/{page_id}/
2. WikiPageConsumer verifica token no query string ou header
3. Consumer entra no grupo channel: page_{page_id}
4. Frontend inicializa Yjs doc + WebsocketProvider apontando para este WS
5. Yjs envia awareness state (cursor, presença)
6. Consumer faz relay das mensagens Yjs para todos no grupo
7. Quando usuário edita, Yjs envia update binário
8. Consumer rebroadcast para o grupo
9. Outros clientes aplicam o update via CRDT
```

---

## Fluxo CPM

```
1. PM lança duração estimada em dias em cada issue
2. PM define dependências (finish_to_start, start_to_start, etc.)
3. Ao salvar, signal dispara task Celery na fila "cpm"
4. Task chama apps/cpm/algorithm.py:calcular_cpm(project_id)
5. NetworkX monta DAG com issues e dependências
6. Forward pass: calcula ES e EF para cada nó
7. Backward pass: calcula LS e LF para cada nó
8. Calcula folga (slack = LS - ES) e marca caminho crítico (slack == 0)
9. Persiste resultados em cpm_issue_data
10. Envia evento via channel group: project_{project_id}
11. Frontend recebe e atualiza Gantt + diagrama de rede em tempo real
```

---

## Estrutura de permissões

```
Workspace Admin  → acesso total ao workspace e todos os projetos
Project Admin    → acesso total ao projeto
Project Member   → leitura e escrita no projeto
Project Viewer   → somente leitura
Guest            → sem acesso (precisa de convite explícito)
```

Permissões implementadas em `core/permissions.py` e aplicadas nos ViewSets.
Nunca usar `IsAdminUser` do DRF — usar as permissões customizadas do projeto.

---

## Variáveis de ambiente críticas

Todas em `.env.example`. As mais críticas:

| Variável | Onde usada |
|---|---|
| `SECRET_KEY` | Django — assinar cookies e tokens |
| `DATABASE_URL` | Django ORM |
| `REDIS_URL` | Cache + Channel Layer |
| `CELERY_BROKER_URL` | Celery broker |
| `KEYCLOAK_SERVER_URL` | JWKS endpoint |
| `KEYCLOAK_REALM` | OIDC realm |
| `KEYCLOAK_CLIENT_SECRET` | Verificação de token (confidential client) |
| `OCI_S3_ENDPOINT` | Upload de arquivos |

---

## Considerações de segurança

- Nunca logar tokens JWT completos
- Headers de segurança configurados no Nginx e no Django (production.py)
- Uploads de arquivo validados: tipo MIME + tamanho máximo (50MB)
- Conteúdo wiki sanitizado com `bleach` antes de salvar
- SQL direto proibido — usar sempre o ORM ou queries parametrizadas
- CORS restrito aos origins configurados no `.env`
