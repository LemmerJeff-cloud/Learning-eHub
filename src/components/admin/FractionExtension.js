import { Node } from '@tiptap/core'

// Nœud Tiptap "atomique" inline pour une fraction avec barre horizontale (numérateur /
// barre / dénominateur), rendue en vrai HTML autonome (span.fraction) — s'affiche
// correctement aussi bien dans l'éditeur que dans le rendu lecture seule (BlockBody),
// même principe que VideoEmbedExtension.js.
export const Fraction = Node.create({
  name: 'fraction',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      num: { default: '' },
      den: { default: '' },
    }
  },

  parseHTML() {
    return [{
      tag: 'span.fraction',
      getAttrs: dom => ({
        num: dom.querySelector('.fraction-num')?.textContent || '',
        den: dom.querySelector('.fraction-den')?.textContent || '',
      }),
    }]
  },

  renderHTML({ node }) {
    const { num, den } = node.attrs
    return ['span', { class: 'fraction' },
      ['span', { class: 'fraction-num' }, num],
      ['span', { class: 'fraction-den' }, den],
    ]
  },
})
