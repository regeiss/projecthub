import { type ClassValue, clsx } from 'clsx'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function relativeTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR })
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '…'
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function priorityLabel(priority: string): string {
  const map: Record<string, string> = {
    urgent: 'Urgente',
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
    none: 'Sem prioridade',
  }
  return map[priority] ?? priority
}

export function priorityColor(priority: string): string {
  const map: Record<string, string> = {
    urgent: 'text-red-600',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-blue-400',
    none: 'text-gray-400',
  }
  return map[priority] ?? 'text-gray-400'
}

export function stateColor(category: string): string {
  const map: Record<string, string> = {
    completed: 'text-green-600',
    cancelled: 'text-gray-400',
    started: 'text-blue-600',
    unstarted: 'text-gray-500',
    backlog: 'text-gray-400',
  }
  return map[category] ?? 'text-gray-400'
}

/** Calcula sort_order entre dois vizinhos. Retorna null se precisar reindexar. */
export function midpoint(before: number | null, after: number | null): number | null {
  const b = before ?? 0
  const a = after ?? b + 65536
  const mid = (b + a) / 2
  if (Math.abs(mid - b) < 0.001) return null // reindexar necessário
  return mid
}
