import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useOverlayClose } from '../../lib/useOverlayClose'

export default function MoveBlockModal({ chapitres, currentChapitreId, currentSectionId, onClose, onConfirm, showToast }) {
  const overlayClose = useOverlayClose(onClose)
  const [targetChapitreId, setTargetChapitreId] = useState(currentChapitreId)
  const [sections, setSections]                 = useState([])
  const [targetSectionId, setTargetSectionId]   = useState('')
  const [loading, setLoading]                   = useState(true)
  const [moving, setMoving]                     = useState(false)

  useEffect(() => { loadSections(targetChapitreId) }, [targetChapitreId])

  async function loadSections(chId) {
    setLoading(true)
    setTargetSectionId('')
    const { data, error } = await supabase.from('sections_cours').select('id, titre_fr, type').eq('chapitre_id', chId).order('ordre')
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    const blocsSections = (data || []).filter(s => s.type === 'blocs' && s.id !== currentSectionId)
    setSections(blocsSections)
    if (blocsSections.length > 0) setTargetSectionId(blocsSections[0].id)
    setLoading(false)
  }

  async function handleConfirm() {
    if (!targetSectionId) return
    setMoving(true)
    try {
      await onConfirm(targetChapitreId, targetSectionId)
      onClose()
    } finally {
      setMoving(false)
    }
  }

  return (
    <div className="modal-overlay open" {...overlayClose}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>Déplacer le bloc</h2>
        <div className="form-group">
          <label>Chapitre</label>
          <select className="form-select" value={targetChapitreId} onChange={e => setTargetChapitreId(e.target.value)}>
            {chapitres.map(c => <option key={c.id} value={c.id}>{c.titre_fr}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Section</label>
          {loading ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Chargement…</p>
          ) : sections.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Aucune autre section « Contenu (blocs) » dans ce chapitre.</p>
          ) : (
            <select className="form-select" value={targetSectionId} onChange={e => setTargetSectionId(e.target.value)}>
              {sections.map(s => <option key={s.id} value={s.id}>{s.titre_fr}</option>)}
            </select>
          )}
        </div>
        <button className="btn-primary" type="button" onClick={handleConfirm} disabled={!targetSectionId || moving}>
          {moving ? 'Déplacement…' : 'Déplacer'}
        </button>
      </div>
    </div>
  )
}
