import React, { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

export default function Sidebar({ page, matiereId }) {
  const { profile, canEdit, isProf, isAdmin, visibleFilieres } = useAuth()
  const [chapitres, setChapitres] = useState([])
  const [chapitresLoading, setChapitresLoading] = useState(true)
  const [openChap, setOpenChap]   = useState(null)
  const [openSec, setOpenSec]     = useState(null)
  const [activeSec, setActiveSec] = useState(null)
  const [activePartie, setActivePartie] = useState(null)
  const [activeSub, setActiveSub] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const hasSidebarContent = page === 'cours'
    || (page === 'admin' && (canEdit() || isProf()))
    || page === 'infos'
    || (page === 'missions' && (canEdit() || isProf()))

  useEffect(() => { setMobileOpen(false) }, [page])

  useEffect(() => {
  if (page === 'cours' && matiereId) { setChapitresLoading(true); loadChapitres() }
  }, [page, matiereId])

  async function loadChapitres() {
    const { data } = await supabase
      .from('chapitres')
      .select('id, titre_fr, emoji, filieres, ordre, sections_cours(id, titre_fr, type, filieres, ordre, parent_section_id)')
      .contains('matiere_ids', [matiereId])
      .order('ordre')
    if (!data) { setChapitresLoading(false); return }
    data.forEach(ch => {
      let secs = ch.sections_cours || []
      if (visibleFilieres) secs = secs.filter(s => s.filieres.some(f => visibleFilieres.includes(f)))
      const topLevel = secs.filter(s => !s.parent_section_id).sort((a, b) => a.ordre - b.ordre)
      topLevel.forEach(s => {
        s.parties = secs.filter(p => p.parent_section_id === s.id).sort((a, b) => a.ordre - b.ordre)
      })
      ch.sections_cours = topLevel
    })
    setChapitres(data)
    setChapitresLoading(false)
  }

  // Sync with PageCours navigation
  useEffect(() => {
    function onChapitreOpen(e) { setOpenChap(e.detail.id); setOpenSec(null); setActiveSec(null); setActivePartie(null) }
    function onSectionOpen(e)  { setOpenChap(e.detail.chId); setOpenSec(e.detail.secId); setActiveSec(e.detail.secId); setActivePartie(null) }
    function onPartieOpen(e)   { setOpenChap(e.detail.chId); setOpenSec(e.detail.secId); setActiveSec(e.detail.secId); setActivePartie(e.detail.partieId) }
    function onBack()          { setOpenChap(null); setOpenSec(null); setActiveSec(null); setActivePartie(null) }
    function onRefresh()       { loadChapitres() }
    window.addEventListener('cours:chapitre', onChapitreOpen)
    window.addEventListener('cours:section',  onSectionOpen)
    window.addEventListener('cours:partie',   onPartieOpen)
    window.addEventListener('cours:back',     onBack)
    window.addEventListener('cours:refresh',  onRefresh)
    return () => {
      window.removeEventListener('cours:chapitre', onChapitreOpen)
      window.removeEventListener('cours:section',  onSectionOpen)
      window.removeEventListener('cours:partie',   onPartieOpen)
      window.removeEventListener('cours:back',     onBack)
      window.removeEventListener('cours:refresh',  onRefresh)
    }
  }, [])

  function toggleChap(ch) {
    const isOpen = openChap === ch.id
    const newOpen = isOpen ? null : ch.id
    setOpenChap(newOpen)
    setOpenSec(null)
    setActiveSec(null)
    setActivePartie(null)
    if (!isOpen) window.dispatchEvent(new CustomEvent('sidebar:chapitre', { detail: { id: ch.id } }))
    else window.dispatchEvent(new CustomEvent('sidebar:back'))
  }

  function selectSec(chId, secId) {
    setOpenChap(chId)
    setOpenSec(secId)
    setActiveSec(secId)
    setActivePartie(null)
    setMobileOpen(false)
    window.dispatchEvent(new CustomEvent('sidebar:section', { detail: { chId, secId } }))
  }

  function selectPartie(chId, secId, partieId) {
    setOpenChap(chId)
    setOpenSec(secId)
    setActiveSec(secId)
    setActivePartie(partieId)
    setMobileOpen(false)
    window.dispatchEvent(new CustomEvent('sidebar:partie', { detail: { chId, secId, partieId } }))
  }

  function selectSub(id) {
    setActiveSub(id)
    setMobileOpen(false)
    window.dispatchEvent(new CustomEvent('sidebar:sub', { detail: { id } }))
  }

  if (!hasSidebarContent) return null

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}
      <button
        type="button"
        className="sidebar-mobile-toggle"
        aria-label="Ouvrir le sommaire"
        onClick={() => setMobileOpen(o => !o)}
      >
        {mobileOpen ? '✕' : '☰ Sommaire'}
      </button>
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {page === 'cours' && (
          <>
            <div className="sidebar-section-label">Chapitres</div>
            {chapitres.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', padding: '0.5rem 1.25rem' }}>
                {chapitresLoading ? 'Chargement…' : 'Aucun chapitre pour l’instant.'}
              </p>
            )}
            {chapitres.map(ch => (
              <div key={ch.id}>
                <button
                  className={`sidebar-chapitre ${openChap === ch.id ? 'open' : ''}`}
                  onClick={() => toggleChap(ch)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{ch.emoji}</span>
                    <span>{ch.titre_fr}</span>
                  </span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                    {openChap === ch.id ? '▾' : '▸'}
                  </span>
                </button>
                {openChap === ch.id && (
                  <div className="sidebar-subsections">
                    {ch.sections_cours?.map(s => (
                      <div key={s.id}>
                        <button
                          className={`sidebar-subsection ${activeSec === s.id && !activePartie ? 'active' : ''}`}
                          onClick={() => selectSec(ch.id, s.id)}
                        >
                          <span style={{ flex: 1 }}>{s.type === 'activite' ? '✏️ ' : ''}{s.titre_fr}</span>
                          {s.parties?.length > 0 && (
                            <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{openSec === s.id ? '▾' : '▸'}</span>
                          )}
                        </button>
                        {openSec === s.id && s.parties?.length > 0 && (
                          <div className="sidebar-subsections">
                            {s.parties.map(p => (
                              <button
                                key={p.id}
                                className={`sidebar-partie ${activePartie === p.id ? 'active' : ''}`}
                                onClick={() => selectPartie(ch.id, s.id, p.id)}
                              >
                                {p.type === 'activite' ? '✏️ ' : ''}{p.titre_fr}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {page === 'admin' && (canEdit() || isProf()) && (
          <>
            <div className="sidebar-section-label">Administration</div>
            {[
              { id: 'admin-users',       label: '👤 Utilisateurs',    adminOnly: true },
              { id: 'admin-matieres',    label: '📘 Matières',        adminOnly: true },
              { id: 'admin-classes',     label: '🎓 Classes' },
              { id: 'admin-filieres',    label: '🧭 Filières',        adminOnly: true },
              { id: 'admin-lycees',      label: '🏫 Lycées',          adminOnly: true },
              { id: 'admin-entreprises', label: '🏢 Entreprises' },
              { id: 'admin-actualites',  label: '📰 Actualités' },
              { id: 'admin-calendrier',  label: '📅 Calendrier' },
              { id: 'admin-resultats',   label: '📊 Résultats' },
              { id: 'admin-contenu',     label: '📄 Contenu des cours' },
              { id: 'admin-settings',    label: '⚙️ Paramètres',      adminOnly: true },
              { id: 'admin-mailing',     label: '📧 Listes de diffusion' },
            ].filter(item => !item.adminOnly || isAdmin()).map(item => (
              <button
                key={item.id}
                className={`sidebar-item ${activeSub === item.id ? 'active' : ''}`}
                onClick={() => selectSub(item.id)}
              >
                {item.label}
              </button>
            ))}
          </>
        )}

        {page === 'infos' && (
          <>
            <div className="sidebar-section-label">Infos</div>
            {[
              { id: 'infos-general',                  label: 'Général' },
              { id: 'infos-jel',                       label: 'JEL' },
              { id: 'infos-entreprises_entrainement',  label: "Entreprises d'entraînement" },
              { id: 'infos-mini_entreprises',          label: 'Mini-entreprises' },
              { id: 'infos-startup_program',           label: 'Start-up Program' },
              { id: 'infos-gene',                      label: 'GEN-E' },
              { id: 'infos-liens_utiles',               label: 'Liens utiles' },
            ].map(item => (
              <button
                key={item.id}
                className={`sidebar-item ${activeSub === item.id ? 'active' : ''}`}
                onClick={() => selectSub(item.id)}
              >
                {item.label}
              </button>
            ))}
          </>
        )}

        {page === 'missions' && (canEdit() || isProf()) && (
          <>
            <div className="sidebar-section-label">Missions</div>
            {[
              { id: 'missions-list',        label: '📋 Missions' },
              { id: 'missions-fortschritt', label: '📈 Progression' },
            ].map(item => (
              <button
                key={item.id}
                className={`sidebar-item ${activeSub === item.id ? 'active' : ''}`}
                onClick={() => selectSub(item.id)}
              >
                {item.label}
              </button>
            ))}
          </>
        )}

      </div>

      {profile && (
        <div className="sidebar-bottom">
          <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.68rem' }}>
            {profile.prenom?.[0]}{profile.initiale}
          </div>
          <div>
            <div className="user-name">{profile.prenom} {profile.initiale}.</div>
            <small>{profile.role}</small>
          </div>
        </div>
      )}
      </aside>
    </>
  )
}
