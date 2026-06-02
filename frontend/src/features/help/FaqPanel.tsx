import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FAQ } from './content/faq'

export function FaqPanel() {
  const [openId, setOpenId] = useState<string | null>(null)

  function toggle(id: string) {
    setOpenId((current) => (current === id ? null : id))
  }

  return (
    <div>
      <h2 className="mb-6 text-base font-semibold text-gray-900 dark:text-gray-100">
        Perguntas frequentes
      </h2>

      <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-700">
        {FAQ.map((entry) => {
          const isOpen = openId === entry.id
          return (
            <div key={entry.id}>
              <button
                onClick={() => toggle(entry.id)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${entry.id}`}
                className={cn(
                  'flex w-full items-center justify-between gap-4 py-4 text-left text-sm',
                  'text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100 transition-colors',
                )}
              >
                <span className="font-medium">{entry.question}</span>
                {isOpen
                  ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                  : <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />}
              </button>

              {isOpen && (
                <div id={`faq-answer-${entry.id}`} className="pb-4">
                  {entry.answer}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
