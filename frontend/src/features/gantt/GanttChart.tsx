import { useCpmGantt } from '@/hooks/useCpm'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import type { GanttTask } from '@/types'

interface GanttChartProps {
  projectId: string
}

function GanttBar({ task, minDate, totalDays }: { task: GanttTask; minDate: Date; totalDays: number }) {
  const start = new Date(task.start)
  const end = new Date(task.end)
  const offsetDays = (start.getTime() - minDate.getTime()) / 86400000
  const durationDays = (end.getTime() - start.getTime()) / 86400000 + 1
  const leftPct = (offsetDays / totalDays) * 100
  const widthPct = (durationDays / totalDays) * 100

  return (
    <div
      className={`absolute top-1 h-6 rounded-sm ${
        task.isCritical ? 'bg-red-400' : 'bg-indigo-400'
      }`}
      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      title={`${task.name}: ${formatDate(task.start)} — ${formatDate(task.end)}`}
    />
  )
}

export function GanttChart({ projectId }: GanttChartProps) {
  const { data: tasks, isLoading } = useCpmGantt(projectId)

  if (isLoading) return <PageSpinner />
  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Calcule o CPM para ver o Gantt
      </div>
    )
  }

  const dates = tasks.flatMap((t: GanttTask) => [new Date(t.start), new Date(t.end)])
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
  const totalDays = (maxDate.getTime() - minDate.getTime()) / 86400000 + 1

  return (
    <div className="overflow-auto">
      <table className="w-full min-w-[800px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950">
            <th className="w-64 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Tarefa
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Linha do tempo ({formatDate(minDate.toISOString())} —{' '}
              {formatDate(maxDate.toISOString())})
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task: GanttTask) => (
            <tr key={task.id} className="border-b border-gray-100 dark:border-gray-800">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  {task.isCritical && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-red-400" />
                  )}
                  <span
                    className={`truncate ${task.isCritical ? 'font-medium text-red-700' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    {task.name}
                  </span>
                </div>
                <p className="text-gray-400 dark:text-gray-500">
                  {formatDate(task.start)} — {formatDate(task.end)}
                </p>
              </td>
              <td className="relative px-3 py-2">
                <div className="relative h-8 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                  <GanttBar task={task} minDate={minDate} totalDays={totalDays} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
