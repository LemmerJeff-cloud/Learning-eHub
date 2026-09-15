import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import ConfirmModal from './ConfirmModal'
import EmojiPicker from './EmojiPicker'
import { useOverlayClose } from '../../lib/useOverlayClose'

export default function AdminMatieres({ showToast }) {
  const { isAdmin } = useAuth()
  const [matieres, setMatieres] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null) // null | 'new' | matiere
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [detailMatiere, setDetailMatiere] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('matieres').select('*').order('ordre')
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setMatieres(data)
    setLoading(false)
  }

  async function handleDelete(m) {
    const { error } = await supabase.from('matieres').delete().eq('id', m.id)
    setConfirmDelete(null)
    if (error) { showToast("Suppression impossible : cette matière contient encore des chapitres. Déplacez ou supprimez-les d'abord.", 'error'); return }
    showToast('Matière supprimée', 'success')
    load()
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  if (detailMatiere) {
    return <MatiereDetail matiere={detailMatiere} onClose={() => setDetailMatiere(null)} showToast={showToast} />
  }

  return (
    <div>
      {isAdmin() && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className="fic-btn" onClick={() => setModal('new')}>➕ Nouvelle matière</button>
        </div>
      )}

      <div className="table-wrap">
        <table className="user-table">
          <thead><tr><th>Matière</th><th></th></tr></thead>
          <tbody>
            {matieres.map(m => (
              <tr key={m.id}>
                <td style={{ cursor: 'pointer' }} onClick={() => setDetailMatiere(m)} title="Voir les enseignants affectés">
                  {m.emoji} {m.nom}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {isAdmin() && (
                    <>
                      <button className="icon-btn" onClick={() => setModal(m)} title="Modifier">✏️</button>
                      <button className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={() => setConfirmDelete(m)} title="Supprimer">🗑️</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {matieres.length === 0 && (
              <tr><td colSpan={2} className="empty-state">Aucune matière.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <MatiereModal
          matiere={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
          showToast={showToast}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer cette matière ?"
          message={`"${confirmDelete.nom}" sera supprimée. Impossible si des chapitres ou missions y sont encore rattachés.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  )
}

function MatiereDetail({ matiere, onClose, showToast }) {
  const [enseignants, setEnseignants] = useState([])
  const [staff, setStaff]             = useState([])
  const [addingId, setAddingId]       = useState('')
  const [loading, setLoading]         = useState(true)

  useEffect(() => { load() }, [matiere.id])

  async function load() {
    setLoading(true)
    const [{ data: em, error: emError }, { data: st, error: stError }] = await Promise.all([
      supabase.from('enseignant_matieres').select('niveau, enseignant:profiles(id, prenom, initiale, role)').eq('matiere_id', matiere.id),
      supabase.from('profiles').select('id, prenom, initiale, role').in('role', ['enseignant', 'enseignant_guest']).order('prenom'),
    ])
    if (emError || stError) { showToast((emError || stError).message, 'error'); setLoading(false); return }
    setEnseignants((em || []).filter(r => r.enseignant).map(r => ({ ...r.enseignant, niveau: r.niveau })))
    setStaff(st || [])
    setLoading(false)
  }

  async function addEnseignant(id) {
    if (!id) return
    const { error } = await supabase.from('enseignant_matieres').insert({ enseignant_id: id, matiere_id: matiere.id, niveau: 'ecriture' })
    setAddingId('')
    if (error) { showToast(error.message, 'error'); return }
    load()
  }

  async function updateNiveau(id, niveau) {
    const { error } = await supabase.from('enseignant_matieres').update({ niveau }).eq('enseignant_id', id).eq('matiere_id', matiere.id)
    if (error) { showToast(error.message, 'error'); return }
    load()
  }

  async function removeEnseignant(id) {
    const { error } = await supabase.from('enseignant_matieres').delete().eq('enseignant_id', id).eq('matiere_id', matiere.id)
    if (error) { showToast(error.message, 'error'); return }
    load()
  }

  const availableStaff = staff.filter(s => !enseignants.some(e => e.id === s.id))

  return (
    <div>
      <button className="fic-btn" style={{ marginBottom: '1rem' }} onClick={onClose}>← Retour aux matières</button>
      <h3 style={{ marginBottom: '1.25rem' }}>{matiere.emoji} {matiere.nom}</h3>

      {loading ? (
        <p style={{ color: 'var(--text-3)' }}>Chargement…</p>
      ) : (
        <div>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '0.6rem' }}>
            Enseignants affectés
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {enseignants.length === 0 && (
              <span style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>Aucun enseignant affecté.</span>
            )}
            {enseignants.map(en => (
              <div key={en.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ flex: 1, fontSize: '0.85rem' }}>
                  {en.prenom} {en.initiale}{en.role === 'enseignant_guest' ? ' (invité, toujours lecture seule)' : ''}
                </span>
                {en.role === 'enseignant' ? (
                  <select className="form-select" style={{ width: 'auto' }} value={en.niveau} onChange={e => updateNiveau(en.id, e.target.value)}>
                    <option value="lecture">Lecture seule</option>
                    <option value="ecriture">Lecture + écriture</option>
                  </select>
                ) : (
                  <span className="status-badge inactive">Lecture seule</span>
                )}
                <button
                  type="button" className="icon-btn danger" onClick={() => removeEnseignant(en.id)}
                  title="Retirer"
                >✕</button>
              </div>
            ))}
          </div>
          <select className="form-select" value={addingId} onChange={e => addEnseignant(e.target.value)} style={{ width: 'auto' }}>
            <option value="">+ Affecter un enseignant</option>
            {availableStaff.map(s => (
              <option key={s.id} value={s.id}>{s.prenom} {s.initiale}{s.role === 'enseignant_guest' ? ' (invité)' : ''}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

function MatiereModal({ matiere, onClose, onSaved, showToast }) {
  const overlayClose = useOverlayClose(onClose)
  const [nom, setNom]         = useState(matiere?.nom || '')
  const [emoji, setEmoji]     = useState(matiere?.emoji || '📘')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nom.trim()) return
    setLoading(true)
    try {
      if (matiere) {
        const { error } = await supabase.from('matieres').update({ nom, emoji }).eq('id', matiere.id)
        if (error) throw error
      } else {
        const { data: maxRows } = await supabase.from('matieres').select('ordre').order('ordre', { ascending: false }).limit(1)
        const ordre = (maxRows?.[0]?.ordre ?? -1) + 1
        const { error } = await supabase.from('matieres').insert({ nom, emoji, ordre })
        if (error) throw error
      }
      showToast(matiere ? 'Matière mise à jour' : 'Matière créée', 'success')
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
        <h2>{matiere ? 'Modifier la matière' : 'Nouvelle matière'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Emoji</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <EmojiPicker value={emoji} onChange={setEmoji} />
              <input className="form-input" style={{ width: '4rem' }} value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={4} placeholder="ou tapez" />
            </div>
          </div>
          <div className="form-group">
            <label>Nom</label>
            <input className="form-input" value={nom} onChange={e => setNom(e.target.value)} autoFocus placeholder="Mathématiques" />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
