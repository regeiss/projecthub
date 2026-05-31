import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WatchButtonProps {
  watching: boolean
  loading?: boolean
  onToggle: () => void
  size?: 'sm' | 'xs'
}

export function WatchButton({ watching, loading, onToggle, size = 'sm' }: WatchButtonProps) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      title={watching ? 'Parar de acompanhar' : 'Acompanhar'}
      className={cn(
        'flex items-center gap-1.5 rounded-md border transition-colors disabled:opacity-50',
        size === 'sm'
          ? 'px-2.5 py-1.5 text-xs font-medium'
          : 'px-2 py-1 text-xs',
        watching
          ? 'border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
      )}
    >
      {watching ? (
        <EyeOff className="h-3.5 w-3.5" />
      ) : (
        <Eye className="h-3.5 w-3.5" />
      )}
      {watching ? 'Acompanhando' : 'Acompanhar'}
    </button>
  )
}
