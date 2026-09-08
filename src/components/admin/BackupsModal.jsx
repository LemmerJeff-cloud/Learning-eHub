import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { restoreChapitreBackup } from '../../lib/backup'
import ConfirmModal from './ConfirmModal'

export default function BackupsModal({ chapitre, onClose, onRestored, showToast }) {
  const { user } = useAuth()
  const [backups, setBackups]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [confirmRestore, setConfirmRestore] = useState(null)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('content_backups')
      .select('*, auteur:profiles(prenom, initiale)')
      .eq('chapitre_id', chapitre.id)
      .order('created_at', { ascending: false })
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setBackups(data)
    setLoading(false)
  }

  async function handleRestore(backup) {
    setRestoring(true)
    try {
      await restoreChapitreBackup(backup, user.id)
      showToast('Chapitre restauré', 'success')
      setConfirmRestore(null)
      onRestored()
      onClose()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <>
      <div className="modal-overlay open" onClick={e => { if (e.target.classList.contains('modal-overlay')) onClose() }}>
        <div className="modal">
          <button className="modal-close" onClick={onClose}>✕</button>
          <h2>Sauvegardes — {chapitre.titre_fr}</h2>

          {loading ? (
            <p style={{ color: 'var(--text-3)' }}>Chargement…</p>
          ) : backups.length === 0 ? (
            <div className="empty-state"><p>Aucune sauvegarde pour ce chapitre.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {backups.map(b => {
                const nbSections = b.snapshot?.sections?.length ?? 0
                return (
                  <div key={b.id} className="section-row" style={{ cursor: 'default' }}>
                    <span style={{ flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: '0.86rem' }}>{b.label || 'Sauvegarde'}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                        {new Date(b.created_at).toLocaleString('fr-FR')}
                        {b.auteur ? ` · ${b.auteur.prenom} ${b.auteur.initiale}.` : ''}
                        {` · ${nbSections} section${nbSections > 1 ? 's' : ''}`}
                      </span>
                    </span>
                    <button className="fic-btn" disabled={restoring} onClick={() => setConfirmRestore(b)}>↩️ Restaurer</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {confirmRestore && (
        <ConfirmModal
          title="Restaurer cette sauvegarde ?"
          message="Le titre, la description et le contenu des sections de ce chapitre seront remplacés par cette version. Les sections ajoutées depuis cette sauvegarde ne seront pas supprimées. L'état actuel est sauvegardé automatiquement avant la restauration."
          confirmLabel="Restaurer"
          onCancel={() => setConfirmRestore(null)}
          onConfirm={() => handleRestore(confirmRestore)}
        />
      )}
    </>
  )
}
