import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/AuthContext'
import { fetchMyClasses } from '../../../lib/progression'
import KlasseOverview from './KlasseOverview'
import ParAufgabe from './ParAufgabe'

const SUB_TABS = [
  { id: 'classe', label: 'Vue par classe' },
  { id: 'aufgabe', label: 'Vue par exercice' },
]

export default function FortschrittTab({ showToast }) {
  const { user, profile } = useAuth()
  const [classes, setClasses]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [classeId, setClasseId] = useState('')
  const [subTab, setSubTab]     = useState('classe')

  useEffect(() => { if (profile) load() }, [profile])

  async function load() {
    setLoading(true)
    try {
      const data = await fetchMyClasses(profile.role, user.id)
      setClasses(data)
      if (data.length > 0) setClasseId(data[0].id)
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p style={{ color: 'var(--text-3)', padding: '2rem' }}>Chargement…</p>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div>
          <h2 className="page-heading">Progression</h2>
          <p className="page-sub">Suivi des exercices auto-corrigés par classe.</p>
        </div>
        {classes.length > 0 && (
          <select className="form-select" value={classeId} onChange={e => setClasseId(e.target.value)} style={{ maxWidth: '220px' }}>
            {classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        )}
      </div>

      {classes.length === 0 ? (
        <div className="empty-state"><p>Aucune classe assignée.</p></div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem' }}>
            {SUB_TABS.map(t => (
              <button key={t.id} className={`fic-btn ${subTab === t.id ? 'active' : ''}`} onClick={() => setSubTab(t.id)}>{t.label}</button>
            ))}
          </div>
          {subTab === 'classe'
            ? <KlasseOverview classeId={classeId} showToast={showToast} />
            : <ParAufgabe classeId={classeId} showToast={showToast} />}
        </>
      )}
    </div>
  )
}
