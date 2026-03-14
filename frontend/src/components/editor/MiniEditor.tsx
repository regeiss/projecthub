import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { cn } from '@/lib/utils'

interface MiniEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}

export function MiniEditor({ value, onChange, placeholder, className }: MiniEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? 'Escreva algo…' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange?.(editor.getText()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] p-2',
      },
    },
  })

  return (
    <div className={cn('rounded-md border border-gray-200 bg-white', className)}>
      <EditorContent editor={editor} />
    </div>
  )
}
