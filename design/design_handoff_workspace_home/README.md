# Handoff: Workspace Home (Início)

## Overview
Tela de **início do workspace** do ProjectHub — o "pouso diário" do usuário. Agrega num único dashboard: trabalho atribuído ao usuário, atividade recente do workspace, ciclos em andamento, notificações novas e próximos marcos. Rota sugerida: `/` (raiz autenticada do workspace).

## About the Design Files
Os arquivos neste pacote são **referências de design feitas em HTML** — protótipos low-fi que mostram **layout, hierarquia e comportamento pretendidos**, não código de produção para copiar. A tarefa é **recriar o design no codebase existente** (React, Vue, etc.) usando os componentes, tokens e padrões já estabelecidos. Se ainda não houver framework definido, escolha o mais apropriado para o projeto.

## Fidelity
**Low-fidelity wireframe.** Use como guia para:
- Estrutura do shell (sidebar + body)
- Composição e prioridade dos tiles do dashboard
- Densidade e agrupamento de informação

**Não** use as cores, fontes ou estilos visuais do mock — aplique o design system do codebase. As "squiggles" (linhas onduladas) representam texto/conteúdo real a ser preenchido.

## Screen: Workspace Home

### Purpose
Em uma única tela, dar ao usuário tudo o que precisa para começar o dia: o que está na mão dele, o que mudou desde a última visita, e o que está por vir. Tudo é clicável e leva ao contexto correto (issue, projeto, ciclo, notificação).

### Layout
Shell de duas colunas dentro do chrome de janela padrão:

```
┌──────────────────────────────────────────────────────┐
│  chrome (projecthub.app /)                           │
├─────────────┬────────────────────────────────────────┤
│  Sidebar    │  Topbar (greeting + título + ação)     │
│  (workspace ├────────────────────────────────────────┤
│   nav)      │  ┌──────────┬──────────┬───────────┐   │
│             │  │ Meu      │ Activity │ Ciclos    │   │
│             │  │ trabalho ├──────────┼───────────┤   │
│             │  │ (alto,   │ Notif.   │ Próximos  │   │
│             │  │  span 2) │          │ marcos    │   │
│             │  └──────────┴──────────┴───────────┘   │
└─────────────┴────────────────────────────────────────┘
```

- **Sidebar**: largura fixa (~220–260px), persistente no workspace inteiro
- **Body**: 1fr, com topbar + grid de tiles
- **Grid de tiles**: 3 colunas. O tile "Meu trabalho" ocupa `grid-row: span 2` (mais alto, à esquerda). Os outros quatro tiles preenchem a grade restante.
- **Responsivo**: em telas <1024px o grid colapsa para 2 colunas; em <640px, 1 coluna. Sidebar vira drawer no mobile.

### Sidebar (workspace nav)
Cabeçalho com logo + nome do workspace (ex. "Acme"). Lista vertical, separadores por seção:

**Workspace** (nav principal)
1. Início *(ativo nesta tela)*
2. Projetos
3. Portfólio
4. Wiki
5. Recursos

**Fixados** (seção rotulada `fixados` em label small caps mono)
- Lista dos projetos que o usuário fixou (ex. Atlas, Beacon, Cygnus)

### Topbar do body
- Saudação contextual ao horário/dia: "bom dia, alex" (texto secundário pequeno acima)
- Título principal: **"Início"**
- À direita: botão **"personalizar"** — abre painel de configuração dos tiles (quais mostrar, ordem)

### Tiles do dashboard

#### 1. Meu trabalho  *(spans 2 rows, à esquerda)*
- **Header**: título "meu trabalho" + contador secundário "N abertas"
- **Conteúdo**: lista de issues atribuídas ao usuário em todos os projetos
- Cada linha: chip de prioridade (P1/P2/P3/P4) + título da issue (truncado em 1 linha)
- P1 com chip preenchido (solid); P2–P4 com chip outline
- Click numa linha → navega para a issue
- Ordenação padrão: prioridade desc, depois due date asc
- Empty state: "você está em dia ✓"
- Footer opcional: link "ver tudo" para a tela completa de issues atribuídas

#### 2. Activity *(hoje)*
- **Header**: "activity" + meta "hoje"
- **Conteúdo**: feed de eventos recentes do workspace (todos os projetos)
- Cada linha: avatar do ator (14px círculo) + descrição compacta do evento
- Eventos: criação/resolução de issue, comentário, mudança de status, marco atingido
- Limite ~4–6 linhas; link "ver mais" abre activity log completo

#### 3. Ciclos *(N ativos)*
- **Header**: "ciclos" + contador "N ativos"
- Cada linha: nome do ciclo + barra/chip de progresso (ex. "62%")
- Click → tela de detalhe do ciclo
- Mostra apenas ciclos em andamento dos projetos a que o usuário pertence

#### 4. Notificações *(N novas)*
- **Header**: "notificações" + contador "N novas"
- Preview das notificações não-lidas mais recentes (3–4 itens)
- Cada linha: chip de tipo (`@` menção, `▸` atribuição, etc.) + título
- Click no header → tela completa de Inbox (ver handoff separado)
- Click numa linha → abre item e marca como lida

#### 5. Próximos marcos
- **Header**: "próximos" + meta "marcos"
- **Conteúdo**: visualização gráfica curta — bar chart das próximas N semanas, altura = quantidade de marcos
- Barra de destaque (cor de acento) marca a semana atual ou a semana com marco crítico
- Click → tela de marcos consolidada

## Interactions & Behavior

- **Cada tile é navegável**: header é link para a tela completa daquele dado; linhas individuais navegam para o item específico
- **Drag-reorder** dos tiles (via "personalizar")
- **Hide/show tiles** via "personalizar" — preferência por usuário, persistida no perfil
- **Loading**: skeleton por tile (cada um carrega independente)
- **Empty states**: copy positivo e contextual ("você está em dia ✓", "nada novo por aqui")
- **Realtime opcional**: tiles de Activity e Notificações atualizam via stream; outros revalidam ao focar a janela
- **Greeting**: "bom dia/boa tarde/boa noite" baseado no fuso do usuário

## State Management

Cada tile é um query independente:
- `myWork({ userId, limit })`
- `workspaceActivity({ workspaceId, since })`
- `activeCycles({ workspaceId, userId })`
- `unreadNotifications({ userId, limit })`
- `upcomingMilestones({ workspaceId, weeks: 8 })`

Preferências do usuário:
- `dashboardTiles`: `{ id, visible, order, span }[]`
- `pinnedProjects`: `projectId[]`

## Design Tokens
Aplique os tokens do codebase. Referências semânticas:
- **Cor de acento**: usada em "em risco", chip de menção não-lida, barra do marco destacado
- **Texto mid**: meta dos tiles (contadores secundários), nomes de seção da sidebar
- **Surface**: cada tile é uma superfície elevada sutil (card) — borda 1px ou shadow leve, raio padrão
- **Spacing**: gap entre tiles ~8–12px; padding interno do tile ~12–16px

## Assets
Nenhum asset binário. Avatares são gerados por iniciais ou imagem do usuário; ícones da sidebar e chips devem usar o icon set do codebase.

## Files
- `ProjectHub Wireframes.html` — wireframe completo do produto. A tela "Início do workspace" é o frame **02 Workspace home** dentro da seção 2.
- `workspace-home-frame.html` — extrato do frame 02 isolado, para visualização rápida.

## Out of scope (v1)
- Tiles customizados por usuário (escrever fórmulas/saved views)
- Widgets de terceiros (calendário Google, GitHub PRs)
- Tema escuro do dashboard (segue o tema global)
- Customização por projeto (esta tela é estritamente workspace-level)
