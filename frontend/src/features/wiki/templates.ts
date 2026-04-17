export interface WikiTemplate {
  id: string
  title: string
  description: string
  emoji: string
  content: object
}

// ---------------------------------------------------------------------------
// Meeting Notes
// ---------------------------------------------------------------------------
const meeting: WikiTemplate = {
  id: 'meeting',
  title: 'Reunião — ',
  description: 'Participantes, pauta, notas, decisões e ações.',
  emoji: '📋',
  content: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Participantes' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [] }],
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Pauta' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [] }],
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Notas' }],
      },
      { type: 'paragraph', content: [] },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Decisões' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [] }],
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Ações' }],
      },
      {
        type: 'taskList',
        content: [
          {
            type: 'taskItem',
            attrs: { checked: false },
            content: [{ type: 'paragraph', content: [] }],
          },
        ],
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Runbook
// ---------------------------------------------------------------------------
const runbook: WikiTemplate = {
  id: 'runbook',
  title: 'Runbook — ',
  description: 'Procedimento passo a passo para operar ou recuperar um sistema.',
  emoji: '📖',
  content: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Objetivo' }],
      },
      { type: 'paragraph', content: [] },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Pré-requisitos' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [] }],
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Passos' }],
      },
      {
        type: 'orderedList',
        attrs: { start: 1 },
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [] }],
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Rollback' }],
      },
      {
        type: 'orderedList',
        attrs: { start: 1 },
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [] }],
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Troubleshooting' }],
      },
      { type: 'paragraph', content: [] },
    ],
  },
}

// ---------------------------------------------------------------------------
// Tech Decision (ADR)
// ---------------------------------------------------------------------------
const techDecision: WikiTemplate = {
  id: 'tech-decision',
  title: 'Decisão Técnica — ',
  description: 'Contexto, opções avaliadas, decisão e consequências (ADR).',
  emoji: '⚙️',
  content: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Status' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            marks: [{ type: 'bold' }],
            text: 'Proposto',
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Contexto' }],
      },
      { type: 'paragraph', content: [] },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Opções consideradas' }],
      },
      {
        type: 'heading',
        attrs: { level: 3, id: null },
        content: [{ type: 'text', text: 'Opção 1' }],
      },
      { type: 'paragraph', content: [] },
      {
        type: 'heading',
        attrs: { level: 3, id: null },
        content: [{ type: 'text', text: 'Opção 2' }],
      },
      { type: 'paragraph', content: [] },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Decisão' }],
      },
      { type: 'paragraph', content: [] },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Consequências' }],
      },
      {
        type: 'heading',
        attrs: { level: 3, id: null },
        content: [{ type: 'text', text: 'Positivas' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [] }],
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3, id: null },
        content: [{ type: 'text', text: 'Negativas / Riscos' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [] }],
          },
        ],
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Postmortem
// ---------------------------------------------------------------------------
const postmortem: WikiTemplate = {
  id: 'postmortem',
  title: 'Postmortem — ',
  description: 'Análise de incidente: linha do tempo, causa raiz e ações corretivas.',
  emoji: '🔥',
  content: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Resumo' }],
      },
      { type: 'paragraph', content: [] },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Impacto' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Duração: ' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Usuários afetados: ' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Sistemas afetados: ' }],
              },
            ],
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Linha do tempo' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'HH:MM — ' }],
              },
            ],
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Causa raiz' }],
      },
      { type: 'paragraph', content: [] },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Fatores contribuintes' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [] }],
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'Ações corretivas' }],
      },
      {
        type: 'taskList',
        content: [
          {
            type: 'taskItem',
            attrs: { checked: false },
            content: [{ type: 'paragraph', content: [] }],
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 2, id: null },
        content: [{ type: 'text', text: 'O que funcionou bem' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [] }],
          },
        ],
      },
    ],
  },
}

export const WIKI_TEMPLATES: WikiTemplate[] = [meeting, runbook, techDecision, postmortem]
