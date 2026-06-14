import { FileText, Link2, MessageSquare, Plus } from 'lucide-react'
import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { discoveryService } from '@/services/discovery.service'
import type { IdeaInsight } from '@/types'

const kindMeta = {
  note: { label: 'Nota', Icon: FileText, color: 'text-blue-600 dark:text-blue-400' },
  link: { label: 'Link', Icon: Link2, color: 'text-purple-600 dark:text-purple-400' },
  feedback: { label: 'Feedback', Icon: MessageSquare, color: 'text-green-600 dark:text-green-400' },
} as const

function InsightItem({ insight }: { insight: IdeaInsight }) {
  const { Icon, label, color } = kindMeta[insight.kind]
  return (
    <li className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {label}
          </span>
        </div>
        <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100">
          {insight.title}
        </p>
      </div>
    </li>
  )
}

interface Props {
  ideaId: string
}

export function InsightPanel({ ideaId }: Props) {
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<IdeaInsight['kind']>('note')
  const [title, setTitle] = useState('')
  const [open, setOpen] = useState(false)

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['discovery-insights', ideaId],
    queryFn: () => discoveryService.listInsights(ideaId),
  })

  const mutation = useMutation({
    mutationFn: () => discoveryService.addInsight(ideaId, { kind, title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery-insights', ideaId] })
      setTitle('')
      setOpen(false)
    },
  })

  return (
    <section
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
      aria-label="Painel de insights"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Insights</h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-expanded={open}
          aria-label="Adicionar insight"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      {open && (
        <div className="mb-3 flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex gap-2">
            {(['note', 'link', 'feedback'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  kind === k
                    ? 'bg-amber-500 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {kindMeta[k].label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Título do insight…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Título do insight"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || mutation.isPending}
            className="self-end rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {mutation.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">Carregando…</p>
      ) : insights.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Nenhum insight registrado ainda. Adicione notas, links ou feedbacks de clientes.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Lista de insights">
          {insights.map((insight) => (
            <InsightItem key={insight.id} insight={insight} />
          ))}
        </ul>
      )}
    </section>
  )
}
