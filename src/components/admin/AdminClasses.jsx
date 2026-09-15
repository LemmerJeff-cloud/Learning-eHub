import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import ConfirmModal from './ConfirmModal'
import ClasseDetail from './ClasseDetail'
import { useOverlayClose } from '../../lib/useOverlayClose'

export default function AdminClasses({ showToast }) {
  const { isAdmin } = useAuth()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | classe
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [detailClasse, setDetailClasse] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('classes').select('*, lycee:lycees(id, nom)').order('label')
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setClasses(data)
    setLoading(false)
  }

  async function handleDelete(c) {
    const { error } = await supabase.from('classes').delete().eq('id', c.id)
    setConfirmDelete(null)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Classe supprimée', 'success')
    load()
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  if (detailClasse) {
    return <ClasseDetail classe={detailClasse} onClose={() => setDetailClasse(null)} showToast={showToast} />
  }

  return (
    <div>
      {isAdmin() && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className="fic-btn" onClick={() => setModal('new')}>➕ Nouvelle classe</button>
        </div>
      )}

      <div className="table-wrap">
        <table className="user-table">
          <thead><tr><th>Label</th><th>Filière</th><th>Lycée</th><th>Année</th><th></th></tr></thead>
          <tbody>
            {classes.map(c => (
              <tr key={c.id}>
                <td style={{ cursor: 'pointer' }} onClick={() => setDetailClasse(c)} title="Voir les élèves">{c.label}</td>
                <td>{c.section}</td>
                <td>{c.lycee?.nom || '—'}</td>
                <td>{c.annee}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {isAdmin() && (
                    <>
                      <button className="icon-btn" onClick={() => setModal(c)} title="Modifier">✏️</button>
                      <button className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={() => setConfirmDelete(c)} title="Supprimer">🗑️</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <ClasseModal
          classe={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
          showToast={showToast}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer cette classe ?"
          message={`"${confirmDelete.label}" sera supprimée, ainsi que ses entreprises et missions associées. Les élèves perdront leur affectation de classe.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  )
}

function ClasseModal({ classe, onClose, onSaved, showToast }) {
  const overlayClose = useOverlayClose(onClose)
  const [label, setLabel]     = useState(classe?.label || '')
  const [section, setSection] = useState(classe?.section || '')
  const [annee, setAnnee]     = useState(classe?.annee || '2025/2026')
  const [lycees, setLycees]   = useState([])
  const [lyceeId, setLyceeId] = useState(classe?.lycee_id || '')
  const [filieres, setFilieres] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('lycees').select('*').order('nom').then(({ data }) => {
      setLycees(data || [])
      if (!classe && !lyceeId && data?.length > 0) setLyceeId(data[0].id)
    })
    supabase.from('filieres').select('*').order('ordre').then(({ data }) => {
      setFilieres(data || [])
      if (!classe && !section && data?.length > 0) setSection(data[0].code)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!label.trim()) return
    setLoading(true)
    try {
      if (classe) {
        const { error } = await supabase.from('classes').update({ label, section, annee, lycee_id: lyceeId || null }).eq('id', classe.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('classes').insert({ label, section, annee, lycee_id: lyceeId || null })
        if (error) throw error
      }
      showToast(classe ? 'Classe mise à jour' : 'Classe créée', 'success')
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
        <h2>{classe ? 'Modifier la classe' : 'Nouvelle classe'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Label</label>
            <input className="form-input" value={label} onChange={e => setLabel(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label>Filière</label>
            <select className="form-select" value={section} onChange={e => setSection(e.target.value)}>
              {filieres.map(f => <option key={f.code} value={f.code}>{f.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Lycée</label>
            <select className="form-select" value={lyceeId} onChange={e => setLyceeId(e.target.value)}>
              {lycees.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Année</label>
            <input className="form-input" value={annee} onChange={e => setAnnee(e.target.value)} />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
