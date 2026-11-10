import React, { useState, useRef, useEffect } from 'react'

// Icônes Unicode simples (pas besoin d'un nœud Tiptap dédié comme pour Fraction,
// ce ne sont que des caractères de texte insérés tels quels).
const ICONS = [
  { char: '⊕', title: 'Plus dans un cercle' },
  { char: '⊖', title: 'Moins dans un cercle' },
  { char: '⊗', title: 'Multiplié dans un cercle' },
  { char: '⊘', title: 'Interdit' },
  { char: '✓', title: 'Coche' },
  { char: '✗', title: 'Croix' },
  { char: '★', title: 'Étoile' },
  { char: '⚠', title: 'Attention' },
  { char: 'ℹ', title: 'Information' },
  { char: '❗', title: 'Important' },
  { char: '➜', title: 'Flèche' },
  { char: '💡', title: 'Idée' },
]

export default function IconMenu({ onInsert }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={() => setOpen(o => !o)} title="Insérer une icône">⊕</button>
      {open && (
        <div className="tiptap-icon-menu">
          {ICONS.map(icon => (
            <button key={icon.char} type="button" title={icon.title} onClick={() => onInsert(icon.char)}>
              {icon.char}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
