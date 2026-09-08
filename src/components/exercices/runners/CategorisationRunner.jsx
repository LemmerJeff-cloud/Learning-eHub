import React, { useState } from 'react'

export default function CategorisationRunner({ exercice, value, onChange, disabled, detail }) {
  const items = exercice.options?.items || []
  const categories = exercice.options?.categories || []
  const placements = value?.placements || {}
  const [picked, setPicked] = useState(null)

  const unplaced = items.filter(i => !placements[i.id])

  function pick(itemId) {
    if (disabled) return
    setPicked(picked === itemId ? null : itemId)
  }

  function place(categoryId) {
    if (disabled || !picked) return
    onChange({ placements: { ...placements, [picked]: categoryId } })
    setPicked(null)
  }

  function unplace(itemId) {
    if (disabled) return
    const next = { ...placements }
    delete next[itemId]
    onChange({ placements: next })
  }

  function chipStyle(itemId) {
    const base = { padding: '0.3rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem', cursor: disabled ? 'default' : 'pointer', border: '1px solid var(--border)' }
    if (detail && itemId in detail) {
      return { ...base, background: detail[itemId] ? 'rgba(76,175,80,0.12)' : 'rgba(239,68,68,0.1)', borderColor: detail[itemId] ? 'rgba(76,175,80,0.4)' : 'rgba(239,68,68,0.4)' }
    }
    if (picked === itemId) return { ...base, background: 'var(--navy-light)', borderColor: 'var(--navy)' }
    return base
  }

  return (
    <div>
      <div style={{ marginBottom: '0.6rem' }}>
        <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Éléments à placer</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minHeight: '2rem' }}>
          {unplaced.length === 0 && <span style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>Tous les éléments sont placés.</span>}
          {unplaced.map(item => (
            <button key={item.id} type="button" style={chipStyle(item.id)} onClick={() => pick(item.id)}>{item.label}</button>
          ))}
        </div>
      </div>

      <div className="tiles-grid">
        {categories.map(cat => (
          <div
            key={cat.id}
            className="module-tile"
            style={{ cursor: picked && !disabled ? 'pointer' : 'default' }}
            onClick={() => place(cat.id)}
          >
            <strong>{cat.label}</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
              {items.filter(i => placements[i.id] === cat.id).map(item => (
                <button
                  key={item.id} type="button" style={chipStyle(item.id)}
                  onClick={e => { e.stopPropagation(); unplace(item.id) }}
                >
                  {item.label} {!disabled && '✕'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
