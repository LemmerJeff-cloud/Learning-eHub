import React from 'react'

export default function VraiFauxRunner({ value, onChange, disabled }) {
  const valeur = value?.valeur ?? null
  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <button type="button" className={`fic-btn ${valeur === true ? 'active' : ''}`} disabled={disabled} onClick={() => onChange({ valeur: true })}>Vrai</button>
      <button type="button" className={`fic-btn ${valeur === false ? 'active' : ''}`} disabled={disabled} onClick={() => onChange({ valeur: false })}>Faux</button>
    </div>
  )
}
