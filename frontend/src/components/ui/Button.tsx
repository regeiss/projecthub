import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover disabled:opacity-50',
  secondary:
    'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400',
  ghost:
    'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 disabled:text-gray-300 dark:disabled:text-gray-600',
  danger:
    'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400',
  outline:
    'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:text-gray-300 dark:disabled:text-gray-600',
}

const sizeClasses: Record<string, string> = {
  sm: 'h-7 px-2 text-xs rounded',
  md: 'h-8 px-3 text-sm rounded-md',
  lg: 'h-10 px-4 text-sm rounded-md',
  icon: 'h-8 w-8 rounded-md',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <svg
            className="h-3.5 w-3.5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
