import React, { useState, useRef, useEffect } from 'react'

// Réutilisé à la fois pour insérer une nouvelle fraction (bouton toolbar, champs vides)
// et pour modifier une fraction existante (BubbleMenu, champs pré-remplis avec initialNum/
// initialDen) — le bouton déclencheur (label/title) et le texte de validation diffèrent.
export default function FractionMenu({ onInsert, initialNum = '', initialDen = '', label = '½', buttonTitle = 'Insérer une fraction', confirmLabel = 'Insérer' }) {
  const [open, setOpen] = useState(false)
  const [num, setNum]   = useState(initialNum)
  const [den, setDen]   = useState(initialDen)
  const ref = useRef(null)

  useEffect(() => {
    if (open) { setNum(initialNum); setDen(initialDen) }
  }, [open, initialNum, initialDen])

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function confirm() {
    if (!num.trim() || !den.trim()) return
    onInsert(num.trim(), den.trim())
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={() => setOpen(o => !o)} title={buttonTitle}>{label}</button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 20,
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          padding: '0.7rem', width: '170px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Numérateur</label>
          <input
            className="form-input" value={num} onChange={e => setNum(e.target.value)}
            style={{ marginBottom: '0.5rem' }} autoFocus
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirm() } }}
          />
          <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Dénominateur</label>
          <input
            className="form-input" value={den} onChange={e => setDen(e.target.value)}
            style={{ marginBottom: '0.6rem' }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirm() } }}
          />
          <button type="button" className="fic-btn" style={{ width: '100%' }} onClick={confirm}>{confirmLabel}</button>
        </div>
      )}
    </div>
  )
}
