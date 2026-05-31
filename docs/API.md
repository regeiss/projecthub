# API.md — Contratos e Convenções da API REST

## Base URL

```
https://projecthub.nh.rs.gov.br/api/v1/
```

---

## Autenticação

Todas as rotas requerem o header:

```
Authorization: Bearer <keycloak_access_token>
```

Token obtido via `keycloak-js` no frontend. Sem token → `401 Unauthorized`.

---

## Formato padrão de resposta

### Sucesso (lista paginada)

```json
{
  "count": 150,
  "next": "https://.../api/v1/issues/?page=2",
  "previous": null,
  "results": [ ... ]
}
```

### Sucesso (objeto único)

```json
{
  "id": "uuid",
  "field": "value",
  ...
}
```

### Erro

```json
{
  "error": "mensagem de erro legível",
  "code": "error_code",
  "details": { ... }
}
```

---

## Paginação

- Parâmetro: `?page=N` (padrão page_size = 50)
- Cursor pagination para feeds de atividade (alto volume)

---

## Filtros comuns

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `project_id` | UUID | Filtrar por projeto |
| `state_id` | UUID | Filtrar por estado |
| `assignee_id` | UUID | Filtrar por responsável |
| `priority` | string | urgent/high/medium/low/none |
| `type` | string | task/bug/story/epic/subtask |
| `search` | string | Busca full-text (título + descrição) |
| `ordering` | string | Campo para ordenação (prefixar com - para DESC) |
| `created_after` | datetime | ISO 8601 |
| `updated_after` | datetime | ISO 8601 |

---

## Endpoints por módulo

### Auth

```
GET  /auth/me/                  Dados do usuário logado
```

### Workspaces

```
GET  /workspaces/               Lista workspaces
GET  /workspaces/{slug}/        Detalhe
GET  /workspaces/{slug}/members/
PATCH /workspaces/{slug}/members/{id}/
```

### Projects

```
GET    /projects/
POST   /projects/
GET    /projects/{id}/
PATCH  /projects/{id}/
DELETE /projects/{id}/
GET    /projects/{id}/members/
POST   /projects/{id}/members/
DELETE /projects/{id}/members/{member_id}/
GET    /projects/{id}/states/
POST   /projects/{id}/states/
PATCH  /projects/{id}/states/{state_id}/
DELETE /projects/{id}/states/{state_id}/
GET    /projects/{id}/labels/
POST   /projects/{id}/labels/
PATCH  /projects/{id}/labels/{label_id}/
DELETE /projects/{id}/labels/{label_id}/
```

### Issues

```
GET    /issues/                           (filtros: project_id obrigatório)
POST   /issues/
GET    /issues/{id}/
PATCH  /issues/{id}/
DELETE /issues/{id}/
PATCH  /issues/{id}/state/               {state_id, sort_order}
GET    /issues/{id}/comments/
POST   /issues/{id}/comments/
PATCH  /issues/{id}/comments/{cid}/
DELETE /issues/{id}/comments/{cid}/
GET    /issues/{id}/activities/
GET    /issues/{id}/attachments/
POST   /issues/{id}/attachments/
DELETE /issues/{id}/attachments/{aid}/
GET    /issues/{id}/relations/
POST   /issues/{id}/relations/
DELETE /issues/{id}/relations/{rid}/
```

### Cycles

```
GET    /projects/{id}/cycles/
POST   /projects/{id}/cycles/
GET    /projects/{id}/cycles/{cid}/
PATCH  /projects/{id}/cycles/{cid}/
DELETE /projects/{id}/cycles/{cid}/
GET    /projects/{id}/cycles/{cid}/progress/
POST   /cycles/{cid}/issues/             {issue_id}
DELETE /cycles/{cid}/issues/{issue_id}/
```

### Modules

```
GET    /projects/{id}/modules/
POST   /projects/{id}/modules/
GET    /projects/{id}/modules/{mid}/
PATCH  /projects/{id}/modules/{mid}/
DELETE /projects/{id}/modules/{mid}/
POST   /modules/{mid}/issues/
DELETE /modules/{mid}/issues/{issue_id}/
```

### Wiki

```
GET    /wiki/spaces/
POST   /wiki/spaces/
GET    /wiki/spaces/{id}/
PATCH  /wiki/spaces/{id}/
DELETE /wiki/spaces/{id}/
GET    /wiki/spaces/{id}/pages/
POST   /wiki/spaces/{id}/pages/
GET    /wiki/pages/{id}/
PATCH  /wiki/pages/{id}/
DELETE /wiki/pages/{id}/
GET    /wiki/pages/{id}/versions/
POST   /wiki/pages/{id}/versions/{n}/restore/
GET    /wiki/pages/{id}/links/
POST   /wiki/pages/{id}/links/
DELETE /wiki/pages/{id}/links/{issue_id}/
POST   /wiki/pages/{id}/publish/
DELETE /wiki/pages/{id}/publish/
GET    /wiki/search/?q=termo              Busca full-text
```

### Notifications

```
GET  /notifications/
PATCH /notifications/{id}/read/
POST  /notifications/read-all/
```

### CPM (Fase 2)

```
GET  /cpm/projects/{id}/
POST /cpm/projects/{id}/calculate/
GET  /cpm/projects/{id}/network/
GET  /cpm/projects/{id}/gantt/
GET  /cpm/projects/{id}/baselines/
POST /cpm/projects/{id}/baselines/
```

### Portfolio (Fase 3)

```
GET    /portfolio/
POST   /portfolio/
GET    /portfolio/{id}/
PATCH  /portfolio/{id}/
DELETE /portfolio/{id}/
GET    /portfolio/{id}/dashboard/
GET    /portfolio/{id}/roadmap/
GET    /portfolio/{id}/projects/
POST   /portfolio/{id}/projects/
PATCH  /portfolio/{id}/projects/{ppid}/
DELETE /portfolio/{id}/projects/{ppid}/
POST   /portfolio/{id}/projects/{ppid}/costs/
GET    /portfolio/{id}/objectives/
POST   /portfolio/{id}/objectives/
PATCH  /portfolio/{id}/objectives/{oid}/
DELETE /portfolio/{id}/objectives/{oid}/
```

---

## Códigos de status

| Status | Quando usar |
|---|---|
| 200 | Sucesso em GET, PATCH |
| 201 | Sucesso em POST (criação) |
| 204 | Sucesso em DELETE (sem corpo) |
| 400 | Dados inválidos (ValidationError) |
| 401 | Sem autenticação ou token expirado |
| 403 | Autenticado mas sem permissão |
| 404 | Recurso não encontrado |
| 409 | Conflito (ex: identifier duplicado) |
| 422 | Erro de negócio (ex: issue circular dependency no CPM) |
| 500 | Erro interno — nunca expor detalhes em produção |

---

## Uploads de arquivo

- Endpoint: `POST /issues/{id}/attachments/`
- Content-Type: `multipart/form-data`
- Campo: `file`
- Tamanho máximo: 50MB
- Tipos permitidos: imagens, PDF, documentos Office, texto, ZIP
- Armazenamento: OCI Object Storage — retorna URL pré-assinada com expiração de 1h

---

## Busca unificada

```
GET /search/?q=termo&type=issues,pages&project_id=uuid

Response:
{
  "issues": [...],
  "pages": [...],
  "total": 42
}
```

Usa índice `tsvector` do PostgreSQL com `to_tsvector('portuguese', ...)`.
