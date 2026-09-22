import Image from '@tiptap/extension-image'

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent(),
      width: {
        default: null,
        parseHTML: element => element.style.width || element.getAttribute('width') || null,
        renderHTML: attributes => {
          if (!attributes.width) return {}
          return { style: `width: ${attributes.width}` }
        },
      },
    }
  },
})

export const IMAGE_SIZE_OPTIONS = [
  { label: '25%', width: '25%' },
  { label: '50%', width: '50%' },
  { label: '75%', width: '75%' },
  { label: 'Pleine largeur', width: null },
]
