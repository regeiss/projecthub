import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { discoveryService } from '@/services/discovery.service'
import type { IdeaScorecard } from '@/types/discovery'

interface Props {
  ideaId: string
  scorecard?: IdeaScorecard | null
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
      <input
        type="number"
        min={0}
        max={10}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        aria-label={label}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-amber-900"
      />
    </div>
  )
}

export function ScorecardPanel({ ideaId, scorecard }: Props) {
  const queryClient = useQueryClient()
  const [impact, setImpact] = useState(scorecard?.impact ?? 0)
  const [effort, setEffort] = useState(scorecard?.effort ?? 0)
  const [confidence, setConfidence] = useState(scorecard?.confidence ?? 0)
  const [reach, setReach] = useState(scorecard?.reach ?? 0)

  const mutation = useMutation({
    mutationFn: () =>
      discoveryService.updateScorecard(ideaId, { impact, effort, confidence, reach }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discovery-ideas'] }),
  })

  const previewScore =
    effort > 0 ? Math.round((impact * confidence) / effort * 100) / 100 : 0

  return (
    <section
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
      aria-label="Scorecard de priorização"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Scorecard</h2>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Score: {previewScore.toFixed(2)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ScoreInput label="Impacto (0–10)" value={impact} onChange={setImpact} />
        <ScoreInput label="Esforço (0–10)" value={effort} onChange={setEffort} />
        <ScoreInput label="Confiança (0–10)" value={confidence} onChange={setConfidence} />
        <ScoreInput label="Importância (0–10)" value={reach} onChange={setReach} />
      </div>

      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="mt-4 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
      >
        {mutation.isPending ? 'Salvando…' : 'Salvar scorecard'}
      </button>

      {mutation.isError && (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          Erro ao salvar. Tente novamente.
        </p>
      )}
    </section>
  )
}
