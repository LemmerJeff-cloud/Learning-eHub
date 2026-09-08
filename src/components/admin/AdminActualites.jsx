import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import ConfirmModal from './ConfirmModal'
import FiliereCheckboxes from './FiliereCheckboxes'
import LyceeCheckboxes from './LyceeCheckboxes'

const BUCKET = 'content-images'

export default function AdminActualites({ showToast }) {
  const { user } = useAuth()
  const [items, setItems]     = useState([])
  const [nLycees, setNLycees] = useState(1)
  const [nFilieres, setNFilieres] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data, error }, { count }, { count: countFilieres }] = await Promise.all([
      supabase.from('actualites').select('*').order('ordre'),
      supabase.from('lycees').select('*', { count: 'exact', head: true }),
      supabase.from('filieres').select('*', { count: 'exact', head: true }),
    ])
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setItems(data)
    setNLycees(count ?? 1)
    setNFilieres(countFilieres ?? 1)
    setLoading(false)
  }

  async function handleDelete(item) {
    const { error } = await supabase.from('actualites').delete().eq('id', item.id)
    setConfirmDelete(null)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Actualité supprimée', 'success')
    load()
  }

  async function moveItem(i, dir) {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const a = items[i], b = items[j]
    const previous = items
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    setItems(next)
    try {
      const results = await Promise.all([
        supabase.from('actualites').update({ ordre: b.ordre }).eq('id', a.id),
        supabase.from('actualites').update({ ordre: a.ordre }).eq('id', b.id),
      ])
      const failed = results.find(r => r.error)
      if (failed) throw failed.error
      load()
    } catch (err) {
      setItems(previous)
      showToast(err.message || 'Erreur lors du réordonnancement', 'error')
    }
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="fic-btn" onClick={() => setModal('new')}>➕ Nouvelle actualité</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {items.map((a, i) => (
          <div key={a.id} className="section-row" style={{ cursor: 'default' }}>
            <span style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.86rem' }}>{a.titre}</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                {a.date_affichee} · {a.description}{a.fichiers?.length ? ` · 📎 ${a.fichiers.length}` : ''}
                {(a.filieres?.length < nFilieres || a.lycee_ids?.length < nLycees) ? ' · 🎯 ciblée' : ''}
              </span>
            </span>
            <button className="icon-btn" onClick={() => moveItem(i, -1)} disabled={i === 0} title="Monter">↑</button>
            <button className="icon-btn" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} title="Descendre">↓</button>
            <button className="icon-btn" style={{ marginLeft: '0.35rem' }} onClick={() => setModal(a)} title="Modifier">✏️</button>
            <button className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={() => setConfirmDelete(a)} title="Supprimer">🗑️</button>
          </div>
        ))}
        {items.length === 0 && <p className="empty-state">Aucune actualité.</p>}
      </div>

      {modal && (
        <ActualiteModal
          actualite={modal === 'new' ? null : modal}
          userId={user.id}
          onClose={() => setModal(null)}
          onSaved={load}
          showToast={showToast}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer cette actualité ?"
          message={`"${confirmDelete.titre}" sera supprimée définitivement.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  )
}

function ActualiteModal({ actualite, userId, onClose, onSaved, showToast }) {
  const [titre, setTitre]             = useState(actualite?.titre || '')
  const [description, setDescription] = useState(actualite?.description || '')
  const [dateAffichee, setDateAffichee] = useState(actualite?.date_affichee || '')
  const [fichiers, setFichiers]       = useState(actualite?.fichiers || [])
  const [filieres, setFilieres]       = useState(actualite?.filieres || null)
  const [lyceeIds, setLyceeIds]       = useState(actualite?.lycee_ids || [])
  const [uploading, setUploading]     = useState(false)
  const [loading, setLoading]         = useState(false)

  useEffect(() => {
    if (!actualite) supabase.from('lycees').select('id').then(({ data }) => setLyceeIds((data || []).map(l => l.id)))
  }, [])

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const path = `actualites/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file)
      if (error) throw error
      setFichiers([...fichiers, { nom: file.name, chemin: path }])
    } catch (err) {
      showToast(err.message || "Échec de l'envoi", 'error')
    } finally {
      setUploading(false)
    }
  }

  function removeFichier(i) {
    setFichiers(fichiers.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!titre.trim() || filieres === null) return
    setLoading(true)
    try {
      const payload = { titre, description, date_affichee: dateAffichee, fichiers, filieres, lycee_ids: lyceeIds }
      if (actualite) {
        const { error } = await supabase.from('actualites').update(payload).eq('id', actualite.id)
        if (error) throw error
      } else {
        const { data: maxRows } = await supabase.from('actualites').select('ordre').order('ordre', { ascending: false }).limit(1)
        const ordre = (maxRows?.[0]?.ordre ?? -1) + 1
        const { error } = await supabase.from('actualites').insert({ ...payload, ordre, created_by: userId })
        if (error) throw error
      }
      showToast(actualite ? 'Actualité mise à jour' : 'Actualité créée', 'success')
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
        <h2>{actualite ? "Modifier l'actualité" : 'Nouvelle actualité'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Titre</label>
            <input className="form-input" value={titre} onChange={e => setTitre(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input className="form-input" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Date affichée</label>
            <input className="form-input" value={dateAffichee} onChange={e => setDateAffichee(e.target.value)} placeholder="12 mai 2025" />
          </div>
          <div className="form-group">
            <label>Visible pour les sections</label>
            <FiliereCheckboxes value={filieres} onChange={setFilieres} />
          </div>
          <div className="form-group">
            <label>Visible pour les lycées</label>
            <LyceeCheckboxes value={lyceeIds} onChange={setLyceeIds} />
          </div>
          <div className="form-group">
            <label>Fichiers joints (optionnel)</label>
            {fichiers.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <span style={{ flex: 1, fontSize: '0.82rem' }}>{f.nom}</span>
                <button type="button" className="icon-btn danger" onClick={() => removeFichier(i)} title="Supprimer">🗑️</button>
              </div>
            ))}
            <input type="file" onChange={handleFileUpload} disabled={uploading} />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
