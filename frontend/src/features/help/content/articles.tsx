import type { HelpArticle } from './types'

export const ARTICLES: HelpArticle[] = [
  // ── General ──────────────────────────────────────────────────────────────────
  {
    id: 'getting-started',
    category: 'general',
    title: 'Primeiros passos',
    keywords: ['início', 'começo', 'tutorial', 'introdução'],
    bodyText:
      'O ProjectHub é um sistema de gestão de projetos. Comece criando um projeto, adicione membros e crie issues para organizar o trabalho.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O <strong>ProjectHub</strong> é o sistema interno de gestão de projetos da Prefeitura de Novo Hamburgo. Use-o para planejar, acompanhar e entregar projetos com eficiência.
        </p>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Passo a passo</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Acesse <strong>Projetos</strong> no menu lateral e crie seu primeiro projeto.</li>
          <li>Adicione membros da equipe nas configurações do projeto.</li>
          <li>Crie <strong>issues</strong> para representar as tarefas do projeto.</li>
          <li>Organize as issues nos modos <strong>Board</strong>, <strong>Backlog</strong> ou <strong>Gantt</strong>.</li>
          <li>Use <strong>Ciclos</strong> para planejar sprints e <strong>Módulos</strong> para agrupar temas.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'workspace-overview',
    category: 'general',
    title: 'Visão geral do workspace',
    keywords: ['workspace', 'dashboard', 'visão geral', 'home'],
    bodyText:
      'O workspace é o ambiente central do ProjectHub. A tela inicial mostra um resumo dos seus projetos, atividades recentes e notificações.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O <strong>workspace</strong> é o ambiente central que reúne todos os projetos da organização.
        </p>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">O que você encontra na tela inicial</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Resumo de projetos ativos e seus status</li>
          <li>Issues recentemente atualizadas</li>
          <li>Atividades da equipe</li>
          <li>Atalhos para seus projetos mais usados</li>
        </ul>
      </div>
    ),
  },

  // ── Board ─────────────────────────────────────────────────────────────────────
  {
    id: 'kanban-board',
    category: 'board',
    title: 'Usando o quadro Kanban',
    routePattern: '/projects/:projectId/board',
    keywords: ['kanban', 'quadro', 'colunas', 'estados', 'board'],
    bodyText:
      'O Board exibe as issues organizadas em colunas por estado. Arraste as issues entre colunas para mudar seu estado.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O <strong>Board</strong> é um quadro Kanban que exibe as issues organizadas em colunas de acordo com o estado de cada uma.
        </p>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Como usar</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Cada coluna representa um estado (ex: Backlog, Em andamento, Concluído).</li>
          <li>Arraste e solte as issues entre colunas para atualizar o estado.</li>
          <li>Clique em uma issue para ver seus detalhes.</li>
          <li>Use os filtros no topo para exibir apenas issues de um responsável ou label.</li>
        </ul>
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Dica:</strong> As mudanças de estado feitas no Board são sincronizadas em tempo real para todos os membros.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'board-drag-drop',
    category: 'board',
    title: 'Arrastar e soltar issues',
    routePattern: '/projects/:projectId/board',
    keywords: ['arrastar', 'soltar', 'drag', 'drop', 'mover', 'ordem'],
    bodyText:
      'Arraste issues entre colunas para mudar o estado. Reordene dentro da mesma coluna para ajustar a prioridade visual.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O Board suporta arrastar e soltar para organizar issues de forma intuitiva.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li><strong>Entre colunas:</strong> muda o estado da issue.</li>
          <li><strong>Dentro da mesma coluna:</strong> reordena a posição visual da issue.</li>
        </ul>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          A ordem é salva automaticamente e refletida para todos os membros do projeto.
        </p>
      </div>
    ),
  },

  // ── Backlog ───────────────────────────────────────────────────────────────────
  {
    id: 'managing-backlog',
    category: 'backlog',
    title: 'Gerenciando o backlog',
    routePattern: '/projects/:projectId/backlog',
    keywords: ['backlog', 'lista', 'issues', 'prioridade'],
    bodyText:
      'O Backlog lista todas as issues do projeto em formato de lista. Use-o para priorizar e organizar o trabalho antes de entrar em um ciclo.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O <strong>Backlog</strong> é uma lista de todas as issues do projeto, ideal para priorização e planejamento.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Clique em <strong>+ Nova issue</strong> para criar uma issue diretamente no backlog.</li>
          <li>Arraste as linhas para reordenar a prioridade.</li>
          <li>Clique no título para editar inline.</li>
          <li>Use os filtros para exibir issues por estado, responsável, label ou ciclo.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'backlog-filters',
    category: 'backlog',
    title: 'Filtros e ordenação',
    routePattern: '/projects/:projectId/backlog',
    keywords: ['filtros', 'ordenação', 'busca', 'responsável', 'label', 'estado'],
    bodyText:
      'Filtre as issues por estado, responsável, label, prioridade ou ciclo. Combine múltiplos filtros para encontrar exatamente o que precisa.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Use a barra de filtros para restringir a lista de issues.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li><strong>Estado:</strong> filtra por Backlog, Em andamento, Concluído, etc.</li>
          <li><strong>Responsável:</strong> mostra apenas issues atribuídas a um membro.</li>
          <li><strong>Label:</strong> filtra por etiqueta.</li>
          <li><strong>Prioridade:</strong> Urgente, Alta, Média, Baixa.</li>
          <li><strong>Ciclo:</strong> mostra issues de um ciclo específico.</li>
        </ul>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Múltiplos filtros são combinados com AND.
        </p>
      </div>
    ),
  },

  // ── Cycles ────────────────────────────────────────────────────────────────────
  {
    id: 'creating-cycles',
    category: 'cycles',
    title: 'Criando ciclos',
    routePattern: '/projects/:projectId/cycles',
    keywords: ['ciclo', 'sprint', 'iteração', 'criar'],
    bodyText:
      'Ciclos são sprints com data de início e fim. Crie um ciclo para planejar um período de trabalho e acompanhar o progresso.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Ciclos</strong> são equivalentes a sprints — períodos de tempo delimitados para entregar um conjunto de issues.
        </p>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Como criar um ciclo</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Acesse <strong>Ciclos</strong> no menu do projeto.</li>
          <li>Clique em <strong>+ Novo ciclo</strong>.</li>
          <li>Defina nome, data de início e data de fim.</li>
          <li>Clique em <strong>Criar</strong>.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'cycle-issues',
    category: 'cycles',
    title: 'Adicionando issues a um ciclo',
    routePattern: '/projects/:projectId/cycles',
    keywords: ['ciclo', 'issue', 'adicionar', 'planejar'],
    bodyText:
      'Adicione issues a um ciclo para planejar o que será feito naquele período. Issues podem pertencer a apenas um ciclo por vez.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Para planejar um ciclo, adicione issues a ele. Cada issue pode pertencer a no máximo um ciclo ativo.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Abra o ciclo e clique em <strong>+ Adicionar issue</strong>.</li>
          <li>Ou, na issue, use o campo <strong>Ciclo</strong> para associá-la.</li>
          <li>O progresso do ciclo é calculado automaticamente com base nas issues concluídas.</li>
        </ul>
      </div>
    ),
  },

  // ── Gantt ─────────────────────────────────────────────────────────────────────
  {
    id: 'gantt-chart',
    category: 'gantt',
    title: 'Lendo o gráfico de Gantt',
    routePattern: '/projects/:projectId/gantt',
    keywords: ['gantt', 'cronograma', 'timeline', 'datas', 'barras'],
    bodyText:
      'O Gantt exibe as issues como barras em uma linha do tempo. Cada barra representa a duração estimada de uma issue.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O <strong>Gantt</strong> é uma visão de linha do tempo que mostra quando cada issue começa e termina.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Cada barra representa uma issue.</li>
          <li>O comprimento da barra indica a duração (data início → data fim).</li>
          <li>Issues no <strong>caminho crítico</strong> são destacadas em vermelho.</li>
          <li>Arraste as bordas de uma barra para ajustar as datas.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'critical-path',
    category: 'gantt',
    title: 'Caminho crítico (CPM)',
    routePattern: '/projects/:projectId/gantt',
    keywords: ['cpm', 'caminho crítico', 'dependências', 'folga', 'pert'],
    bodyText:
      'O CPM identifica a sequência de issues que determina a duração mínima do projeto. Issues no caminho crítico não têm folga.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O <strong>CPM (Critical Path Method)</strong> calcula o caminho mais longo de issues dependentes no projeto.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li><strong>Caminho crítico:</strong> sequência de issues sem folga — qualquer atraso nelas atrasa o projeto inteiro.</li>
          <li><strong>Folga:</strong> tempo que uma issue pode atrasar sem impactar a data final.</li>
          <li>Issues críticas aparecem em vermelho no Gantt.</li>
        </ul>
        <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Atenção:</strong> O CPM é recalculado automaticamente quando issues são alteradas.
          </p>
        </div>
      </div>
    ),
  },

  // ── Wiki ──────────────────────────────────────────────────────────────────────
  {
    id: 'wiki-pages',
    category: 'wiki',
    title: 'Criando páginas',
    routePattern: '/projects/:projectId/wiki',
    keywords: ['wiki', 'página', 'criar', 'documento'],
    bodyText:
      'Crie páginas na Wiki para documentar projetos, decisões e processos. As páginas suportam texto rico, tabelas e links para issues.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          A <strong>Wiki</strong> é um espaço de documentação colaborativa para cada projeto ou para o workspace inteiro.
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Acesse <strong>Wiki</strong> no menu do projeto ou no menu lateral.</li>
          <li>Clique em <strong>+ Nova página</strong>.</li>
          <li>Digite o título e comece a escrever.</li>
          <li>Use <code>/</code> para inserir blocos (tabela, imagem, lista de tarefas, etc.).</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'wiki-collaboration',
    category: 'wiki',
    title: 'Edição colaborativa',
    routePattern: '/projects/:projectId/wiki',
    keywords: ['colaboração', 'tempo real', 'edição simultânea'],
    bodyText:
      'Múltiplos usuários podem editar a mesma página ao mesmo tempo. As mudanças são sincronizadas em tempo real.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          A Wiki suporta <strong>edição colaborativa em tempo real</strong>. Vários membros podem editar a mesma página simultaneamente.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>As alterações de outros usuários aparecem instantaneamente.</li>
          <li>O histórico de versões é salvo automaticamente a cada 30 segundos.</li>
          <li>Acesse <strong>Versões</strong> para restaurar uma versão anterior.</li>
        </ul>
      </div>
    ),
  },

  // ── Portfolio ─────────────────────────────────────────────────────────────────
  {
    id: 'portfolio-dashboard',
    category: 'portfolio',
    title: 'Painel do portfólio',
    routePattern: '/portfolio',
    keywords: ['portfólio', 'painel', 'dashboard', 'projetos', 'executivo'],
    bodyText:
      'O portfólio exibe uma visão executiva de múltiplos projetos com status RAG, progresso e métricas EVM.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          O <strong>Portfólio</strong> é uma visão executiva que agrupa múltiplos projetos para acompanhamento estratégico.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Veja o status RAG (Verde / Âmbar / Vermelho) de cada projeto.</li>
          <li>Acompanhe o progresso geral e os indicadores EVM.</li>
          <li>Compare projetos lado a lado.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'rag-status',
    category: 'portfolio',
    title: 'Semáforo de saúde do projeto',
    routePattern: '/portfolio',
    keywords: ['rag', 'status', 'verde', 'âmbar', 'vermelho', 'semáforo'],
    bodyText:
      'RAG é um semáforo de saúde do projeto. Verde no prazo, Âmbar atenção, Vermelho em risco. Calculado pela diferença entre progresso real e esperado.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>RAG</strong> (Red / Amber / Green) é um indicador de saúde do projeto calculado automaticamente.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
            <span className="text-gray-700 dark:text-gray-300"><strong>Verde:</strong> variação ≥ −5% (projeto no prazo).</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-amber-400" />
            <span className="text-gray-700 dark:text-gray-300"><strong>Âmbar:</strong> variação entre −5% e −15% (atenção).</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
            <span className="text-gray-700 dark:text-gray-300"><strong>Vermelho:</strong> variação &lt; −15% (projeto em risco).</span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'evm-metrics',
    category: 'portfolio',
    title: 'Métricas EVM',
    routePattern: '/portfolio',
    keywords: ['evm', 'earned value', 'cpi', 'spi', 'valor agregado', 'orçamento'],
    bodyText:
      'EVM mede desempenho em custo e prazo. CPI mede eficiência de custo, SPI mede eficiência de prazo.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>EVM (Earned Value Management)</strong> combina escopo, prazo e custo para avaliar o desempenho.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li><strong>PV:</strong> valor planejado até agora.</li>
          <li><strong>EV:</strong> valor do trabalho efetivamente realizado.</li>
          <li><strong>AC:</strong> custo real gasto.</li>
          <li><strong>CPI = EV/AC:</strong> &gt; 1 = abaixo do orçamento.</li>
          <li><strong>SPI = EV/PV:</strong> &gt; 1 = adiantado.</li>
        </ul>
      </div>
    ),
  },

  // ── Issues ────────────────────────────────────────────────────────────────────
  {
    id: 'creating-issues',
    category: 'issues',
    title: 'Criando issues',
    keywords: ['issue', 'criar', 'tarefa', 'nova issue'],
    bodyText:
      'Issues são as unidades de trabalho. Crie uma issue clicando em "+ Nova issue" em qualquer tela do projeto.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Issues</strong> representam unidades de trabalho — tarefas, bugs, histórias de usuário, etc.
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Clique em <strong>+ Nova issue</strong> (Board, Backlog ou atalho <strong>N</strong>).</li>
          <li>Preencha título, estado, responsável e prioridade.</li>
          <li>Opcionalmente adicione descrição, labels, datas e subtarefas.</li>
          <li>Clique em <strong>Criar</strong> ou pressione <strong>Enter</strong>.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'issue-relations',
    category: 'issues',
    title: 'Relações entre issues',
    keywords: ['relação', 'dependência', 'bloqueia', 'bloqueada', 'duplicata'],
    bodyText:
      'Issues podem ter relações: bloqueia, bloqueada por, duplicata, relacionada. Relações CPM são usadas para calcular o caminho crítico.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Vincule issues entre si para modelar dependências e relacionamentos.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li><strong>Bloqueia:</strong> esta issue impede outra de começar.</li>
          <li><strong>Bloqueada por:</strong> esta issue depende de outra.</li>
          <li><strong>Duplicata:</strong> marca issues duplicadas.</li>
          <li><strong>Relacionada:</strong> conexão temática sem dependência.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'issue-priorities',
    category: 'issues',
    title: 'Prioridades e tipos',
    keywords: ['prioridade', 'urgente', 'alta', 'média', 'baixa', 'tipo'],
    bodyText:
      'Cada issue tem uma prioridade: Urgente, Alta, Média, Baixa ou Nenhuma.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Use prioridade para classificar e filtrar issues com facilidade.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li><strong>Urgente:</strong> requer atenção imediata.</li>
          <li><strong>Alta:</strong> importante, mas não emergencial.</li>
          <li><strong>Média:</strong> trabalho normal do projeto.</li>
          <li><strong>Baixa:</strong> pode aguardar.</li>
          <li><strong>Nenhuma:</strong> não classificada.</li>
        </ul>
      </div>
    ),
  },

  // ── Modules ───────────────────────────────────────────────────────────────────
  {
    id: 'modules',
    category: 'modules',
    title: 'Agrupando issues com módulos',
    routePattern: '/projects/:projectId/modules',
    keywords: ['módulo', 'agrupar', 'tema', 'funcionalidade'],
    bodyText:
      'Módulos são agrupadores temáticos de issues. Use para organizar por funcionalidade ou área, independente de sprint.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Módulos</strong> agrupam issues por tema ou funcionalidade — por exemplo, "Autenticação", "Relatórios".
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Uma issue pode pertencer a múltiplos módulos.</li>
          <li>Módulos não têm data — diferente de Ciclos, são atemporais.</li>
          <li>Use para organizar o backlog por área de negócio.</li>
        </ul>
      </div>
    ),
  },

  // ── Milestones ────────────────────────────────────────────────────────────────
  {
    id: 'milestones',
    category: 'milestones',
    title: 'Definindo marcos e acompanhando progresso',
    routePattern: '/projects/:projectId/milestones',
    keywords: ['marco', 'milestone', 'entrega', 'data'],
    bodyText:
      'Marcos marcam eventos importantes ou entregas no projeto. Associe issues a marcos para acompanhar o progresso.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Marcos</strong> representam entregas ou eventos importantes com uma data-alvo.
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Acesse <strong>Marcos</strong> no menu do projeto.</li>
          <li>Clique em <strong>+ Novo marco</strong> e defina nome e data.</li>
          <li>Associe issues ao marco para medir o progresso.</li>
        </ol>
      </div>
    ),
  },

  // ── Risks ─────────────────────────────────────────────────────────────────────
  {
    id: 'risks',
    category: 'risks',
    title: 'Registrando e monitorando riscos',
    routePattern: '/projects/:projectId/risks',
    keywords: ['risco', 'probabilidade', 'impacto', 'mitigação'],
    bodyText:
      'Registre riscos com probabilidade, impacto e plano de mitigação. Monitore o status ao longo do projeto.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          A seção de <strong>Riscos</strong> permite registrar e monitorar ameaças ao projeto.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Cada risco tem probabilidade (baixa / média / alta) e impacto.</li>
          <li>Defina um plano de mitigação para cada risco.</li>
          <li>Atualize o status conforme o projeto avança.</li>
        </ul>
      </div>
    ),
  },

  // ── Resources ─────────────────────────────────────────────────────────────────
  {
    id: 'resources',
    category: 'resources',
    title: 'Gerenciando recursos do workspace',
    routePattern: '/workspace/resources',
    keywords: ['recursos', 'membros', 'equipe', 'alocação'],
    bodyText:
      'A seção de Recursos lista os membros do workspace e sua alocação. Use para planejar disponibilidade da equipe.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Recursos</strong> é a visão de pessoas do workspace — quem está disponível e em quais projetos está alocado.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Veja todos os membros do workspace e seus papéis.</li>
          <li>Identifique membros sobrecarregados ou disponíveis.</li>
          <li>Acesse as configurações do workspace para convidar novos membros.</li>
        </ul>
      </div>
    ),
  },

  // ── Workspace ─────────────────────────────────────────────────────────────────
  {
    id: 'workspace-settings',
    category: 'workspace',
    title: 'Configurações do workspace',
    routePattern: '/workspace/settings',
    keywords: ['configurações', 'workspace', 'membros', 'permissões', 'settings'],
    bodyText:
      'Nas configurações do workspace você gerencia membros, papéis, permissões e informações gerais da organização.',
    body: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          As <strong>configurações do workspace</strong> controlam o ambiente geral da organização.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Convidar e remover membros.</li>
          <li>Alterar papéis (Admin, Membro).</li>
          <li>Editar nome e informações do workspace.</li>
        </ul>
      </div>
    ),
  },
]
