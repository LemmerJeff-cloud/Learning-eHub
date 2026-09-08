import React, { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import AdminUsers from '../components/admin/AdminUsers'
import AdminMatieres from '../components/admin/AdminMatieres'
import AdminClasses from '../components/admin/AdminClasses'
import AdminFilieres from '../components/admin/AdminFilieres'
import AdminLycees from '../components/admin/AdminLycees'
import AdminEntreprises from '../components/admin/AdminEntreprises'
import AdminActualites from '../components/admin/AdminActualites'
import AdminCalendrier from '../components/admin/AdminCalendrier'
import AdminResultats from '../components/admin/AdminResultats'
import AdminContenu from '../components/admin/AdminContenu'
import AdminSettings from '../components/admin/AdminSettings'
import AdminMailingListe from '../components/admin/AdminMailingListe'

const TABS = {
  'admin-users':       { label: 'Utilisateurs', Component: AdminUsers, adminOnly: true },
  'admin-matieres':    { label: 'Matières', Component: AdminMatieres, adminOnly: true },
  'admin-classes':     { label: 'Classes', Component: AdminClasses },
  'admin-filieres':    { label: 'Filières', Component: AdminFilieres, adminOnly: true },
  'admin-lycees':      { label: 'Lycées', Component: AdminLycees, adminOnly: true },
  'admin-entreprises': { label: 'Entreprises', Component: AdminEntreprises },
  'admin-actualites':  { label: 'Actualités', Component: AdminActualites },
  'admin-calendrier':  { label: 'Calendrier', Component: AdminCalendrier },
  'admin-resultats':   { label: 'Résultats', Component: AdminResultats },
  'admin-contenu':     { label: 'Contenu des cours', Component: AdminContenu },
  'admin-settings':    { label: 'Paramètres', Component: AdminSettings, adminOnly: true },
  'admin-mailing':     { label: 'Listes de diffusion', Component: AdminMailingListe },
}

export default function PageAdmin({ showToast, setPage }) {
  const { canEdit, isProf, isAdmin } = useAuth()
  const [activeSub, setActiveSub] = useState(null)

  useEffect(() => {
    function onSub(e) { setActiveSub(e.detail.id) }
    window.addEventListener('sidebar:sub', onSub)
    return () => window.removeEventListener('sidebar:sub', onSub)
  }, [])

  if (!canEdit() && !isProf()) return <div className="empty-state"><p>Accès réservé.</p></div>

  // Défaut différent par rôle (admin-users n'apparaît même plus dans la sidebar pour un
  // enseignant, cf. Sidebar.jsx) — et garde-fou si un enseignant se retrouve malgré tout sur un
  // onglet adminOnly (ex. événement sidebar:sub obsolète).
  const fallback = isAdmin() ? 'admin-users' : 'admin-classes'
  const wanted = activeSub || fallback
  const tab = TABS[wanted] || TABS[fallback]
  if (tab.adminOnly && !isAdmin()) return <div className="empty-state"><p>Accès réservé aux administrateurs.</p></div>
  const Active = tab.Component

  return (
    <div>
      <h2 className="page-heading">Administration</h2>
      <p className="page-sub" style={{ marginBottom: '1.5rem' }}>{tab.label}</p>
      <Active showToast={showToast} setPage={setPage} />
    </div>
  )
}
