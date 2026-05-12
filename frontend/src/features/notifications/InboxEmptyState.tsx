import type { ComponentType } from 'react'
import { Inbox, AtSign, UserCheck, Eye, Archive, FolderKanban } from 'lucide-react'

type FilterType = 'all' | 'unread' | 'mentions' | 'assigned' | 'watching' | 'archived' | 'project'

const CONFIG: Record<FilterType, { icon: ComponentType<{ className?: string }>; message: string }> = {
  all: { icon: Inbox, message: 'Você está em dia 👌' },
  unread: { icon: Inbox, message: 'Você está em dia 👌' },
  mentions: { icon: AtSign, message: 'Nenhuma menção recente' },
  assigned: { icon: UserCheck, message: 'Nenhuma atribuição nova' },
  watching: { icon: Eye, message: 'Nenhuma atividade nos itens que você observa' },
  archived: { icon: Archive, message: 'Nenhuma notificação arquivada' },
  project: { icon: FolderKanban, message: 'Sem notificações neste projeto' },
}

interface Props {
  filter: FilterType
}

export function InboxEmptyState({ filter }: Props) {
  const { icon: Icon, message } = CONFIG[filter] ?? CONFIG.all

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <Icon className="h-16 w-16 text-gray-300" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}
