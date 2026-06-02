import type { Shortcut } from './types'

export const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: ['?'], description: 'Abrir Ajuda', group: 'navigation' },
  { keys: ['Esc'], description: 'Fechar modal / painel', group: 'navigation' },

  // Search
  { keys: ['/'], description: 'Busca global', group: 'search' },
  { keys: ['Ctrl', 'K'], description: 'Busca global (alternativo)', group: 'search' },

  // Issues
  { keys: ['N'], description: 'Nova issue (Board / Backlog)', group: 'issues' },

  // Editor
  { keys: ['Ctrl', 'B'], description: 'Negrito', group: 'editor' },
  { keys: ['Ctrl', 'I'], description: 'Itálico', group: 'editor' },
  { keys: ['Ctrl', 'U'], description: 'Sublinhado', group: 'editor' },
  { keys: ['Ctrl', 'Z'], description: 'Desfazer', group: 'editor' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Refazer', group: 'editor' },
  { keys: ['/'], description: 'Inserir bloco (no editor)', group: 'editor' },
]

export const SHORTCUT_GROUP_LABELS: Record<Shortcut['group'], string> = {
  navigation: 'Navegação',
  search: 'Busca',
  issues: 'Issues',
  editor: 'Editor (Wiki)',
}
