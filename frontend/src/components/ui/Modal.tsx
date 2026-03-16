import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-5xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 animate-in fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2',
            'rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl dark:shadow-black/40',
            'animate-in fade-in-0 zoom-in-95',
            'max-h-[90vh] overflow-y-auto',
            sizeClasses[size],
            className,
          )}
        >
          {(title || description) && (
            <div className="mb-4">
              {title && (
                <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {title}
                </Dialog.Title>
              )}
              {description && (
                <Dialog.Description className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {description}
                </Dialog.Description>
              )}
            </div>
          )}

          <Dialog.Close
            className="absolute right-4 top-4 rounded-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Dialog.Close>

          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mt-6 flex justify-end gap-2', className)}>
      {children}
    </div>
  )
}
