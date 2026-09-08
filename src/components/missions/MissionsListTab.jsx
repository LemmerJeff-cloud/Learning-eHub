import React, { useState, useEffect } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import MissionModal from './MissionModal'
import MissionSubmissions from './MissionSubmissions'
import SubmitModal from './SubmitModal'
import ConfirmModal from '../admin/ConfirmModal'

export default function MissionsListTab({ matiereId, showToast }) {
  const { user, profile, canEditMatiere } = useAuth()
  const canEdit = () => canEditMatiere(matiereId)
  const [missions, setMissions]   = useState([])
  const [myRendus, setMyRendus]   = useState({})
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [viewSubs, setViewSubs]   = useState(null)
  const [submitFor, setSubmitFor] = useState(null)

  useEffect(() => { if (profile && matiereId) load() }, [profile, matiereId])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('missions')
      .select('*, classe:classes(id,label), entreprise:entreprises(id,nom)')
      .eq('matiere_id', matiereId)
      .order('deadline', { ascending: true, nullsFirst: false })
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setMissions(data)
    if (!canEdit()) {
      const { data: rendus, error: rendusError } = await supabase.from('rendus').select('*').eq('user_id', user.id)
      if (rendusError) { showToast(rendusError.message, 'error'); setLoading(false); return }
      setMyRendus(Object.fromEntries(rendus.map(r => [r.mission_id, r])))
      const doneIds = new Set(rendus.map(r => r.mission_id))
      const openCount = data.filter(m => !doneIds.has(m.id)).length
      window.dispatchEvent(new CustomEvent('missions:open-count', { detail: { count: openCount } }))
    }
    setLoading(false)
  }

  async function handleDelete(m) {
    const { error } = await supabase.from('missions').delete().eq('id', m.id)
    setConfirmDelete(null)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Mission supprimée', 'success')
    load()
  }

  if (loading) return <p style={{ color: 'var(--text-3)', padding: '2rem' }}>Chargement…</p>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 className="page-heading">Missions</h2>
          <p className="page-sub">{canEdit() ? 'Gérez les missions de vos classes et entreprises.' : 'Vos tâches en cours.'}</p>
        </div>
        {canEdit() && <button className="fic-btn" onClick={() => setModal('new')}>➕ Nouvelle mission</button>}
      </div>

      {missions.length === 0 ? (
        <div className="empty-state"><p>Aucune mission pour l'instant.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {missions.map(m => {
            const cible = m.classe?.label || m.entreprise?.nom || '—'
            const rendu = myRendus[m.id]
            return (
              <div key={m.id} className="section-row" onClick={() => canEdit() ? setViewSubs(m) : setSubmitFor(m)}>
                <span style={{ flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: '0.86rem' }}>{m.titre}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    {cible}{m.deadline ? ` · échéance ${new Date(m.deadline).toLocaleDateString('fr-FR')}` : ''}
                  </span>
                </span>
                {!canEdit() && (
                  <span className="section-row-tag">{rendu ? '✅ Rendu' : 'À faire'}</span>
                )}
                {canEdit() && (
                  <>
                    <button className="icon-btn" onClick={e => { e.stopPropagation(); setModal(m) }} title="Modifier">✏️</button>
                    <button className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={e => { e.stopPropagation(); setConfirmDelete(m) }} title="Supprimer">🗑️</button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <MissionModal
          mission={modal === 'new' ? null : modal}
          matiereId={matiereId}
          userId={user.id}
          onClose={() => setModal(null)}
          onSaved={load}
          showToast={showToast}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer cette mission ?"
          message={`"${confirmDelete.titre}" et tous ses rendus seront supprimés définitivement.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
      {viewSubs && (
        <MissionSubmissions mission={viewSubs} onClose={() => setViewSubs(null)} showToast={showToast} />
      )}
      {submitFor && (
        <SubmitModal
          mission={submitFor}
          existing={myRendus[submitFor.id]}
          userId={user.id}
          onClose={() => setSubmitFor(null)}
          onSaved={load}
          showToast={showToast}
        />
      )}
    </div>
  )
}
