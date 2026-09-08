import React, { useMemo } from 'react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function AssociationRunner({ exercice, value, onChange, disabled }) {
  const paires = value?.paires || {}
  const shuffledDroites = useMemo(() => shuffle(exercice.options.map(p => p.droite)), [exercice.id])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {exercice.options.map((pair, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ flex: 1 }}>{pair.gauche}</span>
          <select
            className="form-select"
            value={paires[pair.gauche] || ''}
            disabled={disabled}
            onChange={e => onChange({ paires: { ...paires, [pair.gauche]: e.target.value } })}
          >
            <option value="">— Choisir —</option>
            {shuffledDroites.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}
