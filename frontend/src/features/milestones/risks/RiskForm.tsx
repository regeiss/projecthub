import { useState } from 'react'
import { useCreateRisk, useUpdateRisk } from '@/hooks/useRisks'
import { useProjectMembers } from '@/hooks/useProjects'
import type { Risk, RiskCategory, RiskStatus, RiskResponseType } from '@/types'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const CATEGORIES: { value: RiskCategory; label: string }[] = [
  { value: 'technical',   label: 'Técnico' },
  { value: 'schedule',    label: 'Prazo' },
  { value: 'cost',        label: 'Custo' },
  { value: 'resource',    label: 'Recurso' },
  { value: 'external',    label: 'Externo' },
  { value: 'stakeholder', label: 'Stakeholder' },
]

const STATUSES: { value: RiskStatus; label: string }[] = [
  { value: 'identified', label: 'Identificado' },
  { value: 'analyzing',  label: 'Em análise' },
  { value: 'mitigating', label: 'Mitigando' },
  { value: 'monitoring', label: 'Monitorando' },
  { value: 'closed',     label: 'Fechado' },
  { value: 'accepted',   label: 'Aceito' },
  { value: 'occurred',   label: 'Ocorreu' },
]

const RESPONSE_TYPES: { value: RiskResponseType; label: string }[] = [
  { value: 'avoid',    label: 'Evitar' },
  { value: 'transfer', label: 'Transferir' },
  { value: 'mitigate', label: 'Mitigar' },
  { value: 'accept',   label: 'Aceitar' },
]

const SCORE_LABELS = ['', 'Muito baixo', 'Baixo', 'Médio', 'Alto', 'Muito alto']

interface RiskFormProps {
  projectId: string
  open: boolean
  onClose: () => void
  risk?: Risk
}

export function RiskForm({ projectId, open, onClose, risk }: RiskFormProps) {
  const isEdit = !!risk
  const { data: members = [] } = useProjectMembers(projectId)
  const create = useCreateRisk(projectId)
  const update = useUpdateRisk(projectId)

  const [title,           setTitle]           = useState(risk?.title ?? '')
  const [description,     setDescription]     = useState(risk?.description ?? '')
  const [category,        setCategory]        = useState<RiskCategory>(risk?.category ?? 'technical')
  const [probability,     setProbability]     = useState(risk?.probability ?? 3)
  const [impact,          setImpact]          = useState(risk?.impact ?? 3)
  const [status,          setStatus]          = useState<RiskStatus>(risk?.status ?? 'identified')
  const [responseType,    setResponseType]    = useState<RiskResponseType | ''>(risk?.responseType ?? '')
  const [ownerId,         setOwnerId]         = useState(risk?.ownerId ?? '')
  const [mitigationPlan,  setMitigationPlan]  = useState(risk?.mitigationPlan ?? '')
  const [contingencyPlan, setContingencyPlan] = useState(risk?.contingencyPlan ?? '')
  const [dueDate,         setDueDate]         = useState(risk?.dueDate ?? '')

  const previewScore = probability * impact

  function scoreColor(s: number) {
    if (s <= 6)  return 'text-green-600 bg-green-50'
    if (s <= 14) return 'text-amber-600 bg-amber-50'
    return 'text-red-600 bg-red-50'
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      title,
      description: description || undefined,
      category,
      probability,
      impact,
      status,
      responseType: (responseType || undefined) as RiskResponseType | undefined,
      ownerId: ownerId || undefined,
      mitigationPlan:  mitigationPlan  || undefined,
      contingencyPlan: contingencyPlan || undefined,
      dueDate: dueDate || undefined,
    }
    if (isEdit && risk) {
      update.mutate({ riskId: risk.id, data }, { onSuccess: onClose })
    } else {
      create.mutate(data, { onSuccess: onClose })
    }
  }

  const selectCls = "h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar risco' : 'Novo risco'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Descreva o risco brevemente"
          required
          autoFocus
        />

        <Textarea
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Contexto adicional (opcional)"
          rows={3}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as RiskCategory)} className={selectCls}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as RiskStatus)} className={selectCls}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Probabilidade: <span className="font-semibold">{probability}</span> — {SCORE_LABELS[probability]}
            </label>
            <input
              type="range" min={1} max={5} value={probability}
              onChange={(e) => setProbability(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Impacto: <span className="font-semibold">{impact}</span> — {SCORE_LABELS[impact]}
            </label>
            <input
              type="range" min={1} max={5} value={impact}
              onChange={(e) => setImpact(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Score</p>
            <span className={`rounded-full px-4 py-1 text-lg font-bold ${scoreColor(previewScore)}`}>
              {previewScore}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Resposta</label>
            <select value={responseType} onChange={(e) => setResponseType(e.target.value as RiskResponseType | '')} className={selectCls}>
              <option value="">— não definida —</option>
              {RESPONSE_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Responsável</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={selectCls}>
              <option value="">— sem responsável —</option>
              {members.map((m) => (
                <option key={m.id} value={m.memberId}>{m.memberName}</option>
              ))}
            </select>
          </div>
        </div>

        <Textarea
          label="Plano de mitigação"
          value={mitigationPlan}
          onChange={(e) => setMitigationPlan(e.target.value)}
          placeholder="Como reduzir a probabilidade ou impacto deste risco?"
          rows={2}
        />

        <Textarea
          label="Plano de contingência"
          value={contingencyPlan}
          onChange={(e) => setContingencyPlan(e.target.value)}
          placeholder="O que fazer se o risco ocorrer?"
          rows={2}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Data limite</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-8 w-48 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={create.isPending || update.isPending}>
            {isEdit ? 'Salvar' : 'Criar'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
