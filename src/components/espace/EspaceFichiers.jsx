import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import ConfirmModal from '../admin/ConfirmModal'

const BUCKET = 'espace-fichiers'

export default function EspaceFichiers({ entrepriseId, user, profile, showToast }) {
  const [path, setPath]           = useState([]) // [{id, nom}, ...] — [] = racine
  const [dossiers, setDossiers]   = useState([])
  const [fichiers, setFichiers]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [creatingDossier, setCreatingDossier] = useState(false)
  const [nouveauDossier, setNouveauDossier]   = useState('')
  const [confirmDelete, setConfirmDelete]     = useState(null) // { type: 'fichier'|'dossier', item }

  const currentId = path.length > 0 ? path[path.length - 1].id : null

  useEffect(() => { load() }, [entrepriseId, currentId])

  async function load() {
    setLoading(true)
    const dossiersQuery = supabase.from('espace_dossiers').select('*').eq('entreprise_id', entrepriseId).order('nom')
    const fichiersQuery = supabase.from('espace_fichiers').select('*, profile:profiles(prenom, initiale)').eq('entreprise_id', entrepriseId).order('created_at', { ascending: false })
    const [{ data: dos, error: dosError }, { data: fic, error: ficError }] = await Promise.all([
      currentId ? dossiersQuery.eq('parent_id', currentId) : dossiersQuery.is('parent_id', null),
      currentId ? fichiersQuery.eq('dossier_id', currentId) : fichiersQuery.is('dossier_id', null),
    ])
    if (dosError || ficError) { showToast((dosError || ficError).message, 'error'); setLoading(false); return }
    setDossiers(dos)
    setFichiers(fic)
    setLoading(false)
  }

  function openDossier(d) { setPath([...path, { id: d.id, nom: d.nom }]) }
  function goToBreadcrumb(i) { setPath(path.slice(0, i + 1)) }
  function goToRoot() { setPath([]) }

  async function handleCreateDossier(e) {
    e.preventDefault()
    if (!nouveauDossier.trim()) return
    try {
      const { error } = await supabase.from('espace_dossiers').insert({
        entreprise_id: entrepriseId, parent_id: currentId, nom: nouveauDossier.trim(), created_by: user.id,
      })
      if (error) throw error
      setNouveauDossier('')
      setCreatingDossier(false)
      load()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    }
  }

  async function handleDeleteDossier(d) {
    const { error } = await supabase.from('espace_dossiers').delete().eq('id', d.id)
    setConfirmDelete(null)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Dossier supprimé', 'success')
    load()
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const path_ = `${entrepriseId}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path_, file)
      if (upErr) throw upErr
      const { error: dbErr } = await supabase.from('espace_fichiers').insert({
        entreprise_id: entrepriseId, user_id: user.id, nom: file.name, chemin: path_, taille: file.size,
        dossier_id: currentId,
      })
      if (dbErr) throw dbErr
      showToast('Fichier envoyé', 'success')
      load()
    } catch (err) {
      showToast(err.message || "Échec de l'envoi", 'error')
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(fichier) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(fichier.chemin, 60)
    if (error) { showToast(error.message, 'error'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function handleDeleteFichier(fichier) {
    await supabase.storage.from(BUCKET).remove([fichier.chemin])
    const { error } = await supabase.from('espace_fichiers').delete().eq('id', fichier.id)
    setConfirmDelete(null)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Fichier supprimé', 'success')
    load()
  }

  function formatSize(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  return (
    <div>
      <div className="breadcrumb" style={{ marginBottom: '1rem' }}>
        <button onClick={goToRoot} style={{ fontWeight: path.length === 0 ? 700 : 400 }}>📁 Fichiers</button>
        {path.map((p, i) => (
          <React.Fragment key={p.id}>
            <span className="bc-sep">›</span>
            <button onClick={() => goToBreadcrumb(i)} style={{ fontWeight: i === path.length - 1 ? 700 : 400 }}>
              {p.nom}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <label className="fic-btn" style={{ display: 'inline-block', cursor: 'pointer' }}>
          {uploading ? 'Envoi…' : '➕ Envoyer un fichier'}
          <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
        </label>
        <button className="fic-btn" onClick={() => setCreatingDossier(true)}>📁 Nouveau dossier</button>
      </div>

      {creatingDossier && (
        <form onSubmit={handleCreateDossier} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            className="form-input" autoFocus placeholder="Nom du dossier"
            value={nouveauDossier} onChange={e => setNouveauDossier(e.target.value)}
            style={{ maxWidth: '260px' }}
          />
          <button className="btn-primary" type="submit" style={{ width: 'auto', padding: '0.5rem 1.1rem' }}>Créer</button>
          <button type="button" className="icon-btn" onClick={() => { setCreatingDossier(false); setNouveauDossier('') }}>✕</button>
        </form>
      )}

      {dossiers.length === 0 && fichiers.length === 0 ? (
        <div className="empty-state"><p>Aucun fichier ni dossier ici pour l'instant.</p></div>
      ) : (
        <>
          {dossiers.length > 0 && (
            <div className="tiles-grid" style={{ marginBottom: '1.25rem' }}>
              {dossiers.map(d => (
                <div key={d.id} className="module-tile" onClick={() => openDossier(d)} style={{ position: 'relative' }}>
                  {(d.created_by === user.id || profile?.role === 'admin') && (
                    <div className="tile-actions">
                      <button className="icon-btn danger" onClick={e => { e.stopPropagation(); setConfirmDelete({ type: 'dossier', item: d }) }} title="Supprimer">🗑️</button>
                    </div>
                  )}
                  <div className="tile-emoji">📁</div>
                  <h3>{d.nom}</h3>
                </div>
              ))}
            </div>
          )}

          {fichiers.length > 0 && (
            <div className="table-wrap">
              <table className="user-table">
                <thead><tr><th>Nom</th><th>Envoyé par</th><th>Taille</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {fichiers.map(f => (
                    <tr key={f.id}>
                      <td>{f.nom}</td>
                      <td>{f.profile?.prenom} {f.profile?.initiale}</td>
                      <td>{formatSize(f.taille)}</td>
                      <td>{new Date(f.created_at).toLocaleDateString('fr-FR')}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="icon-btn" onClick={() => handleDownload(f)} title="Télécharger">⬇️</button>
                        {(f.user_id === user.id || profile?.role === 'admin') && (
                          <button className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={() => setConfirmDelete({ type: 'fichier', item: f })} title="Supprimer">🗑️</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {confirmDelete?.type === 'fichier' && (
        <ConfirmModal
          title="Supprimer ce fichier ?"
          message={`"${confirmDelete.item.nom}" sera supprimé définitivement.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDeleteFichier(confirmDelete.item)}
        />
      )}
      {confirmDelete?.type === 'dossier' && (
        <ConfirmModal
          title="Supprimer ce dossier ?"
          message={`"${confirmDelete.item.nom}" et ses sous-dossiers seront supprimés. Les fichiers qu'il contient ne seront pas supprimés : ils remonteront au niveau racine.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDeleteDossier(confirmDelete.item)}
        />
      )}
    </div>
  )
}
