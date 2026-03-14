import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, type ThemeMode } from './ThemeContext'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

const options: { mode: ThemeMode; icon: React.ElementType; label: string }[] = [
  { mode: 'light', icon: Sun, label: 'Modo claro' },
  { mode: 'system', icon: Monitor, label: 'Usar preferência do sistema' },
  { mode: 'dark', icon: Moon, label: 'Modo escuro' },
]

export function ThemeToggle() {
  const { mode, setMode } = useTheme()

  return (
    <div
      role="group"
      aria-label="Tema da interface"
      className="flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-0.5 gap-0.5"
    >
      {options.map(({ mode: m, icon: Icon, label }) => (
        <Tooltip key={m} content={label} side="bottom">
          <button
            onClick={() => setMode(m)}
            aria-label={label}
            aria-pressed={mode === m}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded transition-colors',
              mode === m
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      ))}
    </div>
  )
}
