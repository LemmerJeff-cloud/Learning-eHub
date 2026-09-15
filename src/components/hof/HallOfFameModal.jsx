import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useOverlayClose } from '../../lib/useOverlayClose'

const BUCKET = 'hall-of-fame'

export default function HallOfFameModal({ entry, userId, onClose, onSaved, showToast }) {
  const overlayClose = useOverlayClose(onClose)
  const [titre, setTitre]             = useState(entry?.titre || '')
  const [description, setDescription] = useState(entry?.description || '')
  const [annee, setAnnee]             = useState(entry?.annee || '')
  const [distinction, setDistinction] = useState(entry?.distinction || '')
  const [imageUrl, setImageUrl]       = useState(entry?.image_url || null)
  const [fichiers, setFichiers]       = useState(entry?.fichiers || [])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingFichier, setUploadingFichier] = useState(false)
  const [loading, setLoading]         = useState(false)

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingImage(true)
    try {
      const path = `images/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file)
      if (error) throw error
      setImageUrl(path)
    } catch (err) {
      showToast(err.message || "Échec de l'envoi", 'error')
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleFichierUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingFichier(true)
    try {
      const path = `fichiers/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file)
      if (error) throw error
      setFichiers([...fichiers, { nom: file.name, chemin: path }])
    } catch (err) {
      showToast(err.message || "Échec de l'envoi", 'error')
    } finally {
      setUploadingFichier(false)
    }
  }

  function removeFichier(i) {
    setFichiers(fichiers.filter((_, idx) => idx !== i))
  }

  function publicUrl(chemin) {
    return supabase.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!titre.trim()) return
    setLoading(true)
    try {
      const payload = { titre, description, annee, distinction, image_url: imageUrl, fichiers }
      if (entry) {
        const { error } = await supabase.from('hall_of_fame').update(payload).eq('id', entry.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('hall_of_fame').insert({ ...payload, created_by: userId })
        if (error) throw error
      }
      showToast(entry ? 'Entrée mise à jour' : 'Entrée créée', 'success')
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
        <h2>{entry ? "Modifier l'entrée" : 'Nouvelle entrée'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Titre</label>
            <input className="form-input" value={titre} onChange={e => setTitre(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="form-input" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Année</label>
            <input className="form-input" value={annee} onChange={e => setAnnee(e.target.value)} placeholder="2025/2026" />
          </div>
          <div className="form-group">
            <label>Distinction</label>
            <input className="form-input" value={distinction} onChange={e => setDistinction(e.target.value)} placeholder="Prix du Jury" />
          </div>
          <div className="form-group">
            <label>Image</label>
            {imageUrl && (
              <img src={publicUrl(imageUrl)} alt="" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: 'var(--radius)', marginBottom: '0.5rem' }} />
            )}
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
          </div>
          <div className="form-group">
            <label>Fichiers téléchargeables</label>
            {fichiers.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <span style={{ flex: 1, fontSize: '0.82rem' }}>{f.nom}</span>
                <button type="button" className="icon-btn danger" onClick={() => removeFichier(i)} title="Supprimer">🗑️</button>
              </div>
            ))}
            <input type="file" onChange={handleFichierUpload} disabled={uploadingFichier} />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
