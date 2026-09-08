import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import MiniRichEditor from '../admin/MiniRichEditor'
import FiliereCheckboxes from '../admin/FiliereCheckboxes'
import ExerciceParametresPanel from './ExerciceParametresPanel'
import QcmEditor from './editors/QcmEditor'
import VraiFauxEditor from './editors/VraiFauxEditor'
import OrdreEditor from './editors/OrdreEditor'
import AssociationEditor from './editors/AssociationEditor'
import ChoixUniqueEditor from './editors/ChoixUniqueEditor'
import ReponseCourteEditor from './editors/ReponseCourteEditor'
import ReponseNumeriqueEditor from './editors/ReponseNumeriqueEditor'
import CategorisationEditor from './editors/CategorisationEditor'
import TableauCalculEditor from './editors/TableauCalculEditor'
import JournalEditor from './editors/JournalEditor'

const TYPES = [
  { value: 'libre', label: 'Réponse libre (correction manuelle)' },
  { value: 'qcm', label: 'QCM (choix multiples)' },
  { value: 'choix_unique', label: 'Choix unique' },
  { value: 'vrai_faux', label: 'Vrai / Faux' },
  { value: 'reponse_courte', label: 'Réponse courte' },
  { value: 'reponse_numerique', label: 'Réponse numérique' },
  { value: 'ordre', label: 'Remise en ordre' },
  { value: 'glisser_deposer', label: 'Association' },
  { value: 'categorisation', label: 'Catégorisation' },
  { value: 'tableau_calcul', label: 'Tableau de calcul' },
  { value: 'journal', label: 'Journal comptable' },
]

const TYPE_EDITORS = {
  qcm: QcmEditor,
  vrai_faux: VraiFauxEditor,
  ordre: OrdreEditor,
  glisser_deposer: AssociationEditor,
  choix_unique: ChoixUniqueEditor,
  reponse_courte: ReponseCourteEditor,
  reponse_numerique: ReponseNumeriqueEditor,
  categorisation: CategorisationEditor,
  tableau_calcul: TableauCalculEditor,
  journal: JournalEditor,
}

function defaultsFor(type) {
  if (type === 'qcm') return { options: ['', ''], correction: [] }
  if (type === 'vrai_faux') return { options: [], correction: true }
  if (type === 'ordre') return { options: ['', ''], correction: null }
  if (type === 'glisser_deposer') return { options: [{ gauche: '', droite: '' }], correction: null }
  if (type === 'choix_unique') return { options: ['', ''], correction: { index: undefined } }
  if (type === 'reponse_courte') return { options: [], correction: { reponses: [], case_sensible: false, ignorer_espaces: true } }
  if (type === 'reponse_numerique') return { options: [], correction: { valeur: '', tolerance: 0, unite: '' } }
  if (type === 'categorisation') return { options: { items: [], categories: [] }, correction: { placements: {} } }
  if (type === 'tableau_calcul') return { options: { champs: [] }, correction: { champs: {} } }
  if (type === 'journal') return { options: { comptes: [], tolerance: 0, lignes: [] }, correction: { lignes: {} } }
  return { options: [], correction: '' } // libre
}

function validate(type, options, correction, showToast) {
  if (type === 'ordre' && options.some(o => !o.trim())) { showToast('Complétez tous les éléments', 'error'); return false }
  if (type === 'glisser_deposer' && options.some(o => !o.gauche.trim() || !o.droite.trim())) {
    showToast('Complétez toutes les paires', 'error'); return false
  }
  if (type === 'qcm' && correction.length === 0) { showToast('Cochez au moins une bonne réponse', 'error'); return false }
  if (type === 'choix_unique' && correction?.index === undefined) { showToast('Sélectionnez la bonne réponse', 'error'); return false }
  if (type === 'reponse_courte' && (correction.reponses || []).every(r => !r.trim())) {
    showToast('Ajoutez au moins une réponse acceptée', 'error'); return false
  }
  if (type === 'reponse_numerique' && correction.valeur === '') { showToast('Indiquez la valeur correcte', 'error'); return false }
  if (type === 'categorisation') {
    const items = options.items || []
    if (items.length === 0) { showToast('Ajoutez au moins un élément', 'error'); return false }
    if (items.some(i => !correction.placements?.[i.id])) { showToast('Classez tous les éléments', 'error'); return false }
  }
  if (type === 'tableau_calcul') {
    const champs = options.champs || []
    if (champs.length === 0) { showToast('Ajoutez au moins un champ', 'error'); return false }
    if (champs.some(c => !c.label.trim() || correction.champs?.[c.id]?.valeur === '')) {
      showToast('Complétez le libellé et la valeur correcte de chaque champ', 'error'); return false
    }
  }
  if (type === 'journal') {
    const lignes = options.lignes || []
    if (lignes.length === 0) { showToast('Ajoutez au moins une ligne', 'error'); return false }
    if (lignes.some(l => {
      const c = correction.lignes?.[l.id]
      return !String(c?.compte || '').trim() || (!Number(c?.debit) && !Number(c?.credit))
    })) {
      showToast('Complétez le compte et le montant (débit ou crédit) de chaque ligne', 'error'); return false
    }
  }
  return true
}

export default function ExerciceModal({ exercice, sectionId, chapitreId, blockId, nextOrdre, onClose, onSaved, showToast }) {
  const { visibleFilieres } = useAuth()
  const [titre, setTitre]     = useState(exercice?.titre || '')
  const [type, setType]       = useState(exercice?.type || 'libre')
  const [enonce, setEnonce]   = useState(exercice?.enonce || '')
  const [points, setPoints]   = useState(exercice?.points ?? 1)
  const [filieres, setFilieres] = useState(exercice?.filieres || null)
  const [options, setOptions] = useState(exercice?.options ?? defaultsFor(exercice?.type || 'libre').options)
  const [correction, setCorrection] = useState(exercice?.correction ?? defaultsFor(exercice?.type || 'libre').correction)
  const [parametres, setParametres] = useState(exercice?.parametres || {})
  const [loading, setLoading] = useState(false)

  function changeType(t) {
    setType(t)
    const d = defaultsFor(t)
    setOptions(d.options)
    setCorrection(d.correction)
  }

  const computedPoints = type === 'tableau_calcul'
    ? (options.champs || []).reduce((s, c) => s + (Number(c.points) || 0), 0)
    : type === 'journal'
    ? (options.lignes || []).reduce((s, l) => s + (Number(l.points) || 0), 0)
    : Number(points) || 1

  async function handleSubmit(e) {
    e.preventDefault()
    if (!titre.trim() || !enonce.trim() || filieres === null) return
    if (!validate(type, options, correction, showToast)) return

    setLoading(true)
    try {
      const finalCorrection = (type === 'ordre' || type === 'glisser_deposer') ? options : correction
      const payload = {
        titre, type, enonce, options, correction: finalCorrection,
        points: computedPoints, filieres,
        section_id: sectionId, chapitre_id: chapitreId,
        block_id: blockId ?? null,
        parametres: type === 'libre' ? {} : parametres,
      }
      if (exercice) {
        const { error } = await supabase.from('exercices').update(payload).eq('id', exercice.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('exercices').insert({ ...payload, ordre: nextOrdre ?? 0 })
        if (error) throw error
      }
      showToast(exercice ? 'Exercice mis à jour' : 'Exercice créé', 'success')
      onSaved()
      onClose()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  const TypeEditor = TYPE_EDITORS[type]

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target.classList.contains('modal-overlay')) onClose() }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>{exercice ? "Modifier l'exercice" : 'Nouvel exercice'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Titre</label>
            <input className="form-input" value={titre} onChange={e => setTitre(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select className="form-select" value={type} onChange={e => changeType(e.target.value)} disabled={!!exercice}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {exercice && <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>Le type ne peut pas être changé après création.</p>}
          </div>
          <div className="form-group">
            <label>Énoncé</label>
            <MiniRichEditor content={enonce} onChange={setEnonce} showToast={showToast} />
          </div>

          {type === 'libre' && (
            <div className="form-group">
              <label>Réponse modèle (optionnel, pour vous aider à corriger)</label>
              <textarea className="form-input" rows={2} value={correction} onChange={e => setCorrection(e.target.value)} />
            </div>
          )}

          {TypeEditor && (
            <TypeEditor
              options={options}
              correction={correction}
              onChange={({ options: o, correction: c }) => { setOptions(o); setCorrection(c) }}
            />
          )}

          <div className="form-group">
            <label>Points</label>
            {type === 'tableau_calcul' || type === 'journal' ? (
              <p style={{ fontSize: '0.85rem' }}>Calculés automatiquement à partir des champs ci-dessus : <strong>{computedPoints}</strong></p>
            ) : (
              <input className="form-input" type="number" min="1" value={points} onChange={e => setPoints(e.target.value)} style={{ maxWidth: '120px' }} />
            )}
          </div>
          <div className="form-group">
            <label>Filières</label>
            <FiliereCheckboxes value={filieres} onChange={setFilieres} restrictTo={visibleFilieres} />
          </div>

          {type !== 'libre' && (
            <ExerciceParametresPanel value={parametres} onChange={setParametres} showToast={showToast} />
          )}

          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '0.9rem' }}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
