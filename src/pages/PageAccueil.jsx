import React, { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

export default function PageAccueil({ setPage, showToast }) {
  const { user, profile, isEleve, isProf, isAdmin, visibleFilieres, lyceeId } = useAuth()
  const [actualites, setActualites] = useState([])
  const [calendrier, setCalendrier] = useState([])
  const [matieres, setMatieres]     = useState([])
  const [filieres, setFilieres]     = useState([])

  useEffect(() => {
    if (profile) {
      loadActualites()
      loadCalendrier()
    } else {
      supabase.from('matieres').select('nom').order('ordre').then(({ data }) => setMatieres(data || []))
      supabase.from('filieres').select('label').order('ordre').then(({ data }) => setFilieres(data || []))
    }
  }, [profile])

  // visibleFilieres est null pour un admin, un élève sans classe/section, ou un enseignant non
  // scopé à des filières spécifiques : pas de filtrage, il voit tout — même logique que le
  // filtrage des filieres dans PageCours.jsx/Sidebar.jsx (cf. AuthContext.jsx).
  function visibleForProfile(item) {
    if (visibleFilieres && !item.filieres?.some(f => visibleFilieres.includes(f))) return false
    if (lyceeId && item.lycee_ids?.length > 0 && !item.lycee_ids.includes(lyceeId)) return false
    if (item.enseignants_only && !isProf() && !isAdmin()) return false
    return true
  }

  async function loadActualites() {
    const { data } = await supabase
      .from('actualites')
      .select('*')
      .order('ordre')
    if (data) setActualites(data.filter(visibleForProfile).slice(0, 3))
  }

  async function loadCalendrier() {
    const { data } = await supabase
      .from('calendrier')
      .select('*')
      .order('jour')
    if (data) setCalendrier(data.filter(visibleForProfile).slice(0, 4))
  }

  function publicUrl(chemin) {
    return supabase.storage.from('content-images').getPublicUrl(chemin).data.publicUrl
  }

  if (!user) return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>EHub</h1>
      <p style={{ color: 'var(--gray)', marginBottom: '2rem', maxWidth: 400, margin: '0 auto 2rem' }}>
        Plateforme pédagogique{matieres.length > 0 ? ` — ${matieres.map(m => m.nom).join(' · ')}` : ''}<br />
        {filieres.map(f => f.label).join(' · ')}
      </p>
      <p style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>
        Connectez-vous pour accéder à votre contenu.
      </p>
    </div>
  )

  const tagLabel = t => t === 'deadline' ? 'Deadline' : t === 'event' ? 'Événement' : 'Atelier'

  return (
    <div>
      <h2 className="page-heading" style={{ marginBottom: '0.25rem' }}>
        Bonjour, {profile?.prenom} 👋
      </h2>
      <p className="page-sub" style={{ marginBottom: '1.5rem' }}>
        {profile?.classe?.label || profile?.role}
      </p>

      <div className="dash-grid">
        {/* Actualités */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>Actualités</h3>
          </div>
          {actualites.length === 0
            ? <p className="task-empty">Aucune actualité.</p>
            : actualites.map(a => (
              <div key={a.id} className="actu-item">
                <div className="actu-dot" />
                <div>
                  <div className="actu-title">{a.titre}</div>
                  <div className="actu-date">{a.date_affichee} · {a.description}</div>
                  {a.fichiers?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.3rem' }}>
                      {a.fichiers.map((f, i) => (
                        <a key={i} href={publicUrl(f.chemin)} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem' }}>⬇️ {f.nom}</a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          }
        </div>

        {/* Calendrier */}
        <div className="dash-card">
          <div className="dash-card-header"><h3>À venir</h3></div>
          {calendrier.length === 0
            ? <p className="task-empty">Aucun événement.</p>
            : calendrier.map(e => (
              <div key={e.id} className="cal-item">
                <div className="cal-date">
                  <div className="cal-day">{e.jour}</div>
                  <div className="cal-month">{e.mois}</div>
                </div>
                <div className="cal-body">
                  <div className="cal-title">{e.titre}</div>
                  <div className="cal-sub">
                    {e.sous_titre}
                    {e.jour_fin && e.mois_fin ? ` · 📅 ${e.jour} ${e.mois} – ${e.jour_fin} ${e.mois_fin}` : ''}
                    {e.lieu ? ` · 📍 ${e.lieu}` : ''}
                    {e.horaire_debut ? ` · 🕒 ${e.horaire_debut.slice(0, 5)}${e.horaire_fin ? `–${e.horaire_fin.slice(0, 5)}` : ''}` : ''}
                  </div>
                  <span className={`cal-tag ${e.tag}`}>{tagLabel(e.tag)}</span>
                  {e.fichiers?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.3rem' }}>
                      {e.fichiers.map((f, i) => (
                        <a key={i} href={publicUrl(f.chemin)} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem' }}>⬇️ {f.nom}</a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          }
        </div>

        {/* Accès rapide */}
        <div className="dash-card" style={{ gridColumn: '1 / -1' }}>
          <div className="dash-card-header"><h3>Accès rapide</h3></div>
          <div className="tools-grid">
            {[
              { label: 'Cours', icon: '📚', page: 'cours' },
              { label: 'Missions', icon: '✅', page: 'missions' },
              { label: 'Espace équipe', icon: '💬', page: 'espace' },
              { label: 'Entreprises', icon: '🏢', page: 'entreprises' },
            ].map(item => (
              <div key={item.page} className="tool-item" onClick={() => setPage(item.page)}>
                <strong>{item.icon} {item.label}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
