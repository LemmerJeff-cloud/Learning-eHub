import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useOverlayClose } from '../../lib/useOverlayClose'

const BUCKET = 'missions-fichiers'

export default function MissionModal({ mission, matiereId, userId, onClose, onSaved, showToast }) {
  const overlayClose = useOverlayClose(onClose)
  const [titre, setTitre]             = useState(mission?.titre || '')
  const [description, setDescription] = useState(mission?.description || '')
  const [deadline, setDeadline]       = useState(mission?.deadline || '')
  const [cible, setCible]             = useState(mission?.entreprise_id ? 'entreprise' : 'classe')
  const [classeId, setClasseId]       = useState(mission?.classe_id || '')
  const [entrepriseId, setEntrepriseId] = useState(mission?.entreprise_id || '')
  const [classes, setClasses]         = useState([])
  const [entreprises, setEntreprises] = useState([])
  const [file, setFile]               = useState(null)
  const [loading, setLoading]         = useState(false)

  useEffect(() => {
    supabase.from('classes').select('id, label').order('label').then(({ data, error }) => {
      if (error) { showToast(error.message, 'error'); return }
      setClasses(data)
    })
    supabase.from('entreprises').select('id, nom').order('nom').then(({ data, error }) => {
      if (error) { showToast(error.message, 'error'); return }
      setEntreprises(data)
    })
  }, [])

  async function uploadFile(missionId) {
    const path = `${missionId}/consigne/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file)
    if (error) throw error
    return path
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!titre.trim()) return
    if (cible === 'classe' && !classeId) { showToast('Choisissez une classe', 'error'); return }
    if (cible === 'entreprise' && !entrepriseId) { showToast('Choisissez une entreprise', 'error'); return }
    setLoading(true)
    try {
      const payload = {
        titre, description, deadline: deadline || null,
        classe_id: cible === 'classe' ? classeId : null,
        entreprise_id: cible === 'entreprise' ? entrepriseId : null,
      }
      let missionId = mission?.id
      if (mission) {
        const { error } = await supabase.from('missions').update(payload).eq('id', mission.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('missions').insert({ ...payload, matiere_id: matiereId, created_by: userId }).select('id').single()
        if (error) throw error
        missionId = data.id
      }
      if (file) {
        const path = await uploadFile(missionId)
        const { error } = await supabase.from('missions').update({ fichier_url: path }).eq('id', missionId)
        if (error) throw error
      }
      showToast(mission ? 'Mission mise à jour' : 'Mission créée', 'success')
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
        <h2>{mission ? 'Modifier la mission' : 'Nouvelle mission'}</h2>
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
            <label>Date limite</label>
            <input className="form-input" type="date" value={deadline || ''} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Destinataires</label>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.82rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 400 }}>
                <input type="radio" checked={cible === 'classe'} onChange={() => setCible('classe')} /> Classe
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 400 }}>
                <input type="radio" checked={cible === 'entreprise'} onChange={() => setCible('entreprise')} /> Entreprise
              </label>
            </div>
            {cible === 'classe' ? (
              <select className="form-select" value={classeId} onChange={e => setClasseId(e.target.value)}>
                <option value="">— Choisir —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            ) : (
              <select className="form-select" value={entrepriseId} onChange={e => setEntrepriseId(e.target.value)}>
                <option value="">— Choisir —</option>
                {entreprises.map(en => <option key={en.id} value={en.id}>{en.nom}</option>)}
              </select>
            )}
          </div>
          <div className="form-group">
            <label>Pièce jointe (consigne)</label>
            {mission?.fichier_url && !file && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '0.3rem' }}>
                Un fichier est déjà joint — en choisir un nouveau le remplace.
              </p>
            )}
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
