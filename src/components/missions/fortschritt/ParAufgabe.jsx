import React, { useState, useEffect } from 'react'
import { fetchClasseProgression, computeAufgabeMetrics } from '../../../lib/progression'

export default function ParAufgabe({ classeId, showToast }) {
  const [loading, setLoading]     = useState(true)
  const [eleves, setEleves]       = useState([])
  const [progression, setProgression] = useState([])
  const [selected, setSelected]   = useState(null)

  useEffect(() => { load() }, [classeId])

  async function load() {
    setLoading(true)
    try {
      const { eleves: el, progression: prog } = await fetchClasseProgression(classeId)
      setEleves(el)
      setProgression(prog)
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  const exercicesMap = new Map()
  progression.forEach(p => { if (!exercicesMap.has(p.exercice.id)) exercicesMap.set(p.exercice.id, p.exercice) })
  const exercices = [...exercicesMap.values()]

  if (exercices.length === 0) return <div className="empty-state"><p>Aucune activité pour l'instant.</p></div>

  if (selected) {
    const rows = progression.filter(p => p.exercice_id === selected.id)
    const doneIds = new Set(rows.map(r => r.user_id))
    const nonCommence = eleves.filter(el => !doneIds.has(el.id))
    const premierCoup = rows.filter(r => r.resolu && r.tentatives_avant_reussite === 1)
    const reussiPlusieurs = rows.filter(r => r.resolu && r.tentatives_avant_reussite > 1)
    const pasReussi = rows.filter(r => !r.resolu)

    function label(userId) {
      const el = eleves.find(e => e.id === userId)
      return el ? `${el.prenom} ${el.initiale}` : '?'
    }

    const buckets = [
      { label: '🥇 Réussi du premier coup', rows: premierCoup },
      { label: '🔁 Réussi après plusieurs essais', rows: reussiPlusieurs },
      { label: '❌ Pas encore réussi', rows: pasReussi },
      { label: '⚪ Pas commencé', rows: nonCommence.map(e => ({ user_id: e.id })) },
    ]

    return (
      <div>
        <button className="fic-btn" style={{ marginBottom: '1rem' }} onClick={() => setSelected(null)}>← Tous les exercices</button>
        <h3 style={{ marginBottom: '1rem' }}>{selected.titre}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {buckets.map(bucket => (
            <div key={bucket.label} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.8rem' }}>
              <strong style={{ fontSize: '0.82rem' }}>{bucket.label}</strong>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                {bucket.rows.length === 0
                  ? <span style={{ color: 'var(--text-3)' }}>—</span>
                  : bucket.rows.map(r => <div key={r.user_id}>{label(r.user_id)}</div>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="user-table">
        <thead><tr><th>Exercice</th><th>Traité</th><th>Réussite</th><th>1er coup</th></tr></thead>
        <tbody>
          {exercices.map(ex => {
            const m = computeAufgabeMetrics(ex.id, progression)
            return (
              <tr key={ex.id} onClick={() => setSelected(ex)} style={{ cursor: 'pointer' }}>
                <td>{ex.titre}</td>
                <td>{m.bearbeites}/{eleves.length}</td>
                <td>{m.bearbeites > 0 ? `${m.tauxReussite}%` : '—'}</td>
                <td>{m.premierCoup}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
