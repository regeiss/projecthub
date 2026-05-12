# Handoff: Notifications (Inbox)

## Overview
Tela de **caixa de notificações** para o ProjectHub — um inbox no nível do workspace, agregando @ menções, atribuições, comentários e eventos de domínio (marcos, ciclos) de todos os projetos a que o usuário tem acesso.

## About the Design Files
Os arquivos neste pacote são **referências de design feitos em HTML** — protótipos low-fi que mostram **layout, hierarquia e comportamento pretendidos**, não código de produção para copiar. A tarefa é **recriar o design no codebase existente** (React, Vue, etc.) usando os componentes, tokens e padrões já estabelecidos. Se o projeto ainda não tem um framework definido, escolha o mais apropriado.

## Fidelity
**Low-fidelity wireframe.** Use como guia para:
- Estrutura de layout (shell de duas colunas)
- Agrupamentos e hierarquia de filtros
- Categorias de eventos
- Densidade aproximada

**Não** use as cores, tipografia ou estilos visuais do mock — aplique o design system do codebase. As "rabiscadas" (squiggles) representam texto a ser preenchido com conteúdo real.

## Screen: Inbox / Notifications

### Purpose
Permitir que o usuário processe rapidamente o que precisa de atenção — começando pelas @ menções e atribuições — sem precisar entrar projeto a projeto. Rota sugerida: `/inbox`.

### Layout
Shell de duas colunas dentro do chrome de janela padrão:

```
┌─────────────────────────────────────────────┐
│  chrome (/inbox)                            │
├──────────────┬──────────────────────────────┤
│  Sidebar     │  Topbar (título + ações)     │
│  (filtros)   ├──────────────────────────────┤
│              │  Group: Hoje                 │
│              │    item · item · item        │
│              │  Group: Ontem                │
│              │    item · item · item        │
└──────────────┴──────────────────────────────┘
```

- **Sidebar**: ~32% da largura útil, lista vertical
- **Body**: 1fr, lista cronológica agrupada
- Items são linhas com divisores tracejados; sem cards

### Sidebar — filtros (em ordem)
Título "🔔 Inbox", depois itens de navegação. O item selecionado fica destacado.

1. **Tudo** — badge com contagem (ex. 12)
2. **Não lidas** — badge com contagem (ex. 5)
3. **@ menções**
4. **Atribuídas** — issues atribuídas ao usuário com novas atividades
5. **Observando** — itens em que o usuário deu "watch/subscribe"

Separador `filtros` (label small caps mono), depois filtros por projeto:
6. **Atlas**, **Beacon**, … (lista dinâmica dos projetos fixados/com não lidas)

No rodapé da sidebar (pushed down com flex):
7. **Arquivadas**

### Topbar do body
- Título refletindo o filtro ativo (ex. "Tudo")
- Ação à direita: **"marcar tudo como lido"** (chip/botão secundário)

### Lista de notificações
Agrupadas por **data relativa**: Hoje · Ontem · Esta semana · Mais antigas. Cabeçalhos de grupo em label small caps mono.

Cada item tem:
- **Chip de tipo** (24×24, à esquerda): `@`, `▸`, `✓`, `◆`, `◷` — ver tabela abaixo
- **Conteúdo** (flex:1):
  - Linha 1: descrição da atividade (ex. "Kira mencionou você em ATL-172")
  - Linha 2: meta — `ID · timestamp relativo` em fonte mono, cor mid
- **Avatar** do ator (à direita, opcional), 18px, círculo
- Estado **não lida**: chip de tipo com fundo de acento; **lida**: opacidade 0.6–0.7, sem destaque
- Hover: fundo sutil; click: navega para o contexto (issue, doc, ciclo)

### Tipos de evento
| Chip | Tipo                          | Trigger                          |
|------|-------------------------------|----------------------------------|
| `@`  | Menção                        | Usuário mencionado em comentário |
| `▸`  | Atribuição                    | Issue atribuída ao usuário       |
| `✓`  | Resolução / status            | Issue resolvida ou status muda   |
| `◆`  | Marco                         | Marco atingido/atrasado          |
| `◷`  | Ciclo                         | Ciclo iniciado/encerrado         |
| `💬` | Comentário (em item observado) | Novo comentário em watch         |

## Interactions & Behavior

- **Click em um item** → navega para o contexto (`/p/:projeto/issue/:id`, etc.) e marca como lida
- **Click no chip de tipo** → opcional: marca como lida sem navegar
- **Hover** revela ações inline à direita: marcar lida/não-lida, arquivar, silenciar thread
- **Marcar tudo como lido** → ação em massa no filtro corrente
- **Filtro selecionado** persiste em URL (`/inbox?filter=mentions`)
- **Realtime**: novas notificações aparecem no topo do grupo "Agora/Hoje" com fade-in curto; badge da sidebar atualiza
- **Empty state** por filtro: copy contextual ("nada por aqui — você está em dia")
- **Mobile**: sidebar vira drawer; lista ocupa toda a largura

## State Management

Estado mínimo:
- `activeFilter`: `'all' | 'unread' | 'mentions' | 'assigned' | 'watching' | 'archived' | { project: id }`
- `notifications`: lista paginada, ordenada desc por `createdAt`
- `counts`: `{ all, unread, mentions, assigned, watching, byProject: { id: n } }`

Operações:
- `markRead(id)`, `markUnread(id)`, `archive(id)`, `markAllRead(filter)`
- Subscribe a stream realtime (WebSocket / SSE / polling) para inserts e updates
- Otimistic UI ao marcar como lida

## Design Tokens
Aplique os tokens do design system do codebase. Para referência semântica (não valores literais):
- **Acento**: a cor de destaque do produto — usada no chip de tipo de itens não-lidos e badges de contagem
- **Texto mid**: usado em metadados (ID · timestamp)
- **Divisor**: linha tracejada 1px entre itens (manter o tracejado é opcional — uma linha sólida sutil também serve)
- **Spacing**: itens ~36–44px de altura, padding vertical 8px, gap 8px entre chip/conteúdo/avatar

## Assets
Nenhum asset binário. Os "chips de tipo" podem usar ícones do icon set do codebase em vez dos glifos placeholder do wireframe.

## Files
- `ProjectHub Wireframes.html` — wireframe completo do produto. A tela de notificações é o frame **09 Notifications** dentro da seção 2 (Workspace).
- `notifications-frame.html` — extrato do frame 09 isolado, para visualização rápida.

## Out of scope (v1)
- Configurações de canal (email, push, slack) — vivem em `/settings/notifications`
- Digest diário/semanal
- Regras customizadas de silenciamento
