import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { IssueRelation } from '@/types'
import {
  useRelations,
  useAddRelation,
  useDeleteRelation,
  useIssueSearch,
} from '@/hooks/useIssues'

const RELATION_LABELS: Record<string, string> = {
  blocks: 'BLOQUEIA',
  blocked_by: 'BLOQUEADO POR',
  duplicates: 'DUPLICA',
  duplicate_of: 'DUPLICATA DE',
  relates_to: 'RELACIONADO A',
  finish_to_start: 'TERMINA PARA INICIAR',
  start_to_start: 'INICIA PARA INICIAR',
  finish_to_finish: 'TERMINA PARA TERMINAR',
  start_to_finish: 'INICIA PARA TERMINAR',
}

const ALL_TYPES = Object.keys(RELATION_LABELS)

interface IssueRelationListProps {
  projectId: string
  issueId: string
}

interface SelectedIssue {
  id: string
  sequenceId: number
  title: string
  projectName: string
}

export function IssueRelationList({ projectId: _projectId, issueId }: IssueRelationListProps) {
  const { data: relations = [], isLoading, isError } = useRelations(issueId)
  const addRelation = useAddRelation()
  const deleteRelation = useDeleteRelation()

  const [showForm, setShowForm] = useState(false)
  const [relationType, setRelationType] = useState('relates_to')
  const [selectedIssue, setSelectedIssue] = useState<SelectedIssue | null>(null)
  const [lagDays, setLagDays] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: searchResults = [], isLoading: searchLoading } = useIssueSearch(debouncedQuery)
  const filteredResults = searchResults.filter((i) => i.id !== issueId)
  const showDropdown = debouncedQuery.length >= 2 && !selectedIssue

  function resetForm() {
    setRelationType('relates_to')
    setSelectedIssue(null)
    setLagDays(0)
    setSearchInput('')
    setDebouncedQuery('')
    setFormError(null)
  }

  function handleSave() {
    if (!selectedIssue) return
    addRelation.mutate(
      { issueId, relatedIssueId: selectedIssue.id, relationType, lagDays },
      {
        onSuccess: () => {
          setShowForm(false)
          resetForm()
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          const detail =
            err?.response?.data?.detail ?? err?.response?.data?.[0] ?? null
          setFormError(detail ?? 'Erro ao adicionar relação.')
        },
      }
    )
  }

  if (isLoading) {
    return <div className="text-sm text-gray-400 mb-4">Carregando...</div>
  }
  if (isError) {
    return (
      <p className="text-sm text-gray-400 mb-4">
        Não foi possível carregar relações.
      </p>
    )
  }

  // Group by type; only non-empty groups rendered
  const grouped: Record<string, IssueRelation[]> = {}
  for (const type of ALL_TYPES) {
    const items = relations.filter((r) => r.relationType === type)
    if (items.length > 0) grouped[type] = items
  }

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Relações ({relations.length})
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-blue-600 hover:text-blue-700"
          aria-label="Adicionar relação"
        >
          + Adicionar
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="mb-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
          <div className="flex gap-2 flex-wrap items-center">
            <select
              value={relationType}
              onChange={(e) => setRelationType(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              aria-label="Tipo de relação"
            >
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {RELATION_LABELS[t]}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                value={lagDays}
                onChange={(e) =>
                  setLagDays(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-16 text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                aria-label="Dias de atraso"
              />
              <span className="text-xs text-gray-400">dias</span>
            </div>
          </div>

          {/* Issue search */}
          <div className="relative">
            {selectedIssue ? (
              <div className="flex items-center justify-between rounded border border-blue-300 px-2 py-1 bg-blue-50 dark:bg-blue-900/20">
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  #{selectedIssue.sequenceId} {selectedIssue.title}
                </span>
                <button
                  onClick={() => {
                    setSelectedIssue(null)
                    setSearchInput('')
                    setDebouncedQuery('')
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 ml-2"
                  aria-label="Remover seleção de issue"
                >
                  ×
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar issue (#seq ou título)..."
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                aria-label="Buscar issue"
              />
            )}

            {showDropdown && (
              <div
                role="listbox"
                aria-label="Resultados da busca"
                className="absolute top-full left-0 right-0 z-10 mt-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg max-h-48 overflow-y-auto"
              >
                {searchLoading ? (
                  <div className="p-2 text-sm text-gray-400">Buscando...</div>
                ) : filteredResults.length === 0 ? (
                  <div className="p-2 text-sm text-gray-400">
                    Nenhuma issue encontrada.
                  </div>
                ) : (
                  filteredResults.map((issue) => (
                    <button
                      key={issue.id}
                      role="option"
                      aria-selected={false}
                      onClick={() => {
                        setSelectedIssue({
                          id: issue.id,
                          sequenceId: issue.sequenceId,
                          title: issue.title,
                          projectName: issue.projectName,
                        })
                        setSearchInput('')
                        setDebouncedQuery('')
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        #{issue.sequenceId} {issue.title}
                      </div>
                      <div className="text-xs text-gray-400">
                        {issue.projectName}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {formError && (
            <p className="text-xs text-red-500" role="alert">
              {formError}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!selectedIssue || addRelation.isPending}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
            >
              Salvar
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              className="text-sm px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {relations.length === 0 && !showForm && (
        <p className="text-sm text-gray-400">Sem relações.</p>
      )}

      {/* Grouped relation rows */}
      {ALL_TYPES.filter((t) => grouped[t]).map((type) => (
        <div key={type} className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
            {RELATION_LABELS[type]}
          </p>
          {grouped[type].map((rel) => (
            <div key={rel.id} className="flex items-center gap-2 py-0.5">
              <Link
                to={`/projects/${rel.relatedIssueProjectId}/issues/${rel.relatedIssueId}`}
                className="text-sm text-gray-700 dark:text-gray-300 hover:underline flex-1 min-w-0 truncate"
                aria-label={`Relação: #${rel.relatedIssueSequenceId} ${rel.relatedIssueTitle}`}
              >
                #{rel.relatedIssueSequenceId} {rel.relatedIssueTitle}
                <span className="text-xs text-gray-400 ml-1">
                  ({rel.relatedIssueProjectName})
                </span>
              </Link>
              {rel.lagDays > 0 && (
                <span className="text-xs text-gray-400 flex-shrink-0" aria-label={`Atraso de ${rel.lagDays} dias`}>
                  +{rel.lagDays}d
                </span>
              )}
              <button
                onClick={() =>
                  deleteRelation.mutate({ issueId, relationId: rel.id })
                }
                className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0"
                aria-label={`Remover relação #${rel.relatedIssueSequenceId}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ))}

      {deleteRelation.isError && (
        <p className="text-xs text-red-500 mt-1" role="alert">
          Não foi possível remover a relação.
        </p>
      )}
    </div>
  )
}
