import React, { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import EspaceChat from '../components/espace/EspaceChat'
import EspaceFichiers from '../components/espace/EspaceFichiers'

export default function PageEspace({ showToast }) {
  const { user, profile, canEdit } = useAuth()
  const [entreprises, setEntreprises] = useState([])
  const [selected, setSelected]       = useState(null)
  const [tab, setTab]                 = useState('chat')
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!profile) return
    if (profile.entreprise) {
      setSelected(profile.entreprise)
      setLoading(false)
    } else if (canEdit()) {
      loadEntreprises()
    } else {
      setLoading(false)
    }
  }, [profile])

  async function loadEntreprises() {
    setLoading(true)
    const { data, error } = await supabase.from('entreprises').select('id, nom').order('nom')
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setEntreprises(data)
    setLoading(false)
  }

  if (!user) return (
    <div className="lock-screen">
      <div className="lock-icon">🔒</div>
      <h2>Contenu réservé</h2>
      <p>Connectez-vous pour accéder à l'espace équipe.</p>
    </div>
  )

  if (loading) return <p style={{ color: 'var(--text-3)', padding: '2rem' }}>Chargement…</p>

  if (!selected) {
    if (canEdit()) return (
      <div>
        <h2 className="page-heading">Espace équipe</h2>
        <p className="page-sub" style={{ marginBottom: '1.5rem' }}>Sélectionnez une entreprise.</p>
        {entreprises.length === 0 ? (
          <div className="empty-state"><p>Aucune entreprise créée pour l'instant.</p></div>
        ) : (
          <div className="tiles-grid">
            {entreprises.map(e => (
              <div key={e.id} className="module-tile" onClick={() => setSelected(e)}>
                <div className="tile-emoji">🏢</div>
                <h3>{e.nom}</h3>
              </div>
            ))}
          </div>
        )}
      </div>
    )
    return (
      <div className="empty-state">
        <p>Vous n'êtes assigné à aucune entreprise pour l'instant. Contactez votre administrateur.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 className="page-heading">🏢 {selected.nom}</h2>
          <p className="page-sub">Chat et fichiers de votre entreprise.</p>
        </div>
        {canEdit() && !profile.entreprise && (
          <button className="fic-btn" onClick={() => setSelected(null)}>↩ Changer d'entreprise</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
        <button className={`espace-tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>💬 Chat</button>
        <button className={`espace-tab ${tab === 'fichiers' ? 'active' : ''}`} onClick={() => setTab('fichiers')}>📁 Fichiers</button>
      </div>

      {tab === 'chat'
        ? <EspaceChat entrepriseId={selected.id} user={user} showToast={showToast} />
        : <EspaceFichiers entrepriseId={selected.id} user={user} profile={profile} showToast={showToast} />}
    </div>
  )
}
