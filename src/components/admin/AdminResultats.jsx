import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// Seul le type "libre" passe encore par ici : les 9 types auto-corrigés utilisent
// désormais exercice_tentatives et sont analysés dans l'onglet Progression (Missions).
const TYPE_LABELS = { libre: 'Réponse libre' }

function formatReponse(type, reponse) {
  if (!reponse) return '—'
  return reponse.texte || '—'
}

export default function AdminResultats({ showToast, setPage }) {
  function goToProgression() {
    setPage('missions')
    // Le sous-onglet "Progression" est piloté par un événement écouté après montage
    // de PageMissions (même mécanisme que la Sidebar) — léger délai pour laisser
    // React monter la page avant de le déclencher.
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('sidebar:sub', { detail: { id: 'missions-fortschritt' } }))
    }, 0)
  }

  const [exercices, setExercices] = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [resultats, setResultats] = useState([])
  const [loadingRes, setLoadingRes] = useState(false)
  const [grading, setGrading]     = useState({}) // resultat id -> draft score

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('exercices')
      .select('*, chapitre:chapitres(titre_fr), section:sections_cours(titre_fr)')
      .eq('type', 'libre')
      .order('created_at', { ascending: false })
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setExercices(data)
    setLoading(false)
  }

  async function openExercice(ex) {
    setSelected(ex)
    setLoadingRes(true)
    const { data, error } = await supabase
      .from('resultats')
      .select('*, profile:profiles(prenom, initiale)')
      .eq('exercice_id', ex.id)
      .order('created_at')
    if (error) { showToast(error.message, 'error'); setLoadingRes(false); return }
    setResultats(data)
    setLoadingRes(false)
  }

  async function handleGrade(res) {
    const score = Number(grading[res.id])
    if (Number.isNaN(score)) { showToast('Score invalide', 'error'); return }
    const { error } = await supabase.from('resultats').update({ score }).eq('id', res.id)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Score enregistré', 'success')
    openExercice(selected)
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  if (selected) {
    return (
      <div>
        <button className="fic-btn" style={{ marginBottom: '1rem' }} onClick={() => setSelected(null)}>← Tous les exercices</button>
        <h3 style={{ marginBottom: '0.2rem' }}>{selected.titre}</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '1rem' }}>
          {[TYPE_LABELS[selected.type], selected.chapitre?.titre_fr, selected.section?.titre_fr].filter(Boolean).join(' · ')}
        </p>

        {loadingRes ? (
          <p style={{ color: 'var(--text-3)' }}>Chargement…</p>
        ) : resultats.length === 0 ? (
          <div className="empty-state"><p>Aucune réponse pour l'instant.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="user-table">
              <thead><tr><th>Élève</th><th>Réponse</th><th>Score</th><th></th></tr></thead>
              <tbody>
                {resultats.map(r => (
                  <tr key={r.id}>
                    <td>{r.profile?.prenom} {r.profile?.initiale}</td>
                    <td>{formatReponse(selected.type, r.reponse)}</td>
                    <td>{r.score === null ? '⏳ non noté' : `${r.score} / ${r.max_score}`}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {selected.type === 'libre' && (
                        <>
                          <input
                            type="number" min="0" max={r.max_score}
                            className="form-input"
                            style={{ width: '70px', display: 'inline-block', padding: '0.35rem 0.5rem' }}
                            value={grading[r.id] ?? r.score ?? ''}
                            onChange={e => setGrading({ ...grading, [r.id]: e.target.value })}
                          />
                          <button className="icon-btn" style={{ marginLeft: '0.35rem' }} onClick={() => handleGrade(r)} title="Enregistrer la note">💾</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <p className="page-sub" style={{ marginBottom: '1rem' }}>
        Correction manuelle des exercices de type "réponse libre" uniquement. Pour les exercices
        auto-corrigés (QCM, vrai/faux, association, etc.),{' '}
        <button type="button" onClick={goToProgression} style={{ background: 'none', border: 'none', color: 'var(--navy)', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}>
          consultez Missions → Progression
        </button>.
      </p>
      {exercices.length === 0 ? (
        <div className="empty-state"><p>Aucun exercice à réponse libre créé pour l'instant.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {exercices.map(ex => (
            <div key={ex.id} className="section-row" onClick={() => openExercice(ex)}>
              <span style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: '0.86rem' }}>{ex.titre}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                  {[TYPE_LABELS[ex.type], ex.chapitre?.titre_fr, ex.section?.titre_fr].filter(Boolean).join(' · ')}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
