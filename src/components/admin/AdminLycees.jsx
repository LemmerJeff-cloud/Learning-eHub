import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import ConfirmModal from './ConfirmModal'
import ClasseDetail from './ClasseDetail'
import { useOverlayClose } from '../../lib/useOverlayClose'

export default function AdminLycees({ showToast }) {
  const [lycees, setLycees]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null) // null | 'new' | lycee
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [detailLycee, setDetailLycee] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('lycees').select('*').order('nom')
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setLycees(data)
    setLoading(false)
  }

  async function handleDelete(l) {
    const { error } = await supabase.from('lycees').delete().eq('id', l.id)
    setConfirmDelete(null)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Lycée supprimé', 'success')
    load()
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  if (detailLycee) {
    return <LyceeDetail lycee={detailLycee} onClose={() => setDetailLycee(null)} showToast={showToast} />
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="fic-btn" onClick={() => setModal('new')}>➕ Nouveau lycée</button>
      </div>

      <div className="table-wrap">
        <table className="user-table">
          <thead><tr><th>Nom</th><th></th></tr></thead>
          <tbody>
            {lycees.map(l => (
              <tr key={l.id}>
                <td style={{ cursor: 'pointer' }} onClick={() => setDetailLycee(l)} title="Voir les classes">{l.nom}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" onClick={() => setModal(l)} title="Modifier">✏️</button>
                  <button className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={() => setConfirmDelete(l)} title="Supprimer">🗑️</button>
                </td>
              </tr>
            ))}
            {lycees.length === 0 && (
              <tr><td colSpan={2} className="empty-state">Aucun lycée.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <LyceeModal
          lycee={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
          showToast={showToast}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer ce lycée ?"
          message={`"${confirmDelete.nom}" sera supprimé. Les classes qui lui sont rattachées perdront leur affectation (elles ne seront pas supprimées).`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  )
}

function LyceeDetail({ lycee, onClose, showToast }) {
  const [classes, setClasses]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [detailClasse, setDetailClasse] = useState(null)

  useEffect(() => { load() }, [lycee.id])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('classes').select('*, lycee:lycees(id, nom)').eq('lycee_id', lycee.id).order('label')
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setClasses(data)
    setLoading(false)
  }

  if (detailClasse) {
    return (
      <ClasseDetail
        classe={detailClasse}
        onClose={() => setDetailClasse(null)}
        showToast={showToast}
        backLabel={`← Retour à ${lycee.nom}`}
      />
    )
  }

  return (
    <div>
      <button className="fic-btn" style={{ marginBottom: '1rem' }} onClick={onClose}>← Retour aux lycées</button>
      <h3 style={{ marginBottom: '1.25rem' }}>{lycee.nom}</h3>

      {loading ? (
        <p style={{ color: 'var(--text-3)' }}>Chargement…</p>
      ) : (
        <div className="table-wrap">
          <table className="user-table">
            <thead><tr><th>Label</th><th>Filière</th><th>Année</th></tr></thead>
            <tbody>
              {classes.length === 0 && (
                <tr><td colSpan={3} className="empty-state">Aucune classe pour ce lycée.</td></tr>
              )}
              {classes.map(c => (
                <tr key={c.id}>
                  <td style={{ cursor: 'pointer' }} onClick={() => setDetailClasse(c)} title="Voir les élèves">{c.label}</td>
                  <td>{c.section}</td>
                  <td>{c.annee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function LyceeModal({ lycee, onClose, onSaved, showToast }) {
  const overlayClose = useOverlayClose(onClose)
  const [nom, setNom]         = useState(lycee?.nom || '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nom.trim()) return
    setLoading(true)
    try {
      if (lycee) {
        const { error } = await supabase.from('lycees').update({ nom }).eq('id', lycee.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('lycees').insert({ nom })
        if (error) throw error
      }
      showToast(lycee ? 'Lycée mis à jour' : 'Lycée créé', 'success')
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
        <h2>{lycee ? 'Modifier le lycée' : 'Nouveau lycée'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom (ou sigle)</label>
            <input className="form-input" value={nom} onChange={e => setNom(e.target.value)} autoFocus placeholder="LNB" />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
