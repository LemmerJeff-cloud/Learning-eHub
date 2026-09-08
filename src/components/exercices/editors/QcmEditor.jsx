import React from 'react'

export default function QcmEditor({ options, correction, onChange }) {
  function updateOption(i, value) {
    const next = [...options]
    next[i] = value
    onChange({ options: next, correction })
  }
  function toggleCorrect(i) {
    const next = correction.includes(i) ? correction.filter(x => x !== i) : [...correction, i].sort((a, b) => a - b)
    onChange({ options, correction: next })
  }
  function addOption() {
    onChange({ options: [...options, ''], correction })
  }
  function removeOption(i) {
    onChange({
      options: options.filter((_, idx) => idx !== i),
      correction: correction.filter(x => x !== i).map(x => x > i ? x - 1 : x),
    })
  }

  return (
    <div className="form-group">
      <label>Choix (cochez les bonnes réponses)</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {options.map((opt, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input type="checkbox" checked={correction.includes(i)} onChange={() => toggleCorrect(i)} title="Bonne réponse" />
            <input className="form-input" value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Choix ${i + 1}`} />
            <button type="button" className="icon-btn danger" onClick={() => removeOption(i)} title="Supprimer">🗑️</button>
          </div>
        ))}
        <button type="button" className="fic-btn" style={{ alignSelf: 'flex-start' }} onClick={addOption}>➕ Ajouter un choix</button>
      </div>
    </div>
  )
}
