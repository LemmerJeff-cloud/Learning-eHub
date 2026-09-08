import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import FiliereCheckboxes from './FiliereCheckboxes'
import EmojiPicker from './EmojiPicker'

export default function ChapitreModal({ chapitre, matiereId, onClose, onSaved, showToast }) {
  const { visibleFilieres, canEditMatiere } = useAuth()
  const [titre, setTitre]             = useState(chapitre?.titre_fr || '')
  const [emoji, setEmoji]             = useState(chapitre?.emoji || '📖')
  const [description, setDescription] = useState(chapitre?.description_fr || '')
  const [filieres, setFilieres]       = useState(chapitre?.filieres || null)
  const [matiereIds, setMatiereIds]   = useState(chapitre?.matiere_ids || (matiereId ? [matiereId] : []))
  const [matieres, setMatieres]       = useState([])
  const [loading, setLoading]         = useState(false)

  useEffect(() => {
    supabase.from('matieres').select('*').order('ordre').then(({ data }) => setMatieres(data || []))
  }, [])

  // Un chapitre déjà partagé avec une matière que je n'édite pas reste verrouillé (coché,
  // non décochable) : je ne peux pas retirer ce lien pour cette matière-là, seulement ajouter
  // des matières que JE gère.
  function toggleMatiere(id) {
    if (!canEditMatiere(id)) return
    setMatiereIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!titre.trim() || filieres === null || matiereIds.length === 0) return
    setLoading(true)
    try {
      if (chapitre) {
        const { error } = await supabase.from('chapitres')
          .update({ titre_fr: titre, emoji, description_fr: description, filieres, matiere_ids: matiereIds })
          .eq('id', chapitre.id)
        if (error) throw error
      } else {
        const { data: maxRows } = await supabase.from('chapitres')
          .select('ordre').contains('matiere_ids', [matiereId]).order('ordre', { ascending: false }).limit(1)
        const ordre = (maxRows?.[0]?.ordre ?? -1) + 1
        const { error } = await supabase.from('chapitres')
          .insert({ titre_fr: titre, emoji, description_fr: description, filieres, ordre, matiere_ids: matiereIds })
        if (error) throw error
      }
      showToast(chapitre ? 'Chapitre mis à jour' : 'Chapitre créé', 'success')
      onSaved()
      onClose()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target.classList.contains('modal-overlay')) onClose() }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>{chapitre ? 'Modifier le chapitre' : 'Nouveau chapitre'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Emoji</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <EmojiPicker value={emoji} onChange={setEmoji} />
              <input className="form-input" style={{ width: '4rem' }} value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={4} placeholder="ou tapez" />
            </div>
          </div>
          <div className="form-group">
            <label>Titre</label>
            <input className="form-input" value={titre} onChange={e => setTitre(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label>Matières</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {matieres.map(m => (
                <label
                  key={m.id}
                  className={`filiere-checkbox ${matiereIds.includes(m.id) ? 'checked' : ''}`}
                  style={{ opacity: canEditMatiere(m.id) ? 1 : 0.5, cursor: canEditMatiere(m.id) ? 'pointer' : 'not-allowed' }}
                  title={canEditMatiere(m.id) ? '' : "Vous n'avez pas les droits d'édition sur cette matière"}
                >
                  <input type="checkbox" checked={matiereIds.includes(m.id)} onChange={() => toggleMatiere(m.id)} style={{ display: 'none' }} />
                  {m.emoji} {m.nom}
                </label>
              ))}
            </div>
            <small style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
              Un chapitre peut être partagé entre plusieurs matières.
            </small>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input className="form-input" value={description} onChange={e => setDescription(e.target.value)} />
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
