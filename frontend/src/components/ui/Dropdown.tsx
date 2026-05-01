import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dropdown = DropdownMenu.Root
export const DropdownTrigger = DropdownMenu.Trigger

interface DropdownContentProps {
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  className?: string
}

export function DropdownContent({
  children,
  align = 'start',
  sideOffset = 4,
  className,
}: DropdownContentProps) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[160px] overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-md dark:shadow-black/40',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-75',
          className,
        )}
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  )
}

interface DropdownItemProps {
  children: React.ReactNode
  onSelect?: () => void
  disabled?: boolean
  danger?: boolean
  icon?: React.ReactNode
  className?: string
}

export function DropdownItem({
  children,
  onSelect,
  disabled,
  danger,
  icon,
  className,
}: DropdownItemProps) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      disabled={disabled}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-sm outline-none',
        'focus:bg-gray-100 dark:focus:bg-gray-800',
        danger
          ? 'text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20'
          : 'text-gray-700 dark:text-gray-300',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {icon && <span className="h-4 w-4 shrink-0">{icon}</span>}
      {children}
    </DropdownMenu.Item>
  )
}

export function DropdownSeparator({ className }: { className?: string }) {
  return (
    <DropdownMenu.Separator
      className={cn('my-1 h-px bg-gray-200 dark:bg-gray-700', className)}
    />
  )
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu.Label className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
      {children}
    </DropdownMenu.Label>
  )
}

interface DropdownCheckItemProps {
  children: React.ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}

export function DropdownCheckItem({
  children,
  checked,
  onCheckedChange,
  className,
}: DropdownCheckItemProps) {
  return (
    <DropdownMenu.CheckboxItem
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 outline-none focus:bg-gray-100 dark:focus:bg-gray-800',
        className,
      )}
    >
      <DropdownMenu.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-indigo-600" />
      </DropdownMenu.ItemIndicator>
      <span className={cn(!checked && 'pl-3.5')}>{children}</span>
    </DropdownMenu.CheckboxItem>
  )
}

export { ChevronRight as DropdownArrow }
