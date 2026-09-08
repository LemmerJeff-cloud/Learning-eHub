import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import ConfirmModal from './ConfirmModal'

export default function AdminEntreprises({ showToast }) {
  const [entreprises, setEntreprises] = useState([])
  const [classes, setClasses]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => { load() }, [])

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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
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
  const [nom, setNom]         = useState(entreprise?.nom || '')
  const [classeId, setClasseId] = useState(entreprise?.classe_id || '')
  const [loading, setLoading] = useState(false)

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
    <div className="modal-overlay open" onClick={e => { if (e.target.classList.contains('modal-overlay')) onClose() }}>
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
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
