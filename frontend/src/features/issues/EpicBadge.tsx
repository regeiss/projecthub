import type { EpicSummary } from '@/types'

interface Props {
  epic: EpicSummary | null
  className?: string
}

export function EpicBadge({ epic, className }: Props) {
  if (!epic) return null
  const color = epic.color ?? '#6366f1'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${className ?? ''}`}
      style={{ backgroundColor: color + '22', color }}
    >
      ● {epic.title}
    </span>
  )
}
