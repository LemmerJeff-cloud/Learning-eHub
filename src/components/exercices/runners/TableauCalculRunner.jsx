import React from 'react'

export default function TableauCalculRunner({ exercice, value, onChange, disabled, detail }) {
  const champs = exercice.options?.champs || []
  const valeurs = value?.valeurs || {}

  function setValeur(id, v) {
    onChange({ valeurs: { ...valeurs, [id]: v } })
  }

  return (
    <div className="table-wrap">
      <table className="user-table">
        <thead>
          <tr>
            <th>Champ</th>
            <th>Votre réponse</th>
            {detail && <th></th>}
          </tr>
        </thead>
        <tbody>
          {champs.map(champ => (
            <tr key={champ.id}>
              <td>{champ.label}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input
                    className="form-input"
                    value={valeurs[champ.id] ?? ''}
                    disabled={disabled}
                    onChange={e => setValeur(champ.id, e.target.value)}
                    placeholder={champ.type === 'nombre' ? 'ex : 12,5' : ''}
                    style={{ maxWidth: '160px' }}
                  />
                  {champ.unite && <span style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>{champ.unite}</span>}
                </div>
              </td>
              {detail && <td>{champ.id in detail ? (detail[champ.id] ? '✅' : '❌') : ''}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
