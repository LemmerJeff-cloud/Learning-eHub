import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useOverlayClose } from '../../lib/useOverlayClose'

const BUCKET = 'missions-fichiers'

export default function SubmitModal({ mission, existing, userId, onClose, onSaved, showToast }) {
  const overlayClose = useOverlayClose(onClose)
  const [commentaire, setCommentaire] = useState(existing?.commentaire || '')
  const [file, setFile]               = useState(null)
  const [loading, setLoading]         = useState(false)

  async function handleDownload(chemin) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(chemin, 60)
    if (error) return
    window.open(data.signedUrl, '_blank')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      let fichierUrl = existing?.fichier_url || null
      if (file) {
        const path = `${mission.id}/${userId}/${Date.now()}-${file.name}`
        const { error } = await supabase.storage.from(BUCKET).upload(path, file)
        if (error) throw error
        fichierUrl = path
      }
      const payload = { mission_id: mission.id, user_id: userId, commentaire, fichier_url: fichierUrl }
      const { error } = await supabase.from('rendus').upsert(payload, { onConflict: 'mission_id,user_id' })
      if (error) throw error
      showToast('Rendu envoyé', 'success')
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
        <h2>{mission.titre}</h2>
        {mission.description && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginTop: '0.5rem', marginBottom: '1rem' }}>
            {mission.description}
          </p>
        )}
        {mission.fichier_url && (
          <button type="button" className="fic-btn" style={{ marginBottom: '1rem' }} onClick={() => handleDownload(mission.fichier_url)}>
            ⬇️ Télécharger la consigne
          </button>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Commentaire</label>
            <textarea className="form-input" rows={4} value={commentaire} onChange={e => setCommentaire(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Fichier {existing?.fichier_url && !file && '(un fichier est déjà envoyé — en choisir un nouveau le remplace)'}</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Envoi…' : existing ? 'Mettre à jour mon rendu' : 'Envoyer mon rendu'}
          </button>
        </form>
      </div>
    </div>
  )
}
