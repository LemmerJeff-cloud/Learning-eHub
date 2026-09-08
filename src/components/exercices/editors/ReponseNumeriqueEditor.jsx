import React from 'react'

export default function ReponseNumeriqueEditor({ correction, onChange }) {
  const { valeur = '', tolerance = 0, unite = '' } = correction || {}

  function patch(p) {
    onChange({ options: [], correction: { valeur, tolerance, unite, ...p } })
  }

  return (
    <div className="form-group">
      <label>Réponse correcte</label>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <input
          className="form-input" type="number" step="any"
          value={valeur}
          onChange={e => patch({ valeur: e.target.value === '' ? '' : Number(e.target.value) })}
          placeholder="Valeur" style={{ maxWidth: '140px' }}
        />
        <input
          className="form-input" type="number" step="any" min="0"
          value={tolerance}
          onChange={e => patch({ tolerance: Number(e.target.value) || 0 })}
          placeholder="Tolérance ±" style={{ maxWidth: '140px' }}
        />
        <input className="form-input" value={unite} onChange={e => patch({ unite: e.target.value })} placeholder="Unité (€, %, …)" style={{ maxWidth: '140px' }} />
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>
        Les élèves saisissent leur réponse avec la virgule comme séparateur décimal (ex. 12,5).
      </p>
    </div>
  )
}
