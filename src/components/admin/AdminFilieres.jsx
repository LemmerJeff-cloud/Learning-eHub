import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import ConfirmModal from './ConfirmModal'

export default function AdminFilieres({ showToast }) {
  const [filieres, setFilieres] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null) // null | 'new' | filiere
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('filieres').select('*').order('ordre')
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setFilieres(data)
    setLoading(false)
  }

  async function handleDelete(f) {
    const { error } = await supabase.from('filieres').delete().eq('id', f.id)
    setConfirmDelete(null)
    if (error) { showToast("Suppression impossible : des classes utilisent encore cette filière.", 'error'); return }
    showToast('Filière supprimée', 'success')
    load()
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="fic-btn" onClick={() => setModal('new')}>➕ Nouvelle filière</button>
      </div>

      <div className="table-wrap">
        <table className="user-table">
          <thead><tr><th>Code</th><th>Label</th><th>Couleur</th><th></th></tr></thead>
          <tbody>
            {filieres.map(f => (
              <tr key={f.id}>
                <td>{f.code}</td>
                <td>{f.label}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, background: f.couleur, border: '1px solid var(--border)' }} />
                    {f.couleur}
                  </span>
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" onClick={() => setModal(f)} title="Modifier">✏️</button>
                  <button className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={() => setConfirmDelete(f)} title="Supprimer">🗑️</button>
                </td>
              </tr>
            ))}
            {filieres.length === 0 && (
              <tr><td colSpan={4} className="empty-state">Aucune filière.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <FiliereModal
          filiere={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
          showToast={showToast}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer cette filière ?"
          message={`"${confirmDelete.label}" sera supprimée. Impossible si des classes utilisent encore ce code.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  )
}

function FiliereModal({ filiere, onClose, onSaved, showToast }) {
  const [code, setCode]       = useState(filiere?.code || '')
  const [label, setLabel]     = useState(filiere?.label || '')
  const [couleur, setCouleur] = useState(filiere?.couleur || '#1B2A6B')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!code.trim() || !label.trim()) return
    setLoading(true)
    try {
      if (filiere) {
        const { error } = await supabase.from('filieres').update({ label, couleur }).eq('id', filiere.id)
        if (error) throw error
      } else {
        const { data: maxRows } = await supabase.from('filieres').select('ordre').order('ordre', { ascending: false }).limit(1)
        const ordre = (maxRows?.[0]?.ordre ?? -1) + 1
        const { error } = await supabase.from('filieres').insert({ code: code.trim(), label, couleur, ordre })
        if (error) throw error
      }
      showToast(filiere ? 'Filière mise à jour' : 'Filière créée', 'success')
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
        <h2>{filiere ? 'Modifier la filière' : 'Nouvelle filière'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Code</label>
            <input
              className="form-input" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              autoFocus disabled={!!filiere} placeholder="4TPCM"
            />
            {filiere && <small style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Le code ne peut pas être changé après création.</small>}
          </div>
          <div className="form-group">
            <label>Label affiché</label>
            <input className="form-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="4TPCM" />
          </div>
          <div className="form-group">
            <label>Couleur</label>
            <input
              type="color" className="tiptap-color-input" value={couleur}
              onChange={e => setCouleur(e.target.value)}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
