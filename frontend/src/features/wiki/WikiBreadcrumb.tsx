import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Ancestor {
  id: string
  title: string
}

interface WikiBreadcrumbProps {
  spaceName: string
  spaceId?: string
  ancestors: Ancestor[]
  currentTitle: string
  className?: string
}

export function WikiBreadcrumb({
  spaceName,
  ancestors,
  currentTitle,
  className,
}: WikiBreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 flex-wrap', className)}
    >
      <span className="text-gray-500 dark:text-gray-400 font-medium">{spaceName}</span>

      {ancestors.map((ancestor) => (
        <span key={ancestor.id} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          <Link
            to={`../wiki/${ancestor.id}`}
            relative="path"
            className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {ancestor.title}
          </Link>
        </span>
      ))}

      <span className="flex items-center gap-1">
        <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span
          aria-current="page"
          className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[200px]"
        >
          {currentTitle}
        </span>
      </span>
    </nav>
  )
}
