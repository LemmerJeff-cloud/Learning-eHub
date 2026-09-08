import React from 'react'

export default function ReponseNumeriqueRunner({ exercice, value, onChange, disabled }) {
  const unite = exercice.correction?.unite
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <input
        className="form-input"
        value={value?.brut || ''}
        disabled={disabled}
        onChange={e => onChange({ brut: e.target.value })}
        placeholder="ex : 12,5"
        style={{ maxWidth: '160px' }}
      />
      {unite && <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{unite}</span>}
    </div>
  )
}
