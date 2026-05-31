import { Button } from '@/components/ui/Button'
import { Modal, ModalFooter } from '@/components/ui/Modal'

interface ApplySprintPlanModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isSubmitting?: boolean
  summary: {
    issuesAddedToCycle: number
    assigneeChanges: number
    estimateDayChanges: number
    estimatePointChanges: number
  }
}

export function ApplySprintPlanModal({
  open,
  onClose,
  onConfirm,
  isSubmitting = false,
  summary,
}: ApplySprintPlanModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Aplicar plano do sprint" size="md">
      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
        <p>{summary.issuesAddedToCycle} issues serao adicionadas ao ciclo</p>
        <p>{summary.assigneeChanges} atribuicoes serao atualizadas</p>
        <p>{summary.estimateDayChanges} estimativas em dias serao atualizadas</p>
        <p>{summary.estimatePointChanges} estimativas em pontos serao atualizadas</p>
      </div>
      <ModalFooter>
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" loading={isSubmitting} onClick={onConfirm}>
          Aplicar plano
        </Button>
      </ModalFooter>
    </Modal>
  )
}
