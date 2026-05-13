import { useState } from 'react'
import { X, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import { diffWords } from 'diff'
import { useWikiPageVersions, useRestoreWikiVersion } from '@/hooks/useWiki'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { relativeTime } from '@/lib/utils'
import type { WikiPageVersion } from '@/types'

// ---------------------------------------------------------------------------
// Text extraction from TipTap JSON
// ---------------------------------------------------------------------------

function extractText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as Record<string, unknown>
  if (typeof n.text === 'string') return n.text
  if (Array.isArray(n.content)) {
    return (n.content as unknown[])
      .map(extractText)
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

// ---------------------------------------------------------------------------
// Inline word-level diff renderer
// ---------------------------------------------------------------------------

function WordDiff({ oldText, newText }: { oldText: string; newText: string }) {
  const parts = diffWords(oldText || '', newText || '')
  if (parts.length === 1 && !parts[0].added && !parts[0].removed) {
    return (
      <p className="text-xs text-gray-400 dark:text-gray-500 italic">Sem diferenças no conteúdo</p>
    )
  }
  return (
    <p className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        part.added ? (
          <mark
            key={i}
            className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 not-italic"
          >
            {part.value}
          </mark>
        ) : part.removed ? (
          <del
            key={i}
            className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 no-underline line-through"
          >
            {part.value}
          </del>
        ) : (
          <span key={i} className="text-gray-500 dark:text-gray-400">
            {part.value}
          </span>
        ),
      )}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Single version row with expandable diff
// ---------------------------------------------------------------------------

function VersionRow({
  version,
  currentTitle,
  currentText,
  pageId,
  onRestored,
}: {
  version: WikiPageVersion
  currentTitle: string
  currentText: string
  pageId: string
  onRestored: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const restore = useRestoreWikiVersion()

  const versionText = extractText(version.content)
  const titleChanged = version.title !== currentTitle
  const contentChanged = versionText !== currentText

  function handleRestore() {
    restore.mutate(
      { pageId, versionId: version.id },
      { onSuccess: onRestored },
    )
  }

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Row header */}
      <button
        className="flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <span className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              v{version.versionNumber}
            </span>
            {version.changeSummary && (
              <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                — {version.changeSummary}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            {version.createdByDetail && (
              <Avatar
                src={version.createdByDetail.avatarUrl}
                name={version.createdByDetail.name}
                size="xs"
                className="shrink-0"
              />
            )}
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {version.createdByDetail?.name ?? '—'} · {relativeTime(version.createdAt)}
            </span>
          </div>
        </div>
      </button>

      {/* Diff + restore */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 space-y-3">
          {/* Title diff */}
          {titleChanged && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Título
              </p>
              <WordDiff oldText={currentTitle} newText={version.title} />
            </div>
          )}

          {/* Content diff */}
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Conteúdo
            </p>
            {contentChanged ? (
              <WordDiff oldText={currentText} newText={versionText} />
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                Sem diferenças no conteúdo
              </p>
            )}
          </div>

          <Button
            size="sm"
            variant="secondary"
            loading={restore.isPending}
            onClick={handleRestore}
            className="w-full"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar esta versão
          </Button>

          {restore.isError && (
            <p className="text-xs text-red-500" role="alert">
              Erro ao restaurar. Tente novamente.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

interface WikiVersionPanelProps {
  pageId: string
  currentTitle: string
  currentContent: object | null
  onClose: () => void
  onRestored: () => void
}

export function WikiVersionPanel({
  pageId,
  currentTitle,
  currentContent,
  onClose,
  onRestored,
}: WikiVersionPanelProps) {
  const { data: versions, isLoading } = useWikiPageVersions(pageId)
  const currentText = extractText(currentContent)

  return (
    <aside
      className="flex h-full w-80 shrink-0 flex-col border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      aria-label="Histórico de versões"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Histórico</span>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Fechar histórico"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <PageSpinner />}

        {!isLoading && (!versions || versions.length === 0) && (
          <div className="flex h-32 flex-col items-center justify-center gap-1 text-center px-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Nenhuma versão salva
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              As versões são criadas automaticamente ao salvar a página.
            </p>
          </div>
        )}

        {versions && versions.length > 0 && (
          <ul>
            {versions.map((v) => (
              <li key={v.id}>
                <VersionRow
                  version={v}
                  currentTitle={currentTitle}
                  currentText={currentText}
                  pageId={pageId}
                  onRestored={onRestored}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
