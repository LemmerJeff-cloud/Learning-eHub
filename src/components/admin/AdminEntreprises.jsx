import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import ConfirmModal from './ConfirmModal'
import { useOverlayClose } from '../../lib/useOverlayClose'
import { downloadAllEntreprisesFilesBackup } from '../../lib/exportEspaceBackup'

export default function AdminEntreprises({ showToast }) {
  const [entreprises, setEntreprises] = useState([])
  const [classes, setClasses]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [backingUp, setBackingUp]     = useState(false)

  useEffect(() => { load() }, [])

  async function handleBackupAll() {
    setBackingUp(true)
    try {
      await downloadAllEntreprisesFilesBackup()
    } catch (err) {
      showToast(err.message || 'Échec de la sauvegarde', 'error')
    } finally {
      setBackingUp(false)
    }
  }

  async function load() {
    setLoading(true)
    const [{ data: ent, error: entError }, { data: cls, error: clsError }] = await Promise.all([
      supabase.from('entreprises').select('*, classe:classes(id,label)').order('nom'),
      supabase.from('classes').select('id, label').order('label'),
    ])
    if (entError || clsError) { showToast((entError || clsError).message, 'error'); setLoading(false); return }
    setEntreprises(ent)
    setClasses(cls)
    setLoading(false)
  }

  async function handleDelete(item) {
    const { error } = await supabase.from('entreprises').delete().eq('id', item.id)
    setConfirmDelete(null)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Entreprise supprimée', 'success')
    load()
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
        <button className="fic-btn" onClick={handleBackupAll} disabled={backingUp}>
          {backingUp ? 'Sauvegarde…' : '⬇️ Backup fichiers (toutes entreprises)'}
        </button>
        <button className="fic-btn" onClick={() => setModal('new')}>➕ Nouvelle entreprise</button>
      </div>

      <div className="table-wrap">
        <table className="user-table">
          <thead><tr><th>Nom</th><th>Classe</th><th></th></tr></thead>
          <tbody>
            {entreprises.map(e => (
              <tr key={e.id}>
                <td>{e.nom}</td>
                <td>{e.classe?.label || '—'}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" onClick={() => setModal(e)} title="Modifier">✏️</button>
                  <button className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={() => setConfirmDelete(e)} title="Supprimer">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <EntrepriseModal
          entreprise={modal === 'new' ? null : modal}
          classes={classes}
          onClose={() => setModal(null)}
          onSaved={load}
          showToast={showToast}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer cette entreprise ?"
          message={`"${confirmDelete.nom}" sera supprimée définitivement.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  )
}

function EntrepriseModal({ entreprise, classes, onClose, onSaved, showToast }) {
  const overlayClose = useOverlayClose(onClose)
  const [nom, setNom]         = useState(entreprise?.nom || '')
  const [classeId, setClasseId] = useState(entreprise?.classe_id || '')
  const [loading, setLoading] = useState(false)
  const [enseignants, setEnseignants] = useState([])
  const [staff, setStaff]             = useState([])
  const [addingId, setAddingId]       = useState('')
  const [loadingStaff, setLoadingStaff] = useState(!!entreprise)

  // Le rattachement enseignant ↔ entreprise (many-to-many) n'existe que pour une
  // entreprise déjà créée — on l'enregistre immédiatement (indépendamment du bouton
  // "Enregistrer" qui ne porte que sur nom/classe), comme dans ClasseDetail.jsx.
  useEffect(() => {
    if (!entreprise) return
    loadStaff()
  }, [entreprise?.id])

  async function loadStaff() {
    setLoadingStaff(true)
    const [{ data: ee, error: eeError }, { data: st, error: stError }] = await Promise.all([
      supabase.from('enseignant_entreprises').select('enseignant:profiles(id, prenom, initiale, role)').eq('entreprise_id', entreprise.id),
      supabase.from('profiles').select('id, prenom, initiale, role').in('role', ['enseignant', 'enseignant_guest', 'admin']).order('prenom'),
    ])
    if (eeError || stError) { showToast((eeError || stError).message, 'error'); setLoadingStaff(false); return }
    setEnseignants((ee || []).map(r => r.enseignant).filter(Boolean))
    setStaff(st || [])
    setLoadingStaff(false)
  }

  async function addEnseignant(id) {
    if (!id) return
    const { error } = await supabase.from('enseignant_entreprises').insert({ enseignant_id: id, entreprise_id: entreprise.id })
    setAddingId('')
    if (error) { showToast(error.message, 'error'); return }
    loadStaff()
  }

  async function removeEnseignant(id) {
    const { error } = await supabase.from('enseignant_entreprises').delete().eq('enseignant_id', id).eq('entreprise_id', entreprise.id)
    if (error) { showToast(error.message, 'error'); return }
    loadStaff()
  }

  const availableStaff = staff.filter(s => !enseignants.some(e => e.id === s.id))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nom.trim()) return
    setLoading(true)
    try {
      const payload = { nom, classe_id: classeId || null }
      if (entreprise) {
        const { error } = await supabase.from('entreprises').update(payload).eq('id', entreprise.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('entreprises').insert(payload)
        if (error) throw error
      }
      showToast(entreprise ? 'Entreprise mise à jour' : 'Entreprise créée', 'success')
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
        <h2>{entreprise ? "Modifier l'entreprise" : 'Nouvelle entreprise'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom</label>
            <input className="form-input" value={nom} onChange={e => setNom(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label>Classe</label>
            <select className="form-select" value={classeId} onChange={e => setClasseId(e.target.value)}>
              <option value="">—</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          {!entreprise && (
            <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '-0.5rem', marginBottom: '1.1rem' }}>
              Enregistrez d'abord l'entreprise, puis rouvrez-la (✏️) pour y rattacher des enseignants.
            </p>
          )}

          {entreprise && (
            <div className="form-group">
              <label>Enseignants rattachés</label>
              <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', margin: '-0.3rem 0 0.6rem' }}>
                Donne accès au chat et aux fichiers de l'espace équipe de cette entreprise. Un enseignant peut être rattaché à plusieurs entreprises.
              </p>
              {loadingStaff ? (
                <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Chargement…</p>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {enseignants.length === 0 && (
                      <span style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>Aucun enseignant rattaché.</span>
                    )}
                    {enseignants.map(en => (
                      <span key={en.id} className="filiere-checkbox checked" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        {en.prenom} {en.initiale}{en.role === 'admin' ? ' (admin)' : ''}
                        <button
                          type="button" onClick={() => removeEnseignant(en.id)}
                          style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: '0.85rem' }}
                          title="Retirer"
                        >✕</button>
                      </span>
                    ))}
                  </div>
                  <select className="form-select" value={addingId} onChange={e => addEnseignant(e.target.value)} style={{ width: 'auto' }}>
                    <option value="">+ Ajouter un enseignant</option>
                    {availableStaff.map(s => (
                      <option key={s.id} value={s.id}>{s.prenom} {s.initiale}{s.role === 'admin' ? ' (admin)' : ''}</option>
                    ))}
                  </select>
                </>
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
