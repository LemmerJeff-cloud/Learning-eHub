import { Extension, textInputRule } from '@tiptap/core'

// L'extension Typography ne convertit que "->" (un seul tiret) en flèche — ceci gère
// spécifiquement "-->" (deux tirets, la convention la plus courante) sans laisser de
// tiret résiduel.
export const ArrowInputRule = Extension.create({
  name: 'arrowInputRule',
  addInputRules() {
    return [textInputRule({ find: /-->$/, replace: '→' })]
  },
})
