export const EPIC_PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#f97316', '#14b8a6', '#ec4899', '#84cc16',
]

interface Props {
  value: string | null
  onChange: (color: string) => void
}

export function EpicColorPicker({ value, onChange }: Props) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
        Cor
      </label>
      <div className="flex flex-wrap gap-1.5">
        {EPIC_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="h-5 w-5 rounded-full transition-transform hover:scale-110 focus:outline-none"
            style={{
              backgroundColor: color,
              outline: value === color ? `2px solid ${color}` : 'none',
              outlineOffset: '2px',
            }}
            title={color}
          />
        ))}
      </div>
    </div>
  )
}
