import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { SprintPlanMemberCapacity } from '@/types'

interface SprintCapacityEditorProps {
  capacity: SprintPlanMemberCapacity
  onSave: (value: string | null) => void
  isSaving?: boolean
}

export function SprintCapacityEditor({
  capacity,
  onSave,
  isSaving = false,
}: SprintCapacityEditorProps) {
  const [value, setValue] = useState(capacity.overrideDays ?? '')

  useEffect(() => {
    setValue(capacity.overrideDays ?? '')
  }, [capacity.overrideDays])

  return (
    <div className="space-y-2 rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Capacidade padrao: {capacity.defaultDays}d
      </p>
      <div className="flex items-end gap-2">
        <Input
          label="Override"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Ex: 8.0"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          loading={isSaving}
          onClick={() => onSave(value.trim() ? value : null)}
        >
          Salvar
        </Button>
      </div>
    </div>
  )
}
