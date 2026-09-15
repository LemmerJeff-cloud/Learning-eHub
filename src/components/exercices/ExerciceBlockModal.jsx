import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import MiniRichEditor from '../admin/MiniRichEditor'
import FiliereCheckboxes from '../admin/FiliereCheckboxes'
import { useOverlayClose } from '../../lib/useOverlayClose'

export default function ExerciceBlockModal({ block, sectionId, chapitreId, nextOrdre, onClose, onSaved, showToast }) {
  const overlayClose = useOverlayClose(onClose)
  const { visibleFilieres } = useAuth()
  const [titre, setTitre]           = useState(block?.titre || '')
  const [description, setDescription] = useState(block?.description?.html || '')
  const [filieres, setFilieres]     = useState(block?.filieres || null)
  const [loading, setLoading]       = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!titre.trim() || filieres === null) return
    setLoading(true)
    try {
      const payload = {
        titre, description: { html: description }, filieres,
        section_id: sectionId, chapitre_id: chapitreId,
      }
      if (block) {
        const { error } = await supabase.from('exercice_blocks').update(payload).eq('id', block.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('exercice_blocks').insert({ ...payload, ordre: nextOrdre ?? 0 })
        if (error) throw error
      }
      showToast(block ? 'Bloc mis à jour' : 'Bloc créé', 'success')
      onSaved()
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
        <h2>{block ? 'Modifier le bloc' : "Nouveau bloc d'exercices"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Titre</label>
            <input className="form-input" value={titre} onChange={e => setTitre(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label>Description (optionnelle)</label>
            <MiniRichEditor content={description} onChange={setDescription} showToast={showToast} />
          </div>
          <div className="form-group">
            <label>Filières</label>
            <FiliereCheckboxes value={filieres} onChange={setFilieres} restrictTo={visibleFilieres} />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
