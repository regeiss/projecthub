import { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { cn } from '@/lib/utils'

interface Heading {
  id: string
  text: string
  level: number
}

interface WikiTOCProps {
  editor: Editor | null
  className?: string
}

function extractHeadings(editor: Editor): Heading[] {
  const json = editor.getJSON()
  const headings: Heading[] = []
  for (const node of json.content ?? []) {
    if (node.type === 'heading') {
      const text = (node.content ?? [])
        .filter((n: any) => n.type === 'text')
        .map((n: any) => n.text)
        .join('')
      const id = node.attrs?.id ?? `heading-${text.toLowerCase().replace(/\s+/g, '-')}`
      if (text) headings.push({ id, text, level: node.attrs?.level ?? 1 })
    }
  }
  return headings
}

export function WikiTOC({ editor, className }: WikiTOCProps) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (!editor) return
    const update = () => setHeadings(extractHeadings(editor))
    update()
    editor.on('update', update)
    return () => { editor.off('update', update) }
  }, [editor])

  useEffect(() => {
    if (headings.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )
    for (const h of headings) {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [headings])

  if (!editor || headings.length < 3) return null

  function handleClick(id: string) {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav
      aria-label="Table of contents"
      className={cn('flex flex-col gap-0.5', className)}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        On this page
      </p>
      {headings.map((h) => (
        <button
          key={h.id}
          type="button"
          onClick={() => handleClick(h.id)}
          className={cn(
            'block w-full truncate rounded px-2 py-0.5 text-left text-xs transition-colors',
            h.level === 1 && 'font-medium',
            h.level === 2 && 'pl-4',
            h.level === 3 && 'pl-6',
            activeId === h.id
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
          )}
        >
          {h.text}
        </button>
      ))}
    </nav>
  )
}
