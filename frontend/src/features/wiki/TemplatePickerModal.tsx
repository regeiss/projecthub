import { FileText } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { WIKI_TEMPLATES } from './templates'
import type { WikiTemplate } from './templates'

interface TemplatePickerModalProps {
  open: boolean
  onClose: () => void
  onCreate: (template: WikiTemplate | null) => void
  loading?: boolean
}

export function TemplatePickerModal({
  open,
  onClose,
  onCreate,
  loading,
}: TemplatePickerModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Nova página" size="sm">
      <div className="space-y-1.5">
        {/* Blank page */}
        <button
          type="button"
          disabled={loading}
          onClick={() => onCreate(null)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-left transition-colors',
            'hover:border-primary/50 hover:bg-primary/5 dark:hover:border-primary/40 dark:hover:bg-primary/10',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Página em branco</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Começa do zero</p>
          </div>
        </button>

        {/* Separator */}
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center px-4">
            <div className="w-full border-t border-gray-100 dark:border-gray-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white dark:bg-gray-900 px-2 text-xs text-gray-400 dark:text-gray-500">
              Modelos
            </span>
          </div>
        </div>

        {/* Template cards */}
        {WIKI_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            disabled={loading}
            onClick={() => onCreate(tpl)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-left transition-colors',
              'hover:border-primary/50 hover:bg-primary/5 dark:hover:border-primary/40 dark:hover:bg-primary/10',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-xl leading-none">
              {tpl.emoji}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {tpl.title.replace(' — ', '')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{tpl.description}</p>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
