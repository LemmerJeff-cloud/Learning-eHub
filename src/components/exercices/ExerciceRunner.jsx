import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { gradeReponse } from '../../lib/exerciceCorrection'
import LibreRunner from './LibreRunner'
import QcmRunner from './runners/QcmRunner'
import VraiFauxRunner from './runners/VraiFauxRunner'
import OrdreRunner from './runners/OrdreRunner'
import AssociationRunner from './runners/AssociationRunner'
import ChoixUniqueRunner from './runners/ChoixUniqueRunner'
import ReponseCourteRunner from './runners/ReponseCourteRunner'
import ReponseNumeriqueRunner from './runners/ReponseNumeriqueRunner'
import CategorisationRunner from './runners/CategorisationRunner'
import TableauCalculRunner from './runners/TableauCalculRunner'
import JournalRunner from './runners/JournalRunner'

const TYPE_RUNNERS = {
  qcm: QcmRunner,
  vrai_faux: VraiFauxRunner,
  ordre: OrdreRunner,
  glisser_deposer: AssociationRunner,
  choix_unique: ChoixUniqueRunner,
  reponse_courte: ReponseCourteRunner,
  reponse_numerique: ReponseNumeriqueRunner,
  categorisation: CategorisationRunner,
  tableau_calcul: TableauCalculRunner,
  journal: JournalRunner,
}

function defaultValue(type) {
  if (type === 'qcm') return { selected: [] }
  if (type === 'vrai_faux') return { valeur: null }
  if (type === 'ordre') return { ordre: [] }
  if (type === 'glisser_deposer') return { paires: {} }
  if (type === 'choix_unique') return { index: null }
  if (type === 'reponse_courte') return { texte: '' }
  if (type === 'reponse_numerique') return { brut: '' }
  if (type === 'categorisation') return { placements: {} }
  if (type === 'tableau_calcul') return { valeurs: {} }
  if (type === 'journal') return { lignes: {} }
  return {}
}

function hasAnswer(exercice, value) {
  switch (exercice.type) {
    case 'qcm': return (value?.selected || []).length > 0
    case 'vrai_faux': return value?.valeur !== null && value?.valeur !== undefined
    case 'ordre': return (value?.ordre || []).length === exercice.options.length
    case 'glisser_deposer': return Object.keys(value?.paires || {}).length === exercice.options.length
    case 'choix_unique': return value?.index !== null && value?.index !== undefined
    case 'reponse_courte': return !!value?.texte?.trim()
    case 'reponse_numerique': return !!value?.brut?.trim()
    case 'categorisation': {
      const items = exercice.options?.items || []
      return items.length > 0 && items.every(i => value?.placements?.[i.id])
    }
    case 'tableau_calcul': {
      const champs = exercice.options?.champs || []
      return champs.length > 0 && champs.every(c => value?.valeurs?.[c.id] !== undefined && value?.valeurs?.[c.id] !== '')
    }
    case 'journal': {
      const lignes = exercice.options?.lignes || []
      return lignes.length > 0 && lignes.every(l => {
        const v = value?.lignes?.[l.id]
        return !!String(v?.compte || '').trim() && (String(v?.debit || '').trim() !== '' || String(v?.credit || '').trim() !== '')
      })
    }
    default: return false
  }
}

export default function ExerciceRunner({ exercice, userId, showToast, previewMode = false }) {
  const isLibre = exercice.type === 'libre'
  const params = exercice.parametres || {}
  const [progression, setProgression] = useState(previewMode ? { tentatives_total: 0, resolu: false } : undefined)
  const [lastResult, setLastResult] = useState(null) // { correcte, score, max_score, detail }
  const [value, setValue] = useState(() => defaultValue(exercice.type))
  const [submitting, setSubmitting] = useState(false)
  const [hintShown, setHintShown] = useState(false)

  useEffect(() => {
    if (!previewMode && !isLibre) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercice.id])

  if (isLibre) {
    return <LibreRunner exercice={exercice} userId={userId} showToast={showToast} previewMode={previewMode} />
  }

  async function load() {
    const { data: prog, error } = await supabase
      .from('exercice_progression').select('*')
      .eq('exercice_id', exercice.id).eq('user_id', userId).maybeSingle()
    if (error) { showToast(error.message, 'error'); setProgression(null); return }
    setProgression(prog || { tentatives_total: 0, resolu: false })
    if (prog && prog.tentatives_total > 0) {
      const { data: last, error: lastErr } = await supabase
        .from('exercice_tentatives').select('*')
        .eq('exercice_id', exercice.id).eq('user_id', userId)
        .order('numero', { ascending: false }).limit(1).maybeSingle()
      if (lastErr) { showToast(lastErr.message, 'error'); return }
      if (last) {
        setLastResult({ correcte: last.correcte, score: last.score, max_score: last.max_score, detail: last.detail })
        setValue(last.reponse)
        if (!last.correcte) setHintShown(true)
      }
    }
  }

  if (progression === undefined) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>
  if (progression === null) return null

  const maxTentatives = params.max_tentatives ?? null
  const tentativesTotal = progression.tentatives_total || 0
  const locked = maxTentatives !== null && tentativesTotal >= maxTentatives
  const showSolution = params.afficher_solution_apres != null && tentativesTotal >= params.afficher_solution_apres

  async function handleSubmit() {
    const result = gradeReponse(exercice, value)
    if (!result.correcte) setHintShown(true)

    if (previewMode) {
      setLastResult(result)
      setProgression(p => ({ tentatives_total: (p?.tentatives_total || 0) + 1, resolu: (p?.resolu || result.correcte) }))
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('exercice_tentatives').insert({
        exercice_id: exercice.id, user_id: userId, reponse: value,
        correcte: result.correcte, score: result.score, max_score: result.max_score, detail: result.detail,
      })
      if (error) throw error
      await load()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const Runner = TYPE_RUNNERS[exercice.type]
  if (!Runner) return null

  const disabled = submitting || locked

  return (
    <div>
      {lastResult && (
        <div className={`exercice-result ${lastResult.correcte ? 'correct' : 'incorrect'}`} style={{ marginBottom: '0.6rem' }}>
          <div className="exercice-result-status">
            {lastResult.correcte ? '✅' : '❌'} {lastResult.score} / {lastResult.max_score} points
            {tentativesTotal > 1 && ` · tentative ${tentativesTotal}`}
          </div>
        </div>
      )}

      {lastResult && !lastResult.correcte && params.feedback_faux && (
        <div className="exercice-feedback faux html-content" dangerouslySetInnerHTML={{ __html: params.feedback_faux }} />
      )}
      {hintShown && !lastResult?.correcte && params.hint && (
        <div className="exercice-feedback hint html-content" dangerouslySetInnerHTML={{ __html: params.hint }} />
      )}
      {showSolution && params.explication && (
        <div className="exercice-feedback explication html-content" dangerouslySetInnerHTML={{ __html: params.explication }} />
      )}

      <div style={{ marginTop: (lastResult || (hintShown && params.hint)) ? '0.8rem' : 0 }}>
        <Runner exercice={exercice} value={value} onChange={setValue} disabled={disabled} detail={lastResult?.detail} />
      </div>

      {locked ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.6rem' }}>Nombre maximal de tentatives atteint.</p>
      ) : (
        <>
          <button
            className="btn-primary" style={{ width: 'auto', marginTop: '0.9rem', padding: '0.6rem 1.4rem' }}
            onClick={handleSubmit} disabled={submitting || !hasAnswer(exercice, value)}
          >
            {submitting ? 'Envoi…' : (tentativesTotal > 0 ? 'Réessayer' : 'Valider')}
          </button>
          {maxTentatives !== null && (
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.4rem' }}>
              Tentatives restantes : {maxTentatives - tentativesTotal}
            </p>
          )}
        </>
      )}
    </div>
  )
}
