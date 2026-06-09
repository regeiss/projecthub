import { useRef, useState, KeyboardEvent } from 'react'
import { Trash2 } from 'lucide-react'
import {
  usePersonalTasks,
  useCreatePersonalTask,
  useUpdatePersonalTask,
  useDeletePersonalTask,
} from '@/hooks/usePersonalTasks'
import { cn } from '@/lib/utils'
import type { PersonalTask } from '@/services/personalTask.service'

// ─── Single task row ──────────────────────────────────────────────────────────

function TaskRow({ task }: { task: PersonalTask }) {
  const update = useUpdatePersonalTask()
  const remove = useDeletePersonalTask()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)

  function toggleDone() {
    update.mutate({ id: task.id, done: !task.done })
  }

  function startEdit() {
    setDraft(task.title)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commitEdit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== task.title) {
      update.mutate({ id: task.id, title: trimmed })
    }
    setEditing(false)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div className="group/task flex items-center gap-2 rounded px-1.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/60">
      {/* Checkbox */}
      <button
        type="button"
        onClick={toggleDone}
        aria-label={task.done ? 'Marcar como pendente' : 'Marcar como concluída'}
        className={cn(
          'shrink-0 h-3.5 w-3.5 rounded border transition-colors',
          task.done
            ? 'bg-indigo-500 border-indigo-500'
            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400',
        )}
      >
        {task.done && (
          <svg viewBox="0 0 10 10" className="h-full w-full text-white" fill="none">
            <path
              className="animate-draw-check"
              d="M2 5l2.5 2.5L8 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Title */}
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={onKeyDown}
          className="flex-1 min-w-0 bg-transparent text-xs text-gray-800 dark:text-gray-200 outline-none border-b border-indigo-400"
        />
      ) : (
        <span
          onDoubleClick={startEdit}
          className={cn(
            'flex-1 min-w-0 text-xs truncate cursor-default',
            task.done
              ? 'line-through text-gray-400 dark:text-gray-600'
              : 'text-gray-700 dark:text-gray-300',
          )}
          title={task.title}
        >
          {task.title}
        </span>
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={() => remove.mutate(task.id)}
        aria-label="Excluir tarefa"
        className="shrink-0 opacity-0 group-hover/task:opacity-100 rounded p-0.5 text-red-400 dark:text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-opacity"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── Add input ────────────────────────────────────────────────────────────────

function AddTaskInput() {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const create = useCreatePersonalTask()

  function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    create.mutate(trimmed, { onSuccess: () => setValue('') })
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
    if (e.key === 'Escape') { setValue(''); setFocused(false) }
  }

  return (
    <div>
      <div className={cn(
        'flex items-center gap-2 rounded px-1.5 py-1 transition-colors',
        focused ? 'bg-gray-50 dark:bg-gray-800/60' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60',
      )}>
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || create.isPending}
          className="shrink-0 flex items-center justify-center h-3.5 w-3.5 rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-40 transition-colors"
          aria-label="Adicionar tarefa"
        >
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none">
            <path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Nova tarefa…"
          className="flex-1 min-w-0 bg-transparent text-xs text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none"
        />
      </div>
      {create.isError && (
        <p className="mt-1 px-1.5 text-[10px] text-red-500">
          Erro ao salvar — verifique a conexão
        </p>
      )}
    </div>
  )
}

// ─── Tile ─────────────────────────────────────────────────────────────────────

export function TaskListTile() {
  const { data: tasks = [], isLoading } = usePersonalTasks()

  const pending   = tasks.filter((t) => !t.done)
  const completed = tasks.filter((t) => t.done)

  return (
    <>
      {/* Header — matches Tile shell style */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Minhas tarefas</span>
        {pending.length > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{pending.length}</span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-6 rounded bg-gray-50 dark:bg-gray-800/60" />
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {pending.map((t) => <TaskRow key={t.id} task={t} />)}

            {completed.length > 0 && (
              <>
                {pending.length > 0 && (
                  <div className="my-2 border-t border-gray-100 dark:border-gray-800" />
                )}
                {completed.map((t) => <TaskRow key={t.id} task={t} />)}
              </>
            )}

            {tasks.length === 0 && (
              <p className="px-1.5 py-3 text-xs text-gray-400 dark:text-gray-600">
                Nenhuma tarefa ainda
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 border-t border-gray-100 dark:border-gray-800 pt-2">
        <AddTaskInput />
      </div>
    </>
  )
}
