import React, { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import HallOfFameModal, { HOF_TYPES } from '../components/hof/HallOfFameModal'
import ConfirmModal from '../components/admin/ConfirmModal'

const HOF_TYPE_LABEL = Object.fromEntries(HOF_TYPES.map(t => [t.value, t.label]))

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
  const [filterType, setFilterType]   = useState('')
  const [filterAnnee, setFilterAnnee] = useState('')

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

  const annees = [...new Set(entries.map(e => e.annee).filter(Boolean))].sort().reverse()
  const filtersActive = filterType || filterAnnee
  const filtered = entries.filter(e => (!filterType || e.type === filterType) && (!filterAnnee || e.annee === filterAnnee))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div>
          <h2 className="page-heading">🏆 Hall of Fame</h2>
          <p className="page-sub">Les meilleures entreprises d'entraînement.</p>
        </div>
        {canEdit() && <button className="fic-btn" onClick={() => setModal('new')}>➕ Nouvelle entrée</button>}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 'auto' }}>
          <option value="">Tous les types</option>
          {HOF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="form-select" value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)} style={{ width: 'auto' }}>
          <option value="">Toutes les années</option>
          {annees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {filtersActive && (
          <button className="icon-btn" title="Réinitialiser les filtres" onClick={() => { setFilterType(''); setFilterAnnee('') }}>✕</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><p>{entries.length === 0 ? "Aucune entrée pour l'instant." : 'Aucune entrée ne correspond à ces filtres.'}</p></div>
      ) : (
        <div className="tiles-grid">
          {filtered.map(entry => (
            <div key={entry.id} className="module-tile" style={{ cursor: 'default' }}>
              {entry.image_url ? (
                <div style={{ width: '100%', height: '120px', borderRadius: 'var(--radius)', marginBottom: '0.6rem', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img src={publicUrl(entry.image_url)} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              ) : (
                <div className="tile-emoji">🏆</div>
              )}
              {HOF_TYPE_LABEL[entry.type] && (
                <span className="status-badge inactive" style={{ marginBottom: '0.4rem', display: 'inline-flex' }}>
                  {HOF_TYPE_LABEL[entry.type]}
                </span>
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
