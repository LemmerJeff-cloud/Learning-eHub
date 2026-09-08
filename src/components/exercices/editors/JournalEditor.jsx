import React from 'react'

function newId() { return crypto.randomUUID() }

export default function JournalEditor({ options, correction, onChange }) {
  const comptes = options?.comptes || []
  const tolerance = options?.tolerance ?? 0
  const lignes = options?.lignes || []
  const correctionLignes = correction?.lignes || {}

  function set(patch) {
    onChange({
      options: { comptes, tolerance, lignes, ...patch.options },
      correction: { lignes: correctionLignes, ...patch.correction },
    })
  }

  function addCompte() {
    set({ options: { comptes: [...comptes, { numero: '', libelle: '' }] } })
  }
  function updateCompte(i, patch) {
    const next = [...comptes]
    next[i] = { ...next[i], ...patch }
    set({ options: { comptes: next } })
  }
  function removeCompte(i) {
    set({ options: { comptes: comptes.filter((_, idx) => idx !== i) } })
  }

  function addLigne() {
    const id = newId()
    set({
      options: { lignes: [...lignes, { id, points: 1 }] },
      correction: { lignes: { ...correctionLignes, [id]: { compte: '', libelle: '', debit: '', credit: '' } } },
    })
  }
  function updateLigne(i, patch) {
    const next = [...lignes]
    next[i] = { ...next[i], ...patch }
    set({ options: { lignes: next } })
  }
  function updateCorrectionLigne(id, patch) {
    set({ correction: { lignes: { ...correctionLignes, [id]: { ...correctionLignes[id], ...patch } } } })
  }
  function removeLigne(i) {
    const removed = lignes[i]
    const next = lignes.filter((_, idx) => idx !== i)
    const nextCorrection = { ...correctionLignes }
    delete nextCorrection[removed.id]
    set({ options: { lignes: next }, correction: { lignes: nextCorrection } })
  }

  const totalPoints = lignes.reduce((s, l) => s + (Number(l.points) || 0), 0)

  return (
    <div>
      <div className="form-group">
        <label>Plan comptable de référence (optionnel — affiché à l'élève comme liste de comptes disponibles)</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {comptes.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.4rem' }}>
              <input className="form-input" value={c.numero} onChange={e => updateCompte(i, { numero: e.target.value })} placeholder="N° (ex : 512)" style={{ maxWidth: '110px' }} />
              <input className="form-input" value={c.libelle} onChange={e => updateCompte(i, { libelle: e.target.value })} placeholder="Libellé (ex : Banque)" style={{ flex: 1 }} />
              <button type="button" className="icon-btn danger" onClick={() => removeCompte(i)} title="Supprimer">🗑️</button>
            </div>
          ))}
          <button type="button" className="fic-btn" style={{ alignSelf: 'flex-start' }} onClick={addCompte}>➕ Ajouter un compte</button>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.4rem' }}>
          Si vide, l'élève saisit le n° de compte librement plutôt que de le choisir dans une liste.
        </p>
      </div>

      <div className="form-group">
        <label>Tolérance sur les montants (€)</label>
        <input className="form-input" type="number" step="any" min="0" value={tolerance} onChange={e => set({ options: { tolerance: Number(e.target.value) || 0 } })} style={{ maxWidth: '120px' }} />
      </div>

      <div className="form-group">
        <label>Lignes du journal (solution attendue)</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {lignes.map((ligne, i) => {
            const corr = correctionLignes[ligne.id] || {}
            return (
              <div key={ligne.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                {comptes.length > 0 ? (
                  <select
                    className="form-select"
                    value={corr.compte || ''}
                    onChange={e => {
                      const compte = comptes.find(c => c.numero === e.target.value)
                      updateCorrectionLigne(ligne.id, { compte: e.target.value, libelle: compte?.libelle || '' })
                    }}
                    style={{ minWidth: '180px' }}
                  >
                    <option value="">— Compte —</option>
                    {comptes.map((c, idx) => <option key={idx} value={c.numero}>{c.numero} — {c.libelle}</option>)}
                  </select>
                ) : (
                  <>
                    <input className="form-input" value={corr.compte || ''} onChange={e => updateCorrectionLigne(ligne.id, { compte: e.target.value })} placeholder="N° compte" style={{ maxWidth: '110px' }} />
                    <input className="form-input" value={corr.libelle || ''} onChange={e => updateCorrectionLigne(ligne.id, { libelle: e.target.value })} placeholder="Libellé (info)" style={{ maxWidth: '160px' }} />
                  </>
                )}
                <input className="form-input" type="number" step="any" value={corr.debit ?? ''} onChange={e => updateCorrectionLigne(ligne.id, { debit: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Débit" style={{ maxWidth: '110px' }} />
                <input className="form-input" type="number" step="any" value={corr.credit ?? ''} onChange={e => updateCorrectionLigne(ligne.id, { credit: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Crédit" style={{ maxWidth: '110px' }} />
                <input className="form-input" type="number" min="0" value={ligne.points} onChange={e => updateLigne(i, { points: Number(e.target.value) || 0 })} placeholder="Points" style={{ maxWidth: '90px' }} />
                <button type="button" className="icon-btn danger" onClick={() => removeLigne(i)} title="Supprimer">🗑️</button>
              </div>
            )
          })}
          <button type="button" className="fic-btn" style={{ alignSelf: 'flex-start' }} onClick={addLigne}>➕ Ajouter une ligne</button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.5rem' }}>
          Points totaux (calculés automatiquement) : <strong>{totalPoints}</strong>. Le libellé n'est pas noté (indicatif),
          seuls le compte et le montant (débit/crédit) comptent.
        </p>
      </div>
    </div>
  )
}
