import React from 'react'

export default function ChoixUniqueEditor({ options, correction, onChange }) {
  function updateOption(i, value) {
    const next = [...options]
    next[i] = value
    onChange({ options: next, correction })
  }
  function addOption() {
    onChange({ options: [...options, ''], correction })
  }
  function removeOption(i) {
    const next = options.filter((_, idx) => idx !== i)
    let index = correction?.index
    if (index === i) index = undefined
    else if (index > i) index -= 1
    onChange({ options: next, correction: { index } })
  }

  return (
    <div className="form-group">
      <label>Choix (sélectionnez la bonne réponse)</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {options.map((opt, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input type="radio" checked={correction?.index === i} onChange={() => onChange({ options, correction: { index: i } })} title="Bonne réponse" />
            <input className="form-input" value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Choix ${i + 1}`} />
            <button type="button" className="icon-btn danger" onClick={() => removeOption(i)} title="Supprimer">🗑️</button>
          </div>
        ))}
        <button type="button" className="fic-btn" style={{ alignSelf: 'flex-start' }} onClick={addOption}>➕ Ajouter un choix</button>
      </div>
    </div>
  )
}
