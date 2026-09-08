import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// Type "libre" reste volontairement sur l'ancien système resultats (un seul essai permanent,
// correction manuelle) — voir Meilenstein 1 : jamais migré vers exercice_tentatives.
export default function LibreRunner({ exercice, userId, showToast, previewMode }) {
  const [existing, setExisting] = useState(previewMode ? null : undefined)
  const [texte, setTexte]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (!previewMode) load() }, [exercice.id])

  async function load() {
    const { data, error } = await supabase
      .from('resultats').select('*')
      .eq('exercice_id', exercice.id).eq('user_id', userId).maybeSingle()
    if (error) { showToast(error.message, 'error'); setExisting(null); return }
    setExisting(data || null)
  }

  async function handleSubmit() {
    if (!texte.trim()) return
    if (previewMode) { setExisting({ reponse: { texte }, score: null, max_score: exercice.points }); return }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('resultats').insert({
        exercice_id: exercice.id, user_id: userId, reponse: { texte }, score: null, max_score: exercice.points,
      })
      if (error) throw error
      showToast('Réponse envoyée', 'success')
      load()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!previewMode && existing === undefined) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  if (existing) {
    const graded = existing.score !== null
    return (
      <div className={`exercice-result ${graded ? (existing.score >= existing.max_score ? 'correct' : 'incorrect') : 'pending'}`}>
        <div className="exercice-result-status">
          {graded ? `${existing.score >= existing.max_score ? '✅' : '❌'} ${existing.score} / ${existing.max_score} points` : '⏳ En attente de correction'}
        </div>
        <p style={{ marginTop: '0.5rem' }}>{existing.reponse?.texte}</p>
      </div>
    )
  }

  return (
    <div>
      <textarea className="form-input" rows={3} value={texte} onChange={e => setTexte(e.target.value)} placeholder="Votre réponse…" />
      <button className="btn-primary" style={{ width: 'auto', marginTop: '0.9rem', padding: '0.6rem 1.4rem' }} onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Envoi…' : 'Valider'}
      </button>
    </div>
  )
}
