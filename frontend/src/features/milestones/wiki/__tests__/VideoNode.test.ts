// frontend/src/features/wiki/__tests__/VideoNode.test.ts
import { describe, it, expect } from 'vitest'
import { getEmbedUrl } from '../extensions/VideoNode'

describe('getEmbedUrl', () => {
  it('converts youtube.com/watch URL to embed', () => {
    const result = getEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result).toEqual({ kind: 'iframe', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' })
  })

  it('converts youtu.be short URL to embed', () => {
    const result = getEmbedUrl('https://youtu.be/dQw4w9WgXcQ')
    expect(result).toEqual({ kind: 'iframe', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' })
  })

  it('converts vimeo.com URL to embed', () => {
    const result = getEmbedUrl('https://vimeo.com/123456789')
    expect(result).toEqual({ kind: 'iframe', url: 'https://player.vimeo.com/video/123456789' })
  })

  it('returns video kind for direct video URL', () => {
    const result = getEmbedUrl('https://example.com/video.mp4')
    expect(result).toEqual({ kind: 'video', url: 'https://example.com/video.mp4' })
  })
})
