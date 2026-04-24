import { generateHTML } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'

// Extracts plain text from a TipTap JSON document
export function tiptapToText(json: Record<string, unknown> | null | undefined): string {
  if (!json || typeof json !== 'object') return ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extract(node: any): string {
    if (node.type === 'text') return node.text ?? ''
    if (Array.isArray(node.content)) return node.content.map(extract).join('')
    return ''
  }
  try {
    return extract(json)
  } catch {
    return ''
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tiptapToHtml(json: Record<string, unknown> | null | undefined): string {
  if (!json || typeof json !== 'object' || !('type' in json)) return ''
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return generateHTML(json as any, [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      Table,
      TableRow,
      TableHeader,
      TableCell,
      Link,
      Underline,
    ])
  } catch {
    return ''
  }
}
