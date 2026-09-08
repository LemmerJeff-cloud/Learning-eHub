import React, { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import HallOfFameModal from '../components/hof/HallOfFameModal'
import ConfirmModal from '../components/admin/ConfirmModal'

const BUCKET = 'hall-of-fame'

function publicUrl(chemin) {
  return supabase.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl
}

export default function PageHallOfFame({ showToast }) {
  const { user, canEdit } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('hall_of_fame').select('*').order('ordre').order('created_at', { ascending: false })
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setEntries(data)
    setLoading(false)
  }

  async function handleDelete(entry) {
    const { error } = await supabase.from('hall_of_fame').delete().eq('id', entry.id)
    setConfirmDelete(null)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Entrée supprimée', 'success')
    load()
  }

  if (loading) return <p style={{ color: 'var(--text-3)', padding: '2rem' }}>Chargement…</p>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 className="page-heading">🏆 Hall of Fame</h2>
          <p className="page-sub">Les meilleures entreprises d'entraînement.</p>
        </div>
        {canEdit() && <button className="fic-btn" onClick={() => setModal('new')}>➕ Nouvelle entrée</button>}
      </div>

      {entries.length === 0 ? (
        <div className="empty-state"><p>Aucune entrée pour l'instant.</p></div>
      ) : (
        <div className="tiles-grid">
          {entries.map(entry => (
            <div key={entry.id} className="module-tile" style={{ cursor: 'default' }}>
              {entry.image_url ? (
                <img src={publicUrl(entry.image_url)} alt="" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius)', marginBottom: '0.6rem' }} />
              ) : (
                <div className="tile-emoji">🏆</div>
              )}
              <h3>{entry.titre}</h3>
              {(entry.annee || entry.distinction) && (
                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', margin: '0.2rem 0' }}>
                  {[entry.annee, entry.distinction].filter(Boolean).join(' · ')}
                </p>
              )}
              {entry.description && <p>{entry.description}</p>}
              {entry.fichiers?.length > 0 && (
                <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {entry.fichiers.map((f, i) => (
                    <a key={i} href={publicUrl(f.chemin)} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem' }}>
                      ⬇️ {f.nom}
                    </a>
                  ))}
                </div>
              )}
              {canEdit() && (
                <div style={{ marginTop: '0.8rem', textAlign: 'right' }}>
                  <button className="icon-btn" onClick={() => setModal(entry)} title="Modifier">✏️</button>
                  <button className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={() => setConfirmDelete(entry)} title="Supprimer">🗑️</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <HallOfFameModal
          entry={modal === 'new' ? null : modal}
          userId={user.id}
          onClose={() => setModal(null)}
          onSaved={load}
          showToast={showToast}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer cette entrée ?"
          message={`"${confirmDelete.titre}" sera supprimée définitivement.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  )
}
