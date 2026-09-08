import React from 'react'

export default function StringListEditor({ items, onChange, placeholder }) {
  function updateItem(i, value) {
    const next = [...items]
    next[i] = value
    onChange(next)
  }
  function addItem() { onChange([...items, '']) }
  function removeItem(i) { onChange(items.filter((_, idx) => idx !== i)) }
  function moveItem(i, dir) {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <input
            className="form-input"
            value={item}
            onChange={e => updateItem(i, e.target.value)}
            placeholder={placeholder}
          />
          <button type="button" className="icon-btn" onClick={() => moveItem(i, -1)} disabled={i === 0} title="Monter">↑</button>
          <button type="button" className="icon-btn" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} title="Descendre">↓</button>
          <button type="button" className="icon-btn danger" onClick={() => removeItem(i)} title="Supprimer">🗑️</button>
        </div>
      ))}
      <button type="button" className="fic-btn" style={{ alignSelf: 'flex-start' }} onClick={addItem}>➕ Ajouter</button>
    </div>
  )
}
