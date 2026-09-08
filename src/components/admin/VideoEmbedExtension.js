import { Node } from '@tiptap/core'

// Convertit un lien YouTube/Vimeo classique en URL d'embed. Retourne null si le lien
// n'est reconnu par aucun des deux fournisseurs (l'appelant doit alors avertir l'utilisateur).
export function toEmbedUrl(url) {
  let u
  try { u = new URL(url) } catch { return null }

  if (u.hostname.includes('youtu.be')) {
    const id = u.pathname.slice(1)
    if (id) return { provider: 'youtube', src: `https://www.youtube.com/embed/${id}` }
  }
  if (u.hostname.includes('youtube.com')) {
    if (u.pathname === '/watch' && u.searchParams.get('v')) {
      return { provider: 'youtube', src: `https://www.youtube.com/embed/${u.searchParams.get('v')}` }
    }
    if (u.pathname.startsWith('/embed/')) return { provider: 'youtube', src: url }
    if (u.pathname.startsWith('/shorts/')) {
      const id = u.pathname.split('/')[2]
      if (id) return { provider: 'youtube', src: `https://www.youtube.com/embed/${id}` }
    }
  }
  if (u.hostname.includes('vimeo.com')) {
    const id = u.pathname.split('/').filter(Boolean).pop()
    if (id) return { provider: 'vimeo', src: `https://player.vimeo.com/video/${id}` }
  }
  return null
}

// Nœud Tiptap "atomique" pour une vidéo intégrée (lien YouTube/Vimeo ou fichier téléversé).
// Le HTML produit (div[data-video-embed] > iframe|video) est du vrai HTML autonome — il
// s'affiche correctement aussi bien dans l'éditeur que dans le rendu lecture seule
// (BlockBody, hors de tout contexte Tiptap), et se recharge correctement via parseHTML.
export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      provider: { default: 'file' },
    }
  },

  parseHTML() {
    return [{
      tag: 'div[data-video-embed]',
      getAttrs: dom => {
        const provider = dom.getAttribute('data-provider') || 'file'
        const child = dom.querySelector('iframe, video')
        const src = child?.getAttribute('src') || ''
        return src ? { src, provider } : false
      },
    }]
  },

  renderHTML({ node }) {
    const { src, provider } = node.attrs
    const wrapperAttrs = { 'data-video-embed': '', 'data-provider': provider, class: 'video-embed' }
    if (provider === 'file') {
      return ['div', wrapperAttrs, ['video', { src, controls: 'true' }]]
    }
    return ['div', wrapperAttrs, ['iframe', {
      src,
      frameborder: '0',
      allowfullscreen: 'true',
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
    }]]
  },
})
