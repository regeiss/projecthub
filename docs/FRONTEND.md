# FRONTEND.md — Arquitetura React e Convenções

## Estrutura de pastas

```
frontend/src/
├── lib/          Utilitários e clientes singleton
├── types/        TypeScript interfaces e tipos de domínio
├── stores/       Estado global (Zustand)
├── services/     Camada de acesso à API
├── hooks/        React Query hooks por domínio
├── components/   UI reutilizável sem lógica de negócio
│   ├── ui/       Primitivos (Button, Input, Modal...)
│   ├── editor/   TipTap wrapper
│   ├── board/    Kanban
│   └── layout/   AppLayout, Sidebar, Header
└── features/     Páginas e lógica de negócio por módulo
```

**Regra fundamental:** `components/` é UI pura (sem chamadas de API).
Lógica de negócio e dados ficam em `features/` e `hooks/`.

---

## lib/

### keycloak.ts

Instância singleton do keycloak-js. Importar onde precisar do token.

```typescript
import Keycloak from 'keycloak-js'

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
})

export default keycloak
```

### axios.ts

Cliente HTTP pré-configurado. Nunca usar `axios` diretamente nas features.

```typescript
import axios from 'axios'
import keycloak from './keycloak'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Injeta token em toda requisição
api.interceptors.request.use(config => {
  if (keycloak.token) {
    config.headers.Authorization = `Bearer ${keycloak.token}`
  }
  return config
})

// Se 401: tenta renovar token e retenta a requisição
api.interceptors.response.use(
  res => res,
  async error => {
    if (error.response?.status === 401) {
      await keycloak.updateToken(30)
      return api(error.config)
    }
    return Promise.reject(error)
  }
)

export default api
```

### queryClient.ts

```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,        // 30s
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})
```

### utils.ts

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string { ... }
export function relativeTime(date: string | Date): string { ... }
export function truncate(str: string, max: number): string { ... }
```

---

## types/

Definir interfaces espelhando os serializers do backend.

```typescript
// types/issue.ts
export interface Issue {
  id: string
  sequenceId: number
  projectId: string
  title: string
  description: TipTapDoc | null
  stateId: string
  stateName: string
  stateColor: string
  stateCategory: StateCategory
  priority: Priority
  type: IssueType
  assigneeId: string | null
  assigneeName: string | null
  assigneeAvatar: string | null
  reporterId: string
  parentId: string | null
  epicId: string | null
  estimatePoints: number | null
  startDate: string | null
  dueDate: string | null
  completedAt: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  // CPM (Fase 2)
  cpmSlack: number | null
  isCritical: boolean
}

export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none'
export type IssueType = 'task' | 'bug' | 'story' | 'epic' | 'subtask'
export type StateCategory = 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled'
```

---

## stores/ (Zustand)

Apenas três stores globais. Não criar stores para dados do servidor — usar TanStack Query.

### authStore.ts

```typescript
interface AuthState {
  user: WorkspaceMember | null
  isAuthenticated: boolean
  setUser: (user: WorkspaceMember) => void
  logout: () => void
}
```

### workspaceStore.ts

```typescript
interface WorkspaceState {
  workspace: Workspace | null
  currentProject: Project | null
  setWorkspace: (w: Workspace) => void
  setCurrentProject: (p: Project) => void
}
```

### notificationStore.ts

```typescript
interface NotificationState {
  unreadCount: number
  notifications: Notification[]
  addNotification: (n: Notification) => void
  markRead: (id: string) => void
  setUnreadCount: (n: number) => void
}
```

---

## services/

Cada service é um objeto com funções que chamam a API via `lib/axios.ts`.

```typescript
// services/issue.service.ts
import api from '@/lib/axios'
import type { Issue, IssueFilters, CreateIssueDto, UpdateIssueDto } from '@/types'

export const issueService = {
  list: (filters: IssueFilters) =>
    api.get<PaginatedResponse<Issue>>('/issues/', { params: filters }).then(r => r.data),

  get: (id: string) =>
    api.get<Issue>(`/issues/${id}/`).then(r => r.data),

  create: (data: CreateIssueDto) =>
    api.post<Issue>('/issues/', data).then(r => r.data),

  update: (id: string, data: UpdateIssueDto) =>
    api.patch<Issue>(`/issues/${id}/`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/issues/${id}/`),

  updateState: (id: string, stateId: string, sortOrder: number) =>
    api.patch(`/issues/${id}/state/`, { stateId, sortOrder }).then(r => r.data),
}
```

---

## hooks/

Encapsulam TanStack Query para cada domínio.

```typescript
// hooks/useIssues.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { issueService } from '@/services/issue.service'
import type { IssueFilters, UpdateIssueDto } from '@/types'

export function useIssues(filters: IssueFilters) {
  return useQuery({
    queryKey: ['issues', filters],
    queryFn: () => issueService.list(filters),
    enabled: !!filters.projectId,
  })
}

export function useIssue(id: string) {
  return useQuery({
    queryKey: ['issue', id],
    queryFn: () => issueService.get(id),
  })
}

export function useUpdateIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIssueDto }) =>
      issueService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['issues'] })
      qc.invalidateQueries({ queryKey: ['issue', id] })
    },
  })
}
```

---

## features/board/ — Kanban com dnd-kit

Pontos críticos de implementação:

```typescript
// BoardPage.tsx
// 1. Agrupar issues por state_id
// 2. DndContext com sensors (mouse + touch)
// 3. SortableContext por coluna
// 4. onDragEnd: calcular novo sort_order (média entre vizinhos)
// 5. Optimistic update: atualizar estado local imediatamente
// 6. Chamar useUpdateIssue mutation para persistir
// 7. Em caso de erro: reverter estado local

// Sort order: usar float entre os vizinhos
// Ex: issue entre sort_order 1.0 e 2.0 → 1.5
// Quando não há espaço (diferença < 0.001): reindexar toda a coluna
```

---

## features/wiki/ — Editor colaborativo

### Fluxo de edição colaborativa

```typescript
// WikiEditor.tsx
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { useEditor } from '@tiptap/react'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'

// 1. Criar Y.Doc
const ydoc = new Y.Doc()

// 2. Conectar ao WebSocket do backend
const provider = new WebsocketProvider(
  `${import.meta.env.VITE_WS_URL}/wiki/pages/${pageId}/`,
  pageId,
  ydoc,
  { params: { token: keycloak.token } }
)

// 3. Inicializar TipTap com extensões de colaboração
const editor = useEditor({
  extensions: [
    StarterKit.configure({ history: false }),
    Collaboration.configure({ document: ydoc }),
    CollaborationCursor.configure({
      provider,
      user: { name: currentUser.name, color: '#3B82F6' },
    }),
    // ...outras extensões
  ],
})

// 4. Cleanup ao desmontar
useEffect(() => {
  return () => {
    provider.destroy()
    ydoc.destroy()
  }
}, [])
```

### Salvar conteúdo

O conteúdo é salvo automaticamente via debounce:

```typescript
useEffect(() => {
  if (!editor) return
  const timeout = setTimeout(() => {
    const json = editor.getJSON()
    updatePageMutation.mutate({ content: json })
  }, 2000) // debounce 2s
  return () => clearTimeout(timeout)
}, [editor?.state])
```

---

## Roteamento

Usar React Router v6 com rotas protegidas:

```typescript
// App.tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<ProtectedRoute />}>
    <Route element={<AppLayout />}>
      <Route path="/" element={<WorkspacePage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:projectId">
        <Route path="board" element={<BoardPage />} />
        <Route path="backlog" element={<BacklogPage />} />
        <Route path="cycles" element={<CyclesPage />} />
        <Route path="wiki" element={<WikiLayout />}>
          <Route path=":pageId" element={<WikiPage />} />
        </Route>
        <Route path="gantt" element={<GanttPage />} />   // Fase 2
      </Route>
      <Route path="/portfolio" element={<PortfolioPage />} />   // Fase 3
    </Route>
  </Route>
</Routes>
```

---

## Convenções de estilo (Tailwind)

```typescript
// Variantes com cn() de lib/utils.ts
const buttonVariants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
}

function Button({ variant = 'primary', className, ...props }) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-md text-sm font-medium transition-colors',
        buttonVariants[variant],
        className
      )}
      {...props}
    />
  )
}
```

Paleta de cores para prioridade e estado:

```
urgent  → red-600
high    → orange-500
medium  → yellow-500
low     → blue-400
none    → gray-400

completed  → green-600
cancelled  → gray-400
started    → blue-600
unstarted  → gray-500
backlog    → gray-400
```

---

## Variáveis de ambiente (frontend)

```
VITE_API_URL              http://localhost/api/v1
VITE_WS_URL               ws://localhost/ws
VITE_KEYCLOAK_URL         https://sso.nh.rs.gov.br
VITE_KEYCLOAK_REALM       prefeitura
VITE_KEYCLOAK_CLIENT_ID   projecthub-frontend
```

Acessar via `import.meta.env.VITE_*`. Nunca usar `process.env` no frontend.
