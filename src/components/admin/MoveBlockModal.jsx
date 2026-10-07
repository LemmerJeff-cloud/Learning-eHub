import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useOverlayClose } from '../../lib/useOverlayClose'

export default function MoveBlockModal({
  chapitres, currentChapitreId, currentSectionId, onClose, onConfirm, showToast,
  title = 'Déplacer le bloc', requireBlocsType = true,
}) {
  const overlayClose = useOverlayClose(onClose)
  const [targetChapitreId, setTargetChapitreId] = useState(currentChapitreId)
  const [groups, setGroups]                     = useState([])
  const [targetSectionId, setTargetSectionId]   = useState('')
  const [loading, setLoading]                   = useState(true)
  const [moving, setMoving]                     = useState(false)

  useEffect(() => { loadSections(targetChapitreId) }, [targetChapitreId])

  // Regroupe les sections sélectionnables par section de premier niveau — une section non
  // retenue elle-même (ex. type editeur, quand on exige « blocs ») peut tout de même avoir
  // des parties éligibles, elle sert alors juste d'en-tête de groupe.
  async function loadSections(chId) {
    setLoading(true)
    setTargetSectionId('')
    const { data, error } = await supabase.from('sections_cours').select('id, titre_fr, type, parent_section_id').eq('chapitre_id', chId).order('ordre')
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    const all = data || []
    const eligible = s => (!requireBlocsType || s.type === 'blocs') && s.id !== currentSectionId
    const topLevel = all.filter(s => !s.parent_section_id)
    const built = topLevel
      .map(top => ({
        top,
        selectable: eligible(top),
        parties: all.filter(p => p.parent_section_id === top.id && eligible(p)),
      }))
      .filter(g => g.selectable || g.parties.length > 0)
    setGroups(built)
    const first = built.find(g => g.selectable)?.top.id ?? built.find(g => g.parties.length > 0)?.parties[0]?.id ?? ''
    setTargetSectionId(first)
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
        <h2>{title}</h2>
        <div className="form-group">
          <label>Chapitre</label>
          <select className="form-select" value={targetChapitreId} onChange={e => setTargetChapitreId(e.target.value)}>
            {chapitres.map(c => <option key={c.id} value={c.id}>{c.titre_fr}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Section ou partie</label>
          {loading ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Chargement…</p>
          ) : groups.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
              {requireBlocsType
                ? 'Aucune autre section ou partie « Contenu (blocs) » dans ce chapitre.'
                : 'Aucune autre section ou partie dans ce chapitre.'}
            </p>
          ) : (
            <select className="form-select" value={targetSectionId} onChange={e => setTargetSectionId(e.target.value)}>
              {groups.map(g => (
                <optgroup key={g.top.id} label={g.top.titre_fr}>
                  {g.selectable && <option value={g.top.id}>{g.top.titre_fr} (section)</option>}
                  {g.parties.map(p => <option key={p.id} value={p.id}>↳ {p.titre_fr}</option>)}
                </optgroup>
              ))}
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
