import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpCircle, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { discoveryService } from '@/services/discovery.service'
import type { Idea } from '@/types'

import { IdeaCommentPanel } from './IdeaCommentPanel'
import { InsightPanel } from './InsightPanel'
import { ScorecardPanel } from './ScorecardPanel'

const STATUS_LABELS: Record<Idea['status'], string> = {
  new: 'Nova',
  reviewing: 'Em análise',
  planned: 'Planejada',
  building: 'Em execução',
  shipped: 'Entregue',
  parked: 'Estacionada',
}

const STATUS_COLORS: Record<Idea['status'], string> = {
  new: 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  reviewing: 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  planned: 'border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
  building: 'border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  shipped: 'border-green-300 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300',
  parked: 'border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as [Idea['status'], string][]

function PromoteSection({ idea }: { idea: Idea }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => discoveryService.promoteIdea(idea.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discovery-ideas'] }),
  })

  if (!idea.project || idea.promotedIssue) return null

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/20">
      <p className="text-sm text-green-800 dark:text-green-300">
        Esta ideia está vinculada a um projeto e pode ser promovida como issue.
      </p>
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
      >
        <ArrowUpCircle className="h-4 w-4" />
        {mutation.isPending ? 'Promovendo…' : 'Promover para issue'}
      </button>
    </div>
  )
}

function StatusSelect({ idea }: { idea: Idea }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (status: Idea['status']) => discoveryService.updateIdea(idea.id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discovery-ideas'] }),
  })

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        Status
      </span>
      <select
        value={idea.status}
        onChange={(e) => mutation.mutate(e.target.value as Idea['status'])}
        disabled={mutation.isPending}
        aria-label="Alterar status da ideia"
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-amber-900"
      >
        {STATUS_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  )
}

interface Props {
  idea: Idea | null
  onClose: () => void
}

export function IdeaDrawer({ idea, onClose }: Props) {
  const open = !!idea

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && idea && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.aside
                key={idea.id}
                className={cn(
                  'fixed right-0 top-0 z-50 flex h-full w-[520px] max-w-[95vw] flex-col',
                  'border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950',
                )}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                aria-label={`Detalhes da ideia: ${idea.title}`}
              >
                {/* Header */}
                <div className="flex items-start gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800">
                  <div className="min-w-0 flex-1">
                    <Dialog.Title className="text-lg font-semibold leading-snug text-gray-900 dark:text-gray-100">
                      {idea.title}
                    </Dialog.Title>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-3 py-0.5 text-xs font-medium',
                          STATUS_COLORS[idea.status],
                        )}
                      >
                        {STATUS_LABELS[idea.status]}
                      </span>
                      {idea.scorecard != null && idea.scorecard.score > 0 && (
                        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          Pontuação {idea.scorecard.score.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {idea.summary && (
                      <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        {idea.summary}
                      </p>
                    )}
                  </div>

                  <Dialog.Close
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    aria-label="Fechar painel"
                  >
                    <X className="h-5 w-5" />
                  </Dialog.Close>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                  <StatusSelect idea={idea} />
                  <PromoteSection idea={idea} />
                  <ScorecardPanel ideaId={idea.id} scorecard={idea.scorecard} />
                  <InsightPanel ideaId={idea.id} />
                  <IdeaCommentPanel ideaId={idea.id} />
                </div>
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
