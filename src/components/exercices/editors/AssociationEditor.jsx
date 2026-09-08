import React from 'react'

// Anciennement "glisser_deposer" côté DB (valeur de type inchangée) — le composant est
// renommé car ce n'a jamais été du vrai drag & drop, seulement un choix par menu déroulant.
export default function AssociationEditor({ options, onChange }) {
  function updatePair(i, patch) {
    const next = [...options]
    next[i] = { ...next[i], ...patch }
    onChange({ options: next, correction: next })
  }
  function addPair() {
    const next = [...options, { gauche: '', droite: '' }]
    onChange({ options: next, correction: next })
  }
  function removePair(i) {
    const next = options.filter((_, idx) => idx !== i)
    onChange({ options: next, correction: next })
  }

  return (
    <div className="form-group">
      <label>Paires à associer</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {options.map((pair, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input className="form-input" value={pair.gauche} onChange={e => updatePair(i, { gauche: e.target.value })} placeholder="Élément" />
            <span style={{ color: 'var(--text-3)' }}>→</span>
            <input className="form-input" value={pair.droite} onChange={e => updatePair(i, { droite: e.target.value })} placeholder="Correspondance" />
            <button type="button" className="icon-btn danger" onClick={() => removePair(i)} title="Supprimer">🗑️</button>
          </div>
        ))}
        <button type="button" className="fic-btn" style={{ alignSelf: 'flex-start' }} onClick={addPair}>➕ Ajouter une paire</button>
      </div>
    </div>
  )
}
