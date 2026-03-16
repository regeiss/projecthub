import type { Priority, IssueSize } from '@/types'

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  urgent: { label: 'U', bg: 'bg-red-500/15',    text: 'text-red-500',    border: 'border-red-500/40' },
  high:   { label: 'H', bg: 'bg-orange-500/15',  text: 'text-orange-500', border: 'border-orange-500/40' },
  medium: { label: 'M', bg: 'bg-yellow-500/15',  text: 'text-yellow-500', border: 'border-yellow-500/40' },
  low:    { label: 'L', bg: 'bg-blue-400/15',    text: 'text-blue-400',   border: 'border-blue-400/40' },
}

const SIZE_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  xs: { bg: 'bg-gray-400/15',    text: 'text-gray-400',    border: 'border-gray-400/40' },
  s:  { bg: 'bg-purple-500/15',  text: 'text-purple-400',  border: 'border-purple-500/40' },
  m:  { bg: 'bg-amber-500/15',   text: 'text-amber-500',   border: 'border-amber-500/40' },
  l:  { bg: 'bg-blue-500/15',    text: 'text-blue-400',    border: 'border-blue-500/40' },
  xl: { bg: 'bg-indigo-500/15',  text: 'text-indigo-400',  border: 'border-indigo-500/40' },
}

export function PriorityCapsule({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority]
  if (!cfg) return null
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}
      aria-label={`Prioridade: ${priority}`}
    >
      {cfg.label}
    </span>
  )
}

export function SizeCapsule({ size }: { size: IssueSize | null | undefined }) {
  if (!size) return null
  const cfg = SIZE_CONFIG[size]
  if (!cfg) return null
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}
      aria-label={`Tamanho: ${size.toUpperCase()}`}
    >
      {size.toUpperCase()}
    </span>
  )
}
