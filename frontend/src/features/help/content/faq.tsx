import type { FaqEntry } from './types'

export const FAQ: FaqEntry[] = [
  {
    id: 'delete-project',
    question: 'Por que não consigo excluir um projeto?',
    answer: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Somente administradores do projeto podem excluí-lo. Verifique seu papel nas configurações do projeto. Se você é admin e ainda não consegue, entre em contato com o administrador do workspace.
      </p>
    ),
  },
  {
    id: 'change-state-colors',
    question: 'Como altero as cores dos estados de uma issue?',
    answer: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Acesse <strong>Configurações do projeto → Estados</strong>. Lá você pode criar, editar e reordenar os estados, além de personalizar suas cores.
      </p>
    ),
  },
  {
    id: 'rag-calculation',
    question: 'O que é o status RAG e como é calculado?',
    answer: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <p>RAG (Red/Amber/Green) indica a saúde do projeto no portfólio:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Verde:</strong> % issues concluídas ≥ % tempo decorrido − 5%</li>
          <li><strong>Âmbar:</strong> variação entre −5% e −15%</li>
          <li><strong>Vermelho:</strong> variação abaixo de −15%</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'cpm',
    question: 'O que é CPM / caminho crítico?',
    answer: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        CPM (Critical Path Method) calcula a sequência de issues dependentes que determina a duração mínima do projeto. Issues no caminho crítico não têm folga — qualquer atraso nelas atrasa o projeto inteiro. Veja o caminho crítico destacado em vermelho no Gantt.
      </p>
    ),
  },
  {
    id: 'add-member',
    question: 'Como adiciono um membro a um projeto?',
    answer: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Acesse <strong>Configurações do projeto → Membros → Convidar membro</strong>. O usuário precisa já ser membro do workspace para ser adicionado a um projeto.
      </p>
    ),
  },
  {
    id: 'restore-wiki',
    question: 'Posso restaurar uma página de Wiki excluída?',
    answer: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Páginas arquivadas podem ser restauradas via <strong>Versões</strong> na Wiki. Versões são salvas automaticamente a cada 30 segundos durante a edição, mantendo as últimas 50 versões de cada página.
      </p>
    ),
  },
  {
    id: 'notifications',
    question: 'Como funcionam as notificações?',
    answer: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <p>Você recebe notificações quando:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Uma issue é atribuída a você</li>
          <li>Alguém comenta em uma issue que você criou ou acompanha</li>
          <li>Uma issue que você criou é concluída</li>
          <li>Você é mencionado com @ na Wiki</li>
        </ul>
        <p>Acesse o <strong>Inbox</strong> no menu lateral para ver todas as notificações.</p>
      </div>
    ),
  },
  {
    id: 'cycles-vs-modules',
    question: 'Qual a diferença entre Ciclos e Módulos?',
    answer: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <p><strong>Ciclos</strong> têm data de início e fim — representam sprints ou iterações temporais. Uma issue pode pertencer a apenas um ciclo ativo por vez.</p>
        <p><strong>Módulos</strong> são atemporais e temáticos — agrupam issues por funcionalidade ou área. Uma issue pode pertencer a vários módulos ao mesmo tempo.</p>
      </div>
    ),
  },
  {
    id: 'global-search',
    question: 'Como uso a busca global?',
    answer: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Clique no ícone de lupa no menu lateral ou pressione <strong>/</strong> em qualquer tela. A busca encontra issues e páginas de Wiki em todos os projetos do workspace.
      </p>
    ),
  },
  {
    id: 'dark-mode',
    question: 'O sistema tem modo escuro?',
    answer: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Sim. Acesse <strong>Configurações do usuário → Aparência</strong> para alternar entre tema claro e escuro.
      </p>
    ),
  },
]
