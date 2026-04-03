import Heading from '@tiptap/extension-heading'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export const HeadingWithId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.id) return {}
          return { id: attributes.id }
        },
        parseHTML: (element) => element.getAttribute('id'),
      },
    }
  },

  onUpdate() {
    const { state, view } = this.editor
    const { tr } = state
    let changed = false
    const seen = new Map<string, number>()  // track duplicate slugs

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const text = node.textContent
        const base = `heading-${slugify(text) || 'untitled'}`
        const count = seen.get(base) ?? 0
        seen.set(base, count + 1)
        const id = count === 0 ? base : `${base}-${count}`
        if (node.attrs.id !== id) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, id })
          changed = true
        }
      }
    })

    if (changed) {
      view.dispatch(tr)
    }
  },
})
