import React from 'react'

function newId() { return crypto.randomUUID() }

export default function TableauCalculEditor({ options, correction, onChange }) {
  const champs = options?.champs || []
  const correctionChamps = correction?.champs || {}

  function set(nextChamps, nextCorrection) {
    onChange({ options: { champs: nextChamps }, correction: { champs: nextCorrection } })
  }

  function addChamp() {
    const id = newId()
    set([...champs, { id, label: '', type: 'nombre', tolerance: 0, unite: '', points: 1 }], { ...correctionChamps, [id]: { valeur: '' } })
  }
  function updateChamp(i, patch) {
    const next = [...champs]
    next[i] = { ...next[i], ...patch }
    set(next, correctionChamps)
  }
  function updateValeur(id, valeur) {
    set(champs, { ...correctionChamps, [id]: { ...correctionChamps[id], valeur } })
  }
  function removeChamp(i) {
    const removed = champs[i]
    const next = champs.filter((_, idx) => idx !== i)
    const nextCorrection = { ...correctionChamps }
    delete nextCorrection[removed.id]
    set(next, nextCorrection)
  }

  const totalPoints = champs.reduce((s, c) => s + (Number(c.points) || 0), 0)

  return (
    <div className="form-group">
      <label>Champs du tableau</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {champs.map((champ, i) => (
          <div key={champ.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            <input className="form-input" value={champ.label} onChange={e => updateChamp(i, { label: e.target.value })} placeholder="Libellé" style={{ flex: '1 1 160px' }} />
            <select className="form-select" value={champ.type} onChange={e => updateChamp(i, { type: e.target.value })} style={{ maxWidth: '120px' }}>
              <option value="nombre">Nombre</option>
              <option value="texte">Texte</option>
            </select>
            {champ.type === 'nombre' ? (
              <input
                className="form-input" type="number" step="any"
                value={correctionChamps[champ.id]?.valeur ?? ''}
                onChange={e => updateValeur(champ.id, e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Valeur correcte" style={{ maxWidth: '140px' }}
              />
            ) : (
              <input
                className="form-input"
                value={correctionChamps[champ.id]?.valeur ?? ''}
                onChange={e => updateValeur(champ.id, e.target.value)}
                placeholder="Valeur correcte" style={{ maxWidth: '140px' }}
              />
            )}
            {champ.type === 'nombre' && (
              <input className="form-input" type="number" step="any" min="0" value={champ.tolerance} onChange={e => updateChamp(i, { tolerance: Number(e.target.value) || 0 })} placeholder="Tolérance ±" style={{ maxWidth: '110px' }} />
            )}
            <input className="form-input" value={champ.unite} onChange={e => updateChamp(i, { unite: e.target.value })} placeholder="Unité" style={{ maxWidth: '90px' }} />
            <input className="form-input" type="number" min="0" value={champ.points} onChange={e => updateChamp(i, { points: Number(e.target.value) || 0 })} placeholder="Points" style={{ maxWidth: '90px' }} />
            <button type="button" className="icon-btn danger" onClick={() => removeChamp(i)} title="Supprimer">🗑️</button>
          </div>
        ))}
        <button type="button" className="fic-btn" style={{ alignSelf: 'flex-start' }} onClick={addChamp}>➕ Ajouter un champ</button>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.5rem' }}>
        Points totaux (calculés automatiquement) : <strong>{totalPoints}</strong>
      </p>
    </div>
  )
}
