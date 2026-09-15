import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useOverlayClose } from '../../lib/useOverlayClose'

const BUCKET = 'missions-fichiers'

export default function MissionSubmissions({ mission, onClose, showToast }) {
  const overlayClose = useOverlayClose(onClose)
  const [students, setStudents] = useState([])
  const [rendus, setRendus]     = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { load() }, [mission.id])

  async function load() {
    setLoading(true)
    const studentQuery = mission.classe_id
      ? supabase.from('profiles').select('id, prenom, initiale').eq('classe_id', mission.classe_id).eq('role', 'eleve')
      : supabase.from('profiles').select('id, prenom, initiale').eq('entreprise_id', mission.entreprise_id).eq('role', 'eleve')
    const [{ data: st, error: stError }, { data: rd, error: rdError }] = await Promise.all([
      studentQuery,
      supabase.from('rendus').select('*').eq('mission_id', mission.id),
    ])
    if (stError || rdError) { showToast((stError || rdError).message, 'error'); setLoading(false); return }
    setStudents(st)
    setRendus(rd)
    setLoading(false)
  }

  async function handleDownload(chemin) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(chemin, 60)
    if (error) return
    window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="modal-overlay open" {...overlayClose}>
      <div className="modal" style={{ maxWidth: '640px' }}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>Rendus — {mission.titre}</h2>
        {mission.fichier_url && (
          <button type="button" className="fic-btn" style={{ marginTop: '0.75rem' }} onClick={() => handleDownload(mission.fichier_url)}>
            ⬇️ Télécharger la consigne
          </button>
        )}
        {loading ? <p style={{ color: 'var(--text-3)', marginTop: '1rem' }}>Chargement…</p> : (
          <div className="table-wrap" style={{ marginTop: '1rem' }}>
            <table className="user-table">
              <thead><tr><th>Élève</th><th>Statut</th><th>Commentaire</th><th></th></tr></thead>
              <tbody>
                {students.map(s => {
                  const r = rendus.find(x => x.user_id === s.id)
                  return (
                    <tr key={s.id}>
                      <td>{s.prenom} {s.initiale}</td>
                      <td>{r ? '✅ Rendu' : '— À faire'}</td>
                      <td>{r?.commentaire || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {r?.fichier_url && (
                          <button className="icon-btn" onClick={() => handleDownload(r.fichier_url)} title="Télécharger">⬇️</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {students.length === 0 && (
                  <tr><td colSpan={4} style={{ color: 'var(--text-3)' }}>Aucun élève assigné.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
