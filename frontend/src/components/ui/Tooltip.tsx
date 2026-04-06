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
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={4}
          className={cn(
            'z-50 max-w-xs rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-md',
            'animate-in fade-in-0 zoom-in-95',
            className,
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-gray-900" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
