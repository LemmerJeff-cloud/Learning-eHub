import React from 'react'
import StringListEditor from '../../admin/StringListEditor'

export default function ReponseCourteEditor({ correction, onChange }) {
  const { reponses = [], case_sensible = false, ignorer_espaces = true } = correction || {}

  function patch(p) {
    onChange({ options: [], correction: { reponses, case_sensible, ignorer_espaces, ...p } })
  }

  return (
    <div className="form-group">
      <label>Réponses acceptées</label>
      <StringListEditor items={reponses} onChange={next => patch({ reponses: next })} placeholder="Réponse acceptée" />
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem', fontSize: '0.8rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 400 }}>
          <input type="checkbox" checked={case_sensible} onChange={e => patch({ case_sensible: e.target.checked })} /> Sensible à la casse
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 400 }}>
          <input type="checkbox" checked={ignorer_espaces} onChange={e => patch({ ignorer_espaces: e.target.checked })} /> Ignorer les espaces
        </label>
      </div>
    </div>
  )
}
