import type { Risk } from '@/types'

interface RiskMatrixProps {
  risks: Risk[]
  onRiskClick: (risk: Risk) => void
}

function cellColor(p: number, i: number): string {
  const score = p * i
  if (score <= 6)  return 'bg-green-300 hover:bg-green-400 dark:bg-green-700 dark:hover:bg-green-600'
  if (score <= 14) return 'bg-amber-300 hover:bg-amber-400 dark:bg-amber-600 dark:hover:bg-amber-500'
  return 'bg-red-400 hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600'
}

const LEVEL_LABELS = ['', 'Muito baixo', 'Baixo', 'Médio', 'Alto', 'Muito alto']

export function RiskMatrix({ risks, onRiskClick }: RiskMatrixProps) {
  const cellRisks: Record<string, Risk[]> = {}
  for (const r of risks) {
    const key = `${r.probability}-${r.impact}`
    if (!cellRisks[key]) cellRisks[key] = []
    cellRisks[key].push(r)
  }

  return (
    <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="mb-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Probabilidade →</div>
      <div className="flex gap-1">
        <div className="flex w-6 items-center justify-center">
          <span
            className="text-xs font-medium text-gray-500 dark:text-gray-400"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Impacto ↑
          </span>
        </div>

        <div>
          <div className="mb-1 grid grid-cols-5 gap-1 pl-[52px]">
            {[1, 2, 3, 4, 5].map((p) => (
              <div key={p} className="w-16 text-center text-[10px] text-gray-400 dark:text-gray-500">
                {p}<br />{LEVEL_LABELS[p].split(' ')[0]}
              </div>
            ))}
          </div>

          {[5, 4, 3, 2, 1].map((impact) => (
            <div key={impact} className="mb-1 flex items-center gap-1">
              <div className="w-12 text-right text-[10px] text-gray-400 dark:text-gray-500 pr-1">
                {impact}<br />{LEVEL_LABELS[impact].split(' ')[0]}
              </div>

              {[1, 2, 3, 4, 5].map((prob) => {
                const key  = `${prob}-${impact}`
                const cell = cellRisks[key] ?? []
                return (
                  <div
                    key={prob}
                    className={`relative flex h-16 w-16 flex-col items-center justify-center rounded transition-colors ${cellColor(prob, impact)}`}
                  >
                    <span className="absolute top-0.5 right-1 text-[9px] text-gray-500 dark:text-gray-400 font-mono">
                      {prob * impact}
                    </span>

                    <div className="flex flex-wrap gap-0.5 justify-center px-1">
                      {cell.slice(0, 6).map((r) => (
                        <button
                          key={r.id}
                          title={`${r.title} (score ${r.score})`}
                          onClick={() => onRiskClick(r)}
                          className="h-4 w-4 rounded-full bg-gray-700 text-[8px] text-white flex items-center justify-center hover:bg-indigo-600 transition-colors"
                        >
                          {r.title.charAt(0).toUpperCase()}
                        </button>
                      ))}
                      {cell.length > 6 && (
                        <span className="text-[9px] text-gray-500 dark:text-gray-400">+{cell.length - 6}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-green-300 dark:bg-green-700" />
          Baixo (≤6)
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-amber-300 dark:bg-amber-600" />
          Médio (7-14)
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-red-400 dark:bg-red-700" />
          Alto (≥15)
        </div>
      </div>
    </div>
  )
}
