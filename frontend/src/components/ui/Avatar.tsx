import * as RadixAvatar from '@radix-ui/react-avatar'
import { cn, initials } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name: string | null | undefined
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses: Record<string, string> = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full',
        sizeClasses[size],
        className,
      )}
    >
      <RadixAvatar.Image
        src={src ?? undefined}
        alt={name}
        className="h-full w-full object-cover"
      />
      <RadixAvatar.Fallback
        className="flex h-full w-full items-center justify-center bg-indigo-100 dark:bg-indigo-900/40 font-medium text-indigo-700 dark:text-indigo-300"
        delayMs={100}
      >
        {initials(name)}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  )
}

interface AvatarGroupProps {
  members: Array<{ id: string; name: string; avatarUrl?: string | null }>
  max?: number
  size?: AvatarProps['size']
}

export function AvatarGroup({ members, max = 3, size = 'sm' }: AvatarGroupProps) {
  const visible = members.slice(0, max)
  const remaining = members.length - max

  return (
    <div className="flex -space-x-1.5">
      {visible.map((m) => (
        <Avatar
          key={m.id}
          src={m.avatarUrl}
          name={m.name}
          size={size}
          className="ring-2 ring-white dark:ring-gray-900"
        />
      ))}
      {remaining > 0 && (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-900',
            sizeClasses[size],
          )}
        >
          +{remaining}
        </span>
      )}
    </div>
  )
}
