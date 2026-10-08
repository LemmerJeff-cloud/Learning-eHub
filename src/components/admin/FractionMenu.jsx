import React, { useState, useRef, useEffect } from 'react'

export default function FractionMenu({ onInsert }) {
  const [open, setOpen] = useState(false)
  const [num, setNum]   = useState('')
  const [den, setDen]   = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function insert() {
    if (!num.trim() || !den.trim()) return
    onInsert(num.trim(), den.trim())
    setNum('')
    setDen('')
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={() => setOpen(o => !o)} title="Insérer une fraction">½</button>
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
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); insert() } }}
          />
          <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Dénominateur</label>
          <input
            className="form-input" value={den} onChange={e => setDen(e.target.value)}
            style={{ marginBottom: '0.6rem' }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); insert() } }}
          />
          <button type="button" className="fic-btn" style={{ width: '100%' }} onClick={insert}>Insérer</button>
        </div>
      )}
    </div>
  )
}
