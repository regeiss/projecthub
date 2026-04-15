import { useTheme, type ColorTheme } from './ThemeContext'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

const themes: { id: ColorTheme; label: string; color: string; ring: string }[] = [
  {
    id: 'slate',
    label: 'Slate Blue',
    color: 'bg-blue-600',
    ring: 'ring-blue-600',
  },
  {
    id: 'stone',
    label: 'Warm Violet',
    color: 'bg-violet-600',
    ring: 'ring-violet-600',
  },
  {
    id: 'teal',
    label: 'Teal',
    color: 'bg-teal-600',
    ring: 'ring-teal-600',
  },
]

export function ColorThemeSelector() {
  const { colorTheme, setColorTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label="Tema de cores"
      className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-1"
    >
      {themes.map(({ id, label, color, ring }) => (
        <Tooltip key={id} content={label} side="bottom">
          <button
            onClick={(e) => { setColorTheme(id); (e.currentTarget as HTMLButtonElement).blur() }}
            aria-label={label}
            aria-pressed={colorTheme === id}
            className={cn(
              'h-4 w-4 rounded-full transition-all',
              color,
              colorTheme === id
                ? `ring-2 ring-offset-1 ${ring} ring-offset-gray-100 dark:ring-offset-gray-800 scale-110`
                : 'opacity-50 hover:opacity-80',
            )}
          />
        </Tooltip>
      ))}
    </div>
  )
}
