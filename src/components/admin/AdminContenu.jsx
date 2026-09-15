import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { downloadChapitreWord } from '../../lib/exportWord'
import { downloadAllCoursesBackup } from '../../lib/exportAllCourses'
import BackupsModal from './BackupsModal'

export default function AdminContenu({ showToast }) {
  const { isAdmin, isProf } = useAuth()
  const canExport = isAdmin() || isProf()
  const [chapitres, setChapitres] = useState([])
  const [loading, setLoading]     = useState(true)
  const [exportingId, setExportingId] = useState(null)
  const [backupsModal, setBackupsModal] = useState(null)
  const [backingUp, setBackingUp] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    // matiere_ids est un tableau (un chapitre peut appartenir à plusieurs matières) : pas de FK
    // directe embarquable par PostgREST, on résout les noms séparément (même pattern que
    // demande_enseignant dans AdminUsers.jsx).
    const [{ data, error }, { data: matieres, error: matieresError }] = await Promise.all([
      supabase.from('chapitres').select('*').order('ordre'),
      supabase.from('matieres').select('id, nom'),
    ])
    if (error || matieresError) { showToast((error || matieresError).message, 'error'); setLoading(false); return }
    const nomById = Object.fromEntries((matieres || []).map(m => [m.id, m.nom]))
    setChapitres(data.map(ch => ({ ...ch, matiereNoms: (ch.matiere_ids || []).map(id => nomById[id]).filter(Boolean) })))
    setLoading(false)
  }

  async function handleExportWord(ch) {
    setExportingId(ch.id)
    try {
      const { data, error } = await supabase.from('sections_cours').select('*').eq('chapitre_id', ch.id).order('ordre')
      if (error) throw error
      await downloadChapitreWord(ch, data)
    } catch (err) {
      showToast(err.message || "Échec de l'export Word", 'error')
    } finally {
      setExportingId(null)
    }
  }

  async function handleBackupAll() {
    setBackingUp(true)
    try {
      await downloadAllCoursesBackup()
    } catch (err) {
      showToast(err.message || 'Échec de la sauvegarde', 'error')
    } finally {
      setBackingUp(false)
    }
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  return (
    <div>
      <p className="page-sub" style={{ marginBottom: '1rem' }}>
        Export Word pour distribuer un chapitre{isAdmin() ? ', sauvegardes et restauration du contenu.' : '.'}
      </p>
      {isAdmin() && (
        <button className="fic-btn" style={{ marginBottom: '1rem' }} disabled={backingUp} onClick={handleBackupAll}>
          {backingUp ? '⏳ Génération…' : '🗄️ Backup de tous les cours (.zip)'}
        </button>
      )}
      <div className="table-wrap">
        <table className="user-table">
          <thead><tr><th>Chapitre</th><th>Matière</th><th></th></tr></thead>
          <tbody>
            {chapitres.map(ch => (
              <tr key={ch.id}>
                <td>{ch.emoji} {ch.titre_fr}</td>
                <td>{ch.matiereNoms.length > 0 ? ch.matiereNoms.join(', ') : '—'}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {canExport && (
                    <button
                      className="icon-btn" disabled={exportingId === ch.id}
                      onClick={() => handleExportWord(ch)} title="Exporter en Word"
                    >
                      {exportingId === ch.id ? '⏳' : '📄'}
                    </button>
                  )}
                  {isAdmin() && (
                    <button className="icon-btn" style={{ marginLeft: '0.35rem' }} onClick={() => setBackupsModal(ch)} title="Sauvegardes">🕐</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {backupsModal && (
        <BackupsModal
          chapitre={backupsModal}
          onClose={() => setBackupsModal(null)}
          onRestored={load}
          showToast={showToast}
        />
      )}
    </div>
  )
}
