import React, { useState } from 'react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import NavBar      from './components/NavBar'
import Sidebar     from './components/Sidebar'
import PageAccueil from './pages/PageAccueil'
import PageCours   from './pages/PageCours'
import PageInfos   from './pages/PageInfos'
import PageMissions from './pages/PageMissions'
import PageEspace  from './pages/PageEspace'
import PageAdmin   from './pages/PageAdmin'
import PageEntreprises from './pages/PageEntreprises'
import PageHallOfFame from './pages/PageHallOfFame'
import Toast       from './components/Toast'
import ResetPasswordModal from './components/ResetPasswordModal'

function AppInner() {
  const [page, setPage]     = useState('accueil')
  const [matiereId, setMatiereIdState] = useState(() => localStorage.getItem('ehub:matiere_id') || null)
  const [toast, setToast]   = useState(null)

  function setMatiereId(id) {
    setMatiereIdState(id)
    if (id) localStorage.setItem('ehub:matiere_id', id)
  }
  const { loading, passwordRecovery, user, profile, profileError, isPending, signOut, refreshProfile } = useAuth()

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--night)', color:'var(--gray)' }}>
      Chargement…
    </div>
  )

  const ctx = { showToast }

  if (user && profileError && !profile) return (
    <div className="app-shell">
      <div className="lock-screen">
        <div className="lock-icon">⚠️</div>
        <h2>Profil introuvable</h2>
        <p>
          Connexion réussie, mais votre profil n'a pas pu être chargé ({profileError}).
          Réessayez, ou contactez l'administrateur si le problème persiste.
        </p>
        <button className="fic-btn" onClick={refreshProfile}>↻ Réessayer</button>
        <button className="fic-btn" style={{ marginLeft: '0.6rem' }} onClick={signOut}>↩ Se déconnecter</button>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  )

  if (passwordRecovery) return (
    <div className="app-shell">
      <ResetPasswordModal showToast={showToast} />
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  )

  if (user && isPending()) return (
    <div className="app-shell">
      <div className="lock-screen">
        <div className="lock-icon">⏳</div>
        <h2>Compte en attente de validation</h2>
        <p>
          Bonjour {profile?.prenom}, votre compte a bien été créé mais doit encore être validé
          par un enseignant ou l'administrateur avant que vous puissiez accéder à EHub.
        </p>
        <button className="fic-btn" onClick={signOut}>↩ Se déconnecter</button>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  )

  return (
    <div className="app-shell">
      <div id="progress-bar" className="progress-bar" />
      <NavBar page={page} setPage={setPage} matiereId={matiereId} setMatiereId={setMatiereId} showToast={showToast} />
      <div className="layout">
        <Sidebar page={page} setPage={setPage} matiereId={matiereId} />
        <main className="main-content">
          {page === 'accueil'      && <PageAccueil     setPage={setPage} {...ctx} />}
          {page === 'cours'        && <PageCours        matiereId={matiereId} {...ctx} />}
          {page === 'infos'        && <PageInfos        {...ctx} />}
          {page === 'entreprises'  && <PageEntreprises  {...ctx} />}
          {page === 'missions'     && <PageMissions      matiereId={matiereId} {...ctx} />}
          {page === 'espace'       && <PageEspace        {...ctx} />}
          {page === 'hof'          && <PageHallOfFame    {...ctx} />}
          {page === 'admin'        && <PageAdmin         setPage={setPage} {...ctx} />}
        </main>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
