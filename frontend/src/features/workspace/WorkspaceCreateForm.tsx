import { useState, useRef } from 'react'
import { ArrowRight, Upload, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCreateWorkspace } from '@/hooks/useWorkspace'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/types'

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40)
}

interface Props {
  onSuccess: (ws: Workspace) => void
  onCancel?: () => void
}

export function WorkspaceCreateForm({ onSuccess, onCancel }: Props) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const create = useCreateWorkspace()
  const { setWorkspace } = useWorkspaceStore()

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setName(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugTouched(true)
    setSlug(slugify(e.target.value))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f?.type.startsWith('image/')) setLogoFile(f)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Informe o nome do workspace.')
      return
    }
    create.mutate(
      { name: name.trim(), slug: slug || undefined },
      {
        onSuccess: (ws) => {
          setWorkspace(ws)
          onSuccess(ws)
        },
        onError: () => setError('Erro ao criar workspace. Tente novamente.'),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Nomeie seu workspace
        </h2>
        <p className="mt-1.5 text-sm text-gray-500">
          Este é o espaço central para seus projetos e equipe.
        </p>
      </div>

      <Input
        label="Nome do workspace"
        value={name}
        onChange={handleNameChange}
        placeholder="Ex: Coordenadoria de TI"
        required
        autoFocus
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Slug da URL
        </label>
        <div
          className={cn(
            'flex rounded-md border overflow-hidden transition-shadow',
            'border-gray-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500',
          )}
        >
          <span className="flex items-center px-3 bg-gray-50 border-r border-gray-300 text-sm text-gray-500 whitespace-nowrap select-none">
            projecthub.app/
          </span>
          <input
            value={slug}
            onChange={handleSlugChange}
            placeholder="meu-workspace"
            className="flex-1 h-8 px-3 text-sm bg-white text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
        {slug && (
          <p className="text-xs text-gray-400">
            projecthub.app/<span className="text-gray-600">{slug}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Logo{' '}
          <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'h-20 rounded-md border-2 border-dashed cursor-pointer',
            'flex flex-col items-center justify-center gap-1.5 transition-colors',
            dragOver
              ? 'border-indigo-400 bg-indigo-50'
              : logoFile
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-gray-400 bg-gray-50',
          )}
        >
          {logoFile ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <span className="truncate max-w-[200px]">{logoFile.name}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLogoFile(null) }}
                className="text-green-500 hover:text-green-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">
                arraste um arquivo ou clique para selecionar
              </span>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className={cn('flex pt-1', onCancel ? 'justify-end gap-2' : 'justify-end')}>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={create.isPending} size={onCancel ? 'md' : 'lg'}>
          {onCancel ? 'Criar workspace' : 'Próximo'}
          {!onCancel && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  )
}
