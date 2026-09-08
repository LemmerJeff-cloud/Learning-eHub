import React, { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import LoginModal from './LoginModal'
import ResetPasswordModal from './ResetPasswordModal'

function hexToRgba(hex, alpha) {
  const h = (hex || '#1B2A6B').replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

const PAGES = [
  { id: 'accueil',     label: 'Accueil',      icon: '🏠' },
  { id: 'cours',       label: 'Cours',         icon: '📚' },
  { id: 'missions',    label: 'Missions',      icon: '✅' },
  { id: 'espace',      label: 'Espace équipe', icon: '💬' },
  { id: 'hof',         label: 'Hall of Fame',  icon: '🏆' },
  { id: 'entreprises', label: 'Entreprises',   icon: '🏢' },
  { id: 'infos',       label: 'Infos',         icon: '📌' },
  { id: 'admin',       label: 'Admin',         icon: '⚙️', staffOnly: true },
]

export default function NavBar({ page, setPage, matiereId, setMatiereId, showToast }) {
  const { user, profile, signOut, canEdit, isProf } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [showMenu,  setShowMenu]  = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [nomSite, setNomSite]     = useState('EHub')
  const [sousTitre, setSousTitre] = useState('Économie de Gestion')
  const [openMissions, setOpenMissions] = useState(0)
  const [matieres, setMatieres]   = useState([])
  const [filieres, setFilieres]   = useState([])

  useEffect(() => {
    supabase.from('app_settings').select('nom_site, sous_titre').limit(1).single().then(({ data }) => {
      if (data) { setNomSite(data.nom_site); setSousTitre(data.sous_titre) }
    })
    supabase.from('matieres').select('*').order('ordre').then(({ data }) => {
      setMatieres(data || [])
      if (data?.length > 0 && (!matiereId || !data.some(m => m.id === matiereId))) setMatiereId(data[0].id)
    })
    supabase.from('filieres').select('*').order('ordre').then(({ data }) => setFilieres(data || []))
  }, [])

  useEffect(() => {
    if (!user || profile?.role !== 'eleve' || !matiereId) { setOpenMissions(0); return }
    loadOpenMissions()
  }, [user, profile, matiereId])

  useEffect(() => { setShowMobileNav(false) }, [page])

  // MissionsListTab redispatche cet événement à chaque rechargement (ex. après un rendu)
  // pour que le badge reste à jour sans que la NavBar ne refasse sa propre requête.
  useEffect(() => {
    function onUpdate(e) { setOpenMissions(e.detail.count) }
    window.addEventListener('missions:open-count', onUpdate)
    return () => window.removeEventListener('missions:open-count', onUpdate)
  }, [])

  async function loadOpenMissions() {
    const [{ data: missions }, { data: rendus }] = await Promise.all([
      supabase.from('missions').select('id').eq('matiere_id', matiereId),
      supabase.from('rendus').select('mission_id').eq('user_id', user.id),
    ])
    const doneIds = new Set((rendus || []).map(r => r.mission_id))
    setOpenMissions((missions || []).filter(m => !doneIds.has(m.id)).length)
  }

  const section = profile?.section || profile?.classe?.section
  const filiere = filieres.find(f => f.code === section)

  async function handleLogout() {
    setShowMenu(false)
    await signOut()
    setPage('accueil')
    showToast('Déconnexion réussie')
  }

  const visiblePages = PAGES.filter(p => !p.staffOnly || (canEdit() || isProf()))

  return (
    <>
      <nav className="navbar">
        <div className="nav-logo">
          <div className="nav-logo-icon">{nomSite.slice(0, 2).toUpperCase()}</div>
          <div className="nav-logo-text">
            <strong>{nomSite}</strong>
            <span>{sousTitre}</span>
          </div>
        </div>

        <div className="nav-items">
          {visiblePages.map(p => (
            <button
              key={p.id}
              className={`nav1-btn ${page === p.id ? 'active' : ''}`}
              onClick={() => setPage(p.id)}
            >
              {p.label}
              {p.id === 'missions' && openMissions > 0 && (
                <span className="nav-badge">{openMissions}</span>
              )}
            </button>
          ))}
        </div>

        <div className="nav-right">
          {matieres.length > 1 && (
            <select
              className="matiere-select"
              value={matiereId || ''}
              onChange={e => setMatiereId(e.target.value)}
              title="Changer de matière"
            >
              {matieres.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.nom}</option>)}
            </select>
          )}

          {filiere && (
            <span
              className="filiere-badge visible"
              style={{
                background: hexToRgba(filiere.couleur, 0.12),
                color: filiere.couleur,
                border: `1px solid ${hexToRgba(filiere.couleur, 0.3)}`,
              }}
            >
              {filiere.label}
            </span>
          )}

          {user ? (
            <div
              className="user-chip visible"
              onClick={() => setShowMenu(!showMenu)}
            >
              <div className="user-avatar">
                {profile?.prenom?.[0]}{profile?.initiale}
              </div>
              <span className="user-name">{profile?.prenom}</span>
            </div>
          ) : (
            <button className="btn-login" onClick={() => setShowLogin(true)}>
              Se connecter
            </button>
          )}

          <button
            type="button"
            className="nav-hamburger"
            aria-label="Ouvrir le menu"
            onClick={() => setShowMobileNav(o => !o)}
          >
            {showMobileNav ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {showMobileNav && (
        <>
          <div className="nav-mobile-backdrop" onClick={() => setShowMobileNav(false)} />
          <div className="nav-mobile-menu">
            {visiblePages.map(p => (
              <button
                key={p.id}
                className={`nav-mobile-item ${page === p.id ? 'active' : ''}`}
                onClick={() => { setPage(p.id); setShowMobileNav(false) }}
              >
                <span>{p.icon} {p.label}</span>
                {p.id === 'missions' && openMissions > 0 && (
                  <span className="nav-badge">{openMissions}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          showToast={showToast}
        />
      )}

      {showMenu && (
        <div className="logout-menu">
          <div className="logout-menu-user">
            <strong>{profile?.prenom} {profile?.initiale && `${profile.initiale}.`}</strong>
            <span>{profile?.role}</span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />
          <button
            className="logout-btn"
            onClick={() => { setShowMenu(false); setShowResetPassword(true) }}
          >
            🔑 Changer le mot de passe
          </button>
          <button className="logout-btn" onClick={handleLogout}>↩ Se déconnecter</button>
        </div>
      )}

      {showResetPassword && (
        <ResetPasswordModal
          onClose={() => setShowResetPassword(false)}
          showToast={showToast}
        />
      )}
    </>
  )
}
