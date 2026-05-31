// frontend/src/features/wiki/extensions/VideoNode.tsx
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

// ─── Embed URL helper — exported for testing ──────────────────────────────────

export function getEmbedUrl(src: string): { kind: 'iframe' | 'video'; url: string } {
  const ytMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return { kind: 'iframe', url: `https://www.youtube.com/embed/${ytMatch[1]}` }

  const vimeoMatch = src.match(/vimeo\.com\/(?:.*\/)?(\d+)/)
  if (vimeoMatch) return { kind: 'iframe', url: `https://player.vimeo.com/video/${vimeoMatch[1]}` }

  return { kind: 'video', url: src }
}

// ─── NodeView ─────────────────────────────────────────────────────────────────

function VideoNodeView({ node }: NodeViewProps) {
  const src: string = node.attrs.src ?? ''
  const embed = getEmbedUrl(src)

  return (
    <NodeViewWrapper>
      <div className="my-2 aspect-video w-full overflow-hidden rounded-md" contentEditable={false}>
        {embed.kind === 'iframe' ? (
          <iframe
            src={embed.url}
            className="w-full h-full"
            allowFullScreen
            title="Vídeo incorporado"
          />
        ) : (
          <video src={embed.url} controls className="w-full h-full" />
        )}
      </div>
    </NodeViewWrapper>
  )
}

// ─── Extension ────────────────────────────────────────────────────────────────

export const VideoExtension = Node.create({
  name: 'video',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: '',
        parseHTML: element => element.getAttribute('data-src'),
        renderHTML: attributes => ({ 'data-src': attributes.src }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="video"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'video' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView)
  },
})
