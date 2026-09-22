import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { backupChapitre } from '../../lib/backup'
import FiliereCheckboxes from './FiliereCheckboxes'
import { useOverlayClose } from '../../lib/useOverlayClose'

const TYPES = [
  { value: 'blocs',    label: 'Contenu (blocs)' },
  { value: 'activite', label: 'Activité' },
  { value: 'editeur',  label: 'Éditeur riche (mise en page libre)' },
]

export default function SectionModal({ section, chapitreId, chapitres, onClose, onSaved, onMoved, showToast }) {
  const overlayClose = useOverlayClose(onClose)
  const { user, visibleFilieres } = useAuth()
  const [titre, setTitre]       = useState(section?.titre_fr || '')
  const [type, setType]         = useState(section?.type || 'blocs')
  const [filieres, setFilieres] = useState(section?.filieres || null)
  const [targetChapitreId, setTargetChapitreId] = useState(chapitreId)
  const [loading, setLoading]   = useState(false)

  const typeChanged = section && type !== section.type
  const chapitreChanged = section && targetChapitreId !== chapitreId

  async function handleSubmit(e) {
    e.preventDefault()
    if (!titre.trim() || filieres === null) return
    setLoading(true)
    try {
      if (section) {
        const payload = { titre_fr: titre, type, filieres }
        if (typeChanged) {
          await backupChapitre(chapitreId, `avant changement de type de la section "${section.titre_fr}" (${section.type} → ${type})`, user.id)
          payload.contenu = {}
        }
        if (chapitreChanged) {
          await backupChapitre(chapitreId, `avant déplacement de la section "${section.titre_fr}" vers un autre chapitre`, user.id)
          await backupChapitre(targetChapitreId, `avant réception de la section "${section.titre_fr}" déplacée`, user.id)
          const { data: maxRows } = await supabase.from('sections_cours')
            .select('ordre').eq('chapitre_id', targetChapitreId).order('ordre', { ascending: false }).limit(1)
          payload.chapitre_id = targetChapitreId
          payload.ordre = (maxRows?.[0]?.ordre ?? -1) + 1
        }
        const { error } = await supabase.from('sections_cours')
          .update(payload)
          .eq('id', section.id)
        if (error) throw error
        if (chapitreChanged) {
          const { error: exError } = await supabase.from('exercices')
            .update({ chapitre_id: targetChapitreId })
            .eq('section_id', section.id)
          if (exError) throw exError
        }
      } else {
        const { data: maxRows } = await supabase.from('sections_cours')
          .select('ordre').eq('chapitre_id', chapitreId).order('ordre', { ascending: false }).limit(1)
        const ordre = (maxRows?.[0]?.ordre ?? -1) + 1
        const { error } = await supabase.from('sections_cours')
          .insert({ chapitre_id: chapitreId, titre_fr: titre, type, filieres, ordre, contenu: {} })
        if (error) throw error
      }
      showToast(section ? 'Section mise à jour' : 'Section créée', 'success')
      if (chapitreChanged) onMoved?.(targetChapitreId)
      else onSaved()
      onClose()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay open" {...overlayClose}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>{section ? 'Modifier la section' : 'Nouvelle section'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Titre</label>
            <input className="form-input" value={titre} onChange={e => setTitre(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {typeChanged && (
              <small style={{ color: '#DC2626', fontSize: '0.72rem', display: 'block', marginTop: '0.3rem' }}>
                ⚠️ Le contenu actuel de cette section sera effacé (formats incompatibles entre types).
                Une sauvegarde est créée automatiquement avant l'enregistrement.
              </small>
            )}
          </div>
          <div className="form-group">
            <label>Filières</label>
            <FiliereCheckboxes value={filieres} onChange={setFilieres} restrictTo={visibleFilieres} />
          </div>
          {section && chapitres?.length > 0 && (
            <div className="form-group">
              <label>Chapitre</label>
              <select className="form-select" value={targetChapitreId} onChange={e => setTargetChapitreId(e.target.value)}>
                {chapitres.map(c => <option key={c.id} value={c.id}>{c.titre_fr}</option>)}
              </select>
              {chapitreChanged && (
                <small style={{ color: '#DC2626', fontSize: '0.72rem', display: 'block', marginTop: '0.3rem' }}>
                  ⚠️ Cette section (et ses exercices) sera déplacée vers ce chapitre.
                  Une sauvegarde est créée automatiquement pour les deux chapitres.
                </small>
              )}
            </div>
          )}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
