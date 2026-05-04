import { useState } from 'react'
import { X, RotateCcw, Clock } from 'lucide-react'
import { useWikiPageVersions, useRestoreWikiVersion } from '@/hooks/useWiki'
import { relativeTime, cn } from '@/lib/utils'
import type { WikiPageVersion } from '@/types'

// ─── Text extraction (inline to avoid heavy editor imports in this panel) ─────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(node: any): string {
  if (!node) return ''
  if (node.type === 'text') return node.text ?? ''
  if (Array.isArray(node.content)) return node.content.map(extractText).join('\n')
  return ''
}

type DiffLine = { type: 'equal' | 'added' | 'removed'; text: string }

function lineDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n').filter(l => l.trim() !== '')
  const b = newText.split('\n').filter(l => l.trim() !== '')
  const m = a.length
  const n = b.length

  // Build LCS DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'equal', text: a[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', text: b[j - 1] })
      j--
    } else {
      result.unshift({ type: 'removed', text: a[i - 1] })
      i--
    }
  }
  return result
}

// ─── Diff stats ───────────────────────────────────────────────────────────────

function DiffStats({ lines }: { lines: DiffLine[] }) {
  const added = lines.filter(l => l.type === 'added').length
  const removed = lines.filter(l => l.type === 'removed').length
  if (added === 0 && removed === 0) return null
  return (
    <div className="flex gap-2 text-[10px] font-mono">
      {added > 0 && <span className="text-green-600 dark:text-green-400">+{added}</span>}
      {removed > 0 && <span className="text-red-500 dark:text-red-400">−{removed}</span>}
    </div>
  )
}

// ─── Diff view ────────────────────────────────────────────────────────────────

function DiffView({ version, currentContent }: { version: WikiPageVersion; currentContent: object | null }) {
  const versionText = extractText(version.content)
  const currentText = extractText(currentContent ?? {})
  const lines = lineDiff(versionText, currentText)

  const hasChanges = lines.some(l => l.type !== 'equal')

  if (!hasChanges) {
    return (
      <div className="px-4 py-6 text-xs text-gray-400 text-center">
        Sem diferenças em relação à versão atual
      </div>
    )
  }

  return (
    <div className="font-mono text-[11px] leading-5">
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            'flex gap-2 px-3 py-0.5',
            line.type === 'added' && 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300',
            line.type === 'removed' && 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300',
            line.type === 'equal' && 'text-gray-500 dark:text-gray-400',
          )}
        >
          <span className="shrink-0 w-3 select-none text-center opacity-60">
            {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
          </span>
          <span className="break-words min-w-0">{line.text}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Version item ─────────────────────────────────────────────────────────────

function VersionItem({
  version,
  isSelected,
  isCurrent,
  currentContent,
  onSelect,
  onRestore,
  restoring,
}: {
  version: WikiPageVersion
  isSelected: boolean
  isCurrent: boolean
  currentContent: object | null
  onSelect: () => void
  onRestore: () => void
  restoring: boolean
}) {
  return (
    <div className={cn(
      'border-b border-gray-100 dark:border-gray-800 last:border-0',
    )}>
      {/* Version header — always visible */}
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
          isSelected
            ? 'bg-indigo-50 dark:bg-indigo-900/20'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
        )}
      >
        <span className={cn(
          'mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
          isCurrent
            ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
        )}>
          v{version.versionNumber}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {relativeTime(version.createdAt)}
            </span>
            {isCurrent && (
              <span className="text-[9px] uppercase tracking-wide font-semibold text-indigo-500 dark:text-indigo-300 ml-1">
                atual
              </span>
            )}
          </div>
          {version.createdByName && (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
              {version.createdByName}
            </div>
          )}
          {version.changeSummary && (
            <div className="text-[10px] text-gray-500 dark:text-gray-400 italic mt-0.5 truncate">
              "{version.changeSummary}"
            </div>
          )}
        </div>
      </button>

      {/* Expanded diff area */}
      {isSelected && !isCurrent && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          <div className="overflow-auto max-h-64">
            <DiffView version={version} currentContent={currentContent} />
          </div>
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button
              type="button"
              disabled={restoring}
              onClick={onRestore}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              {restoring ? 'Restaurando…' : 'Restaurar esta versão'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface WikiVersionPanelProps {
  pageId: string
  currentContent: object | null
  onClose: () => void
}

export function WikiVersionPanel({ pageId, currentContent, onClose }: WikiVersionPanelProps) {
  const { data: versions = [], isLoading } = useWikiPageVersions(pageId)
  const restore = useRestoreWikiVersion()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const latestVersionNumber = versions[0]?.versionNumber ?? null

  function handleRestore(versionId: string) {
    restore.mutate(
      { pageId, versionId },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="flex flex-col h-full w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Histórico de versões
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Fechar histórico"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="px-4 py-6 text-xs text-gray-400 text-center animate-pulse">
            Carregando versões…
          </div>
        )}

        {!isLoading && versions.length === 0 && (
          <div className="px-4 py-6 text-xs text-gray-400 text-center">
            Nenhuma versão salva ainda.
            <br />
            <span className="text-[10px] mt-1 block text-gray-300 dark:text-gray-600">
              Versões são criadas a cada salvamento de conteúdo.
            </span>
          </div>
        )}

        {!isLoading && versions.length > 0 && (
          <>
            {/* Current state pseudo-entry */}
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 bg-indigo-50/50 dark:bg-indigo-900/10">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200">
                atual
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Versão em edição</span>
            </div>

            {versions.map(v => (
              <VersionItem
                key={v.id}
                version={v}
                isSelected={selectedId === v.id}
                isCurrent={v.versionNumber === latestVersionNumber}
                currentContent={currentContent}
                onSelect={() => setSelectedId(prev => prev === v.id ? null : v.id)}
                onRestore={() => handleRestore(v.id)}
                restoring={restore.isPending}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
