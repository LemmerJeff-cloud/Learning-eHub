import React from 'react'

export default function JournalRunner({ exercice, value, onChange, disabled, detail }) {
  const comptes = exercice.options?.comptes || []
  const lignes = exercice.options?.lignes || []
  const donnees = value?.lignes || {}

  function updateLigne(id, patch) {
    onChange({ lignes: { ...donnees, [id]: { ...donnees[id], ...patch } } })
  }

  return (
    <div>
      {comptes.length > 0 && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '0.6rem' }}>
          <strong>Plan comptable :</strong>{' '}
          {comptes.map((c, i) => `${c.numero} — ${c.libelle}`).join(' · ')}
        </div>
      )}
      <div className="table-wrap">
        <table className="user-table">
          <thead>
            <tr>
              <th>N° de compte</th>
              <th>Débit</th>
              <th>Crédit</th>
              {detail && <th></th>}
            </tr>
          </thead>
          <tbody>
            {lignes.map(ligne => {
              const saisie = donnees[ligne.id] || {}
              return (
                <tr key={ligne.id}>
                  <td>
                    {comptes.length > 0 ? (
                      <select
                        className="form-select"
                        value={saisie.compte || ''}
                        disabled={disabled}
                        onChange={e => updateLigne(ligne.id, { compte: e.target.value })}
                        style={{ minWidth: '160px' }}
                      >
                        <option value="">— Compte —</option>
                        {comptes.map((c, i) => <option key={i} value={c.numero}>{c.numero} — {c.libelle}</option>)}
                      </select>
                    ) : (
                      <input
                        className="form-input" value={saisie.compte || ''} disabled={disabled}
                        onChange={e => updateLigne(ligne.id, { compte: e.target.value })}
                        placeholder="N° compte" style={{ maxWidth: '140px' }}
                      />
                    )}
                  </td>
                  <td>
                    <input
                      className="form-input" value={saisie.debit ?? ''} disabled={disabled}
                      onChange={e => updateLigne(ligne.id, { debit: e.target.value })}
                      placeholder="ex : 300" style={{ maxWidth: '110px' }}
                    />
                  </td>
                  <td>
                    <input
                      className="form-input" value={saisie.credit ?? ''} disabled={disabled}
                      onChange={e => updateLigne(ligne.id, { credit: e.target.value })}
                      placeholder="ex : 300" style={{ maxWidth: '110px' }}
                    />
                  </td>
                  {detail && <td>{ligne.id in detail ? (detail[ligne.id] ? '✅' : '❌') : ''}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
