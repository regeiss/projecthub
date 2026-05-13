import { useState, useEffect } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { Settings } from 'lucide-react'
import api from '@/lib/axios'
import { mapIssue } from '@/services/issue.service'
import type { Issue, StateCategory } from '@/types'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectOption {
  id: string
  name: string
}

// ─── Priority display ─────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { symbol: string; className: string }> = {
  urgent: { symbol: '!', className: 'text-red-500' },
  high:   { symbol: '↑', className: 'text-orange-500' },
  medium: { symbol: '→', className: 'text-yellow-500' },
  low:    { symbol: '↓', className: 'text-blue-400' },
  none:   { symbol: '·', className: 'text-gray-400' },
}

// ─── State category options ───────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: StateCategory | ''; label: string }[] = [
  { value: '',           label: 'Todos os status' },
  { value: 'backlog',    label: 'Backlog' },
  { value: 'unstarted',  label: 'Não iniciado' },
  { value: 'started',    label: 'Em andamento' },
  { value: 'completed',  label: 'Concluído' },
  { value: 'cancelled',  label: 'Cancelado' },
]

// ─── Config panel ─────────────────────────────────────────────────────────────

function ConfigPanel({
  draftProject,
  draftCategory,
  projects,
  onProjectChange,
  onCategoryChange,
  onApply,
}: {
  draftProject: string
  draftCategory: string
  projects: ProjectOption[]
  onProjectChange: (v: string) => void
  onCategoryChange: (v: string) => void
  onApply: () => void
}) {
  return (
    <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800 bg-indigo-50/40 dark:bg-indigo-900/10 flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600 dark:text-gray-400 w-16 shrink-0">Projeto</label>
        <select
          value={draftProject}
          onChange={e => onProjectChange(e.target.value)}
          className="flex-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          <option value="">Selecione um projeto…</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600 dark:text-gray-400 w-16 shrink-0">Status</label>
        <select
          value={draftCategory}
          onChange={e => onCategoryChange(e.target.value)}
          className="flex-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          {CATEGORY_OPTIONS.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!draftProject}
          onClick={onApply}
          className="text-xs px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}

// ─── Issue row ────────────────────────────────────────────────────────────────

function IssueRow({ issue }: { issue: Issue }) {
  const prio = PRIORITY_CONFIG[issue.priority] ?? PRIORITY_CONFIG.none
  return (
    <li className="list-none m-0 p-0 flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/30">
      <span
        className={cn('text-xs font-bold w-3 text-center shrink-0', prio.className)}
        title={issue.priority}
      >
        {prio.symbol}
      </span>
      {issue.stateColor && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: issue.stateColor }}
          title={issue.stateName}
        />
      )}
      <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 font-mono">
        #{issue.sequenceId}
      </span>
      <span className="text-xs text-gray-800 dark:text-gray-200 truncate flex-1">
        {issue.title}
      </span>
      {issue.assignee && (
        <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 truncate max-w-[80px]">
          {issue.assignee.name}
        </span>
      )}
    </li>
  )
}

// ─── NodeView component ───────────────────────────────────────────────────────

function IssueListView({ node, updateAttributes, editor }: NodeViewProps) {
  const { projectId, stateCategory, limit } = node.attrs as {
    projectId: string
    stateCategory: string
    limit: number
  }

  const [configOpen, setConfigOpen] = useState(!projectId)
  const [draftProject, setDraftProject] = useState(projectId)
  const [draftCategory, setDraftCategory] = useState(stateCategory)

  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [allIssues, setAllIssues] = useState<Issue[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  // Load projects list once
  useEffect(() => {
    api.get<{ results?: unknown[]; [k: string]: unknown }>('/projects/')
      .then(r => {
        const raw = (r.data.results ?? r.data) as { id: string; name: string }[]
        setProjects(raw.map(p => ({ id: p.id, name: p.name })))
      })
      .catch(() => {/* projects list failing is non-critical */})
  }, [])

  // Load issues whenever projectId changes
  useEffect(() => {
    if (!projectId) { setAllIssues([]); return }
    setIsLoading(true)
    setIsError(false)
    api.get<{ results?: unknown[]; count?: number }>('/issues/', {
      params: { project_id: projectId },
    })
      .then(r => {
        setAllIssues((r.data.results ?? []).map(mapIssue))
      })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [projectId])

  const filtered = allIssues.filter(
    i => !stateCategory || i.stateCategory === stateCategory,
  )
  const issues = filtered.slice(0, limit)

  const selectedProject = projects.find(p => p.id === projectId)
  const categoryLabel = CATEGORY_OPTIONS.find(c => c.value === stateCategory)?.label

  const isEditable = editor.isEditable

  function applyConfig() {
    updateAttributes({ projectId: draftProject, stateCategory: draftCategory })
    setConfigOpen(false)
  }

  return (
    <NodeViewWrapper>
      <div
        className="not-prose my-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden select-none"
        contentEditable={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              📋 {selectedProject ? selectedProject.name : 'Lista de Issues'}
            </span>
            {stateCategory && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {categoryLabel}
              </span>
            )}
          </div>
          {isEditable && (
            <button
              type="button"
              onClick={() => setConfigOpen(v => !v)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              title="Configurar"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Config panel */}
        {configOpen && isEditable && (
          <ConfigPanel
            draftProject={draftProject}
            draftCategory={draftCategory}
            projects={projects}
            onProjectChange={setDraftProject}
            onCategoryChange={setDraftCategory}
            onApply={applyConfig}
          />
        )}

        {/* Body */}
        {!projectId && !configOpen && (
          <div className="px-3 py-4 text-xs text-gray-400 text-center">
            Nenhum projeto selecionado — clique em ⚙ para configurar
          </div>
        )}

        {projectId && isLoading && (
          <div className="px-3 py-4 text-xs text-gray-400 text-center animate-pulse">
            Carregando issues…
          </div>
        )}

        {projectId && isError && (
          <div className="px-3 py-4 text-xs text-red-400 text-center">
            Erro ao carregar issues
          </div>
        )}

        {projectId && !isLoading && !isError && issues.length === 0 && (
          <div className="px-3 py-4 text-xs text-gray-400 text-center">
            Nenhuma issue encontrada
          </div>
        )}

        {projectId && !isLoading && issues.length > 0 && (
          <ul className="list-none m-0 p-0 divide-y divide-gray-100 dark:divide-gray-800">
            {issues.map(issue => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </ul>
        )}

        {/* Footer */}
        {projectId && !isLoading && filtered.length > limit && (
          <div className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-800">
            Mostrando {limit} de {filtered.length} issues
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

// ─── TipTap Node extension ────────────────────────────────────────────────────

export const IssueListExtension = Node.create({
  name: 'issueList',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      projectId:     { default: '' },
      stateCategory: { default: '' },
      limit:         { default: 10 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="issue-list"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'issue-list' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(IssueListView)
  },
})
