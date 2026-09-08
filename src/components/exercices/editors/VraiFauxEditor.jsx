import React from 'react'

export default function VraiFauxEditor({ correction, onChange }) {
  return (
    <div className="form-group">
      <label>Réponse correcte</label>
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 400 }}>
          <input type="radio" checked={correction === true} onChange={() => onChange({ options: [], correction: true })} /> Vrai
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 400 }}>
          <input type="radio" checked={correction === false} onChange={() => onChange({ options: [], correction: false })} /> Faux
        </label>
      </div>
    </div>
  )
}
