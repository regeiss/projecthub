# Design Spec: Inbox / Notifications
**Data:** 2026-05-12
**Rota:** `/inbox`
**Abordagem aprovada:** C — filtro server-side com cache por query key (TanStack Query)

---

## 1. Visão Geral

Tela de caixa de entrada de notificações no nível do workspace. Agrega menções, atribuições, comentários e eventos de domínio de todos os projetos acessíveis ao usuário. Permite processar rapidamente o que precisa de atenção sem entrar projeto a projeto.

---

## 2. Backend

### 2.1 Modelo `Notification` — novo campo

Adicionar coluna ao schema SQL (managed=False):

```sql
ALTER TABLE notifications_notification ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;
```

Campo Django:
```python
is_archived = models.BooleanField(default=False, db_index=True)
```

Atualizar `NotificationSerializer` para incluir `is_archived`.

### 2.2 Endpoint existente: `GET /notifications/`

Novos query params:

| Param | Valores | Lógica |
|-------|---------|--------|
| `filter` | `mentions`, `assigned`, `watching`, `archived` | ver mapeamento abaixo |
| `project_id` | UUID | filtra notificações de issues do projeto via join |
| `unread_only` | `1` | `is_read=False` |

Mapeamento de `filter`:
- `mentions` → `type__in=['issue_mentioned', 'wiki_mentioned']`
- `assigned` → `type='issue_assigned'`
- `watching` → `type='issue_commented'`
- `archived` → `is_archived=True` (sem filtro padrão de `is_archived=False`)
- default (sem filter) → `is_archived=False`

Filtro `project_id`: `Notification.objects.filter(entity_type='issue', entity_id__in=Issue.objects.filter(project_id=project_id).values('id'))`.

### 2.3 Novo endpoint: `GET /notifications/counts/`

Retorna contagens por categoria para o usuário autenticado:

```json
{
  "all": 12,
  "unread": 5,
  "mentions": 3,
  "assigned": 2,
  "watching": 1,
  "archived": 4,
  "by_project": { "<uuid>": 2 }
}
```

Calculado com queries agregadas (não carrega todas as notificações). `by_project` conta apenas não lidas por projeto.

### 2.4 Novos endpoints de ação

- `POST /notifications/<id>/archive/` — seta `is_archived=True`, `is_read=True`
- `POST /notifications/<id>/unread/` — seta `is_read=False` (marcar como não lida)

Ambos retornam o objeto `Notification` atualizado.

---

## 3. Frontend

### 3.1 Rota

Adicionar em `App.tsx` dentro do bloco `<Route element={<AppLayout />}>`:
```tsx
<Route path="/inbox" element={<InboxPage />} />
```

Adicionar link "Inbox" no `Sidebar.tsx` com ícone `Bell` e badge de `unreadCount` existente.

### 3.2 Novos arquivos

Todos em `frontend/src/features/notifications/`:

| Arquivo | Responsabilidade |
|---------|-----------------|
| `InboxPage.tsx` | Layout duas colunas, lê `useSearchParams` |
| `InboxSidebar.tsx` | Filtros + seção projetos + arquivadas no rodapé |
| `InboxList.tsx` | Lista agrupada por data com cabeçalhos |
| `InboxItem.tsx` | Linha individual com hover actions |
| `InboxEmptyState.tsx` | Empty state por filtro |
| `useInbox.ts` | Hooks de dados para a tela |

### 3.3 Service — `notification.service.ts` (adições)

```ts
listFiltered: (params: { filter?: string; project_id?: string; unread?: '1' }) =>
  api.get<PaginatedResponse<Notification>>('/notifications/', { params }).then(r => r.data),

counts: () =>
  api.get<NotificationCounts>('/notifications/counts/').then(r => r.data),

archive: (id: string) =>
  api.post<Notification>(`/notifications/${id}/archive/`).then(r => r.data),

markUnread: (id: string) =>
  api.post<Notification>(`/notifications/${id}/unread/`).then(r => r.data),
```

Novo tipo `NotificationCounts` em `types/index.ts`.

### 3.4 Hook — `useInbox.ts`

```ts
// Notificações filtradas — query key separa cache por combinação
useInboxNotifications(filter, projectId, unreadOnly)
  queryKey: ['inbox', filter, projectId, unreadOnly]

// Contagens — leve, atualiza a cada 60s
useNotificationCounts()
  queryKey: ['notification-counts']
  refetchInterval: 60_000

// Mutações
useArchiveNotification()   // invalida ['inbox', ...] + ['notification-counts']
useMarkUnread()            // idem
```

### 3.5 URL Persistence

Filtro ativo via `useSearchParams`. Parâmetros:
- `filter` — `all | unread | mentions | assigned | watching | archived`
- `project` — UUID do projeto
- `unread` — `1` (checkbox "só não lidas" na seção projetos — usa o mesmo param `unread=1` já aceito pelo backend)

Trocar filtro usa `setSearchParams`, sem `navigate`. Default: `filter=all`.

### 3.6 Realtime

`useNotificationSocket` (já existente) ao receber `notification.new`:
1. Invalida `queryClient.invalidateQueries({ queryKey: ['inbox'] })` — prefixo, invalida todas as combinações
2. Invalida `queryClient.invalidateQueries({ queryKey: ['notification-counts'] })`

Novos itens aparecem no topo do grupo "Hoje" com `animate-in fade-in duration-300`.

---

## 4. UI

### 4.1 Layout

```
┌─ InboxSidebar 260px ──┬─ body flex-1 ─────────────────┐
│                       │ [título]      [marcar tudo lido]│
│                       │ ─────────────────────────────── │
│                       │ HOJE                            │
│                       │  item · item                    │
│                       │ ONTEM                           │
│                       │  item (lida)                    │
└───────────────────────┴─────────────────────────────────┘
```

- `InboxPage`: `flex h-full`. Sidebar `w-64 shrink-0 border-r`. Body `flex-1 flex flex-col min-h-0`.
- Body topbar: `flex items-center px-6 py-4 border-b`. Lista: `flex-1 overflow-y-auto`.

### 4.2 InboxSidebar

- Título: `🔔 Inbox` — `text-sm font-semibold`
- Itens de filtro: `button w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm`
- Ativo: `bg-primary/10 text-primary font-medium`
- Inativo: `text-gray-600 hover:bg-gray-100`
- Badge de contagem: `ml-auto text-xs font-mono` — só renderiza quando `count > 0`
- Ícones Lucide por filtro:

| Filtro | Ícone |
|--------|-------|
| Tudo | `Inbox` |
| Não lidas | `Circle` (preenchido quando > 0) |
| @ Menções | `AtSign` |
| Atribuídas | `UserCheck` |
| Observando | `Eye` |
| Arquivadas | `Archive` |
| Projeto | `FolderKanban` |

- Separador "PROJETOS": `text-[10px] font-mono uppercase tracking-widest text-gray-400 px-3 py-2 mt-2`
- Checkbox "só não lidas" inline no título da seção projetos
- Lista de projetos: um botão por projeto, badge de não lidas à direita
- "Arquivadas": `mt-auto` no flex container da sidebar (pushed to bottom)

### 4.3 InboxItem

Anatomia (layout `flex items-center gap-3 px-6 py-2.5 border-b border-dashed border-gray-200`):

```
[chip 24px] [conteúdo flex-1]              [avatar 18px ou hover-actions]
```

**Chip de tipo** (24×24, `rounded-full flex items-center justify-center`):
- Não lida: `bg-primary text-white`
- Lida: `bg-gray-100 text-gray-400`

Ícones por `type`:

| type | Ícone Lucide | Chip |
|------|-------------|------|
| `issue_mentioned`, `wiki_mentioned` | `AtSign` | `@` |
| `issue_assigned` | `UserCheck` | `▸` |
| `issue_state_changed` | `CheckCircle` | `✓` |
| `issue_commented` | `MessageSquare` | `💬` |
| `cpm_critical_alert` | `Diamond` | `◆` |
| outros | `Bell` | `·` |

**Conteúdo:**
- Linha 1: `text-sm` título — `font-medium` se não lida, normal se lida
- Linha 2: `font-mono text-[11px] text-gray-400` — ex. `ATL-172 · 2m`

**Estado lida:** `opacity-65` no item inteiro.

**Hover actions** (`group` no container, `opacity-0 group-hover:opacity-100`):
- `CheckCheck` — marcar como lida (oculto se já lida)
- `RotateCcw` — marcar como não lida (oculto se não lida)
- `Archive` — arquivar

Click no item → navega para `actionUrl` + marca como lida (optimistic).

### 4.4 Agrupamento por data

`useMemo` sobre a lista retornada:

```
Hoje       → createdAt no mesmo dia calendário
Ontem      → dia anterior
Esta semana → últimos 7 dias (exceto hoje/ontem)
Mais antigas → resto
```

Cabeçalho: `text-[10px] font-mono uppercase tracking-widest text-gray-400 px-6 py-2`

### 4.5 Empty State

Por filtro, copy contextual:
- `all` / `unread`: "Você está em dia 👌"
- `mentions`: "Nenhuma menção recente"
- `assigned`: "Nenhuma atribuição nova"
- `watching`: "Nenhuma atividade nos itens que você observa"
- `archived`: "Nenhuma notificação arquivada"
- projeto: "Sem notificações neste projeto"

Layout: ícone Lucide (64px, `text-gray-300`) + `text-sm text-gray-400` centrado verticalmente.

### 4.6 Mobile

Abaixo de `lg:`, sidebar fica oculta (`hidden lg:flex`) e aparece um botão `Filter` no topbar que toggle um estado `sidebarOpen`. Sidebar renderiza como overlay `fixed inset-0 z-40` com backdrop quando aberta. Lista ocupa 100% da largura no mobile.

---

## 5. Fora de Escopo (v1)

- Configurações de canal (email, push) — vivem em `/settings/notifications`
- Sistema de watch/subscribe explícito — "Observando" usa `issue_commented` como proxy
- Digest diário/semanal
- Regras de silenciamento
- Paginação infinita — v1 usa paginação padrão (`page_size=50`)
