import React, { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { fetchTentativesHistory } from '../../../lib/progression'

export default function EleveDetail({ eleve, progression, showToast }) {
  const [chapitres, setChapitres] = useState([])
  const [loading, setLoading]     = useState(true)
  const [openExercice, setOpenExercice] = useState(null)
  const [history, setHistory]     = useState({}) // exerciceId -> tentatives[]

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('chapitres').select('id, titre_fr, emoji, ordre').order('ordre')
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setChapitres(data || [])
    setLoading(false)
  }

  async function toggleExercice(ex) {
    if (openExercice === ex.id) { setOpenExercice(null); return }
    setOpenExercice(ex.id)
    if (!history[ex.id]) {
      try {
        const rows = await fetchTentativesHistory(eleve.id, ex.id)
        setHistory(h => ({ ...h, [ex.id]: rows }))
      } catch (err) {
        showToast(err.message || 'Erreur', 'error')
      }
    }
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  const SANS_CHAPITRE = '__sans_chapitre__'
  const byChapitre = {}
  progression.forEach(p => {
    const chId = p.exercice.chapitre_id || SANS_CHAPITRE
    if (!byChapitre[chId]) byChapitre[chId] = []
    byChapitre[chId].push(p)
  })

  const groupes = [
    ...chapitres.filter(ch => byChapitre[ch.id]?.length),
    ...(byChapitre[SANS_CHAPITRE]?.length ? [{ id: SANS_CHAPITRE, emoji: '📎', titre_fr: 'Sans chapitre' }] : []),
  ]

  return (
    <div>
      <h3 style={{ marginBottom: '1rem' }}>{eleve.prenom} {eleve.initiale}</h3>

      {groupes.length === 0 && (
        <p style={{ color: 'var(--text-3)' }}>Aucune activité pour l'instant.</p>
      )}

      {groupes.map(ch => (
        <div key={ch.id} style={{ marginBottom: '1.2rem' }}>
          <strong>{ch.emoji} {ch.titre_fr}</strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
            {byChapitre[ch.id].map(p => (
              <div key={p.exercice.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => toggleExercice(p.exercice)}
                >
                  <span>{p.resolu ? '✅' : '❌'} {p.exercice.titre}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    {p.tentatives_total} tentative{p.tentatives_total > 1 ? 's' : ''} · {p.dernier_score}/{p.dernier_max_score}
                  </span>
                </div>
                {openExercice === p.exercice.id && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                    {!history[p.exercice.id] ? 'Chargement…' : history[p.exercice.id].map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                        <span>Tentative {t.numero}</span>
                        <span>{t.correcte ? '✅' : '❌'} {t.score}/{t.max_score} · {new Date(t.created_at).toLocaleString('fr-FR')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
