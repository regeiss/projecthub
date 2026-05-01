import * as RadixTooltip from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delayDuration?: number
  className?: string
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={400} skipDelayDuration={300} disableHoverableContent>
      {children}
    </RadixTooltip.Provider>
  )
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  className,
}: TooltipProps) {
  return (
    <RadixTooltip.Root disableHoverableContent>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={4}
          onPointerEnter={(e) => e.stopPropagation()}
          className={cn(
            'z-50 max-w-xs rounded bg-primary px-2 py-1 text-xs text-white shadow-md',
            'pointer-events-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-75',
            className,
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-primary" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
