import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { discoveryService } from '@/services/discovery.service'
import type { Idea } from '@/types'

import { FieldBuilder } from './FieldBuilder'

const STATUS_OPTIONS: { value: Idea['status']; label: string }[] = [
  { value: 'new', label: 'Nova' },
  { value: 'reviewing', label: 'Em análise' },
  { value: 'planned', label: 'Planejada' },
  { value: 'building', label: 'Em execução' },
  { value: 'shipped', label: 'Entregue' },
  { value: 'parked', label: 'Estacionada' },
]

function CreateIdeaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [status, setStatus] = useState<Idea['status']>('new')

  const mutation = useMutation({
    mutationFn: () =>
      discoveryService.createIdea({ title: title.trim(), summary: summary.trim() || undefined, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery-ideas'] })
      handleClose()
    },
  })

  function handleClose() {
    setTitle('')
    setSummary('')
    setStatus('new')
    mutation.reset()
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    mutation.mutate()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nova ideia" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="idea-title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Título <span className="text-red-500" aria-hidden>*</span>
          </label>
          <input
            id="idea-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Qual é a ideia?"
            required
            autoFocus
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:ring-amber-900"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="idea-summary" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Resumo
          </label>
          <textarea
            id="idea-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Descreva brevemente a ideia e o problema que ela resolve…"
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:ring-amber-900"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="idea-status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </label>
          <select
            id="idea-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as Idea['status'])}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-amber-900"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {mutation.isError && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            Erro ao criar ideia. Tente novamente.
          </p>
        )}

        <ModalFooter>
          <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={!title.trim() || mutation.isPending}>
            {mutation.isPending ? 'Criando…' : 'Criar ideia'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

export function IdeaForm() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
        <FieldBuilder />
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Criar ideia
        </Button>
      </div>

      <CreateIdeaModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
