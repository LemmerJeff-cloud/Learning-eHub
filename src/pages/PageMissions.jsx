import React, { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import MissionsListTab from '../components/missions/MissionsListTab'
import FortschrittTab from '../components/missions/fortschritt/FortschrittTab'

const TABS = {
  'missions-list':        { Component: MissionsListTab },
  'missions-fortschritt': { Component: FortschrittTab },
}

export default function PageMissions({ matiereId, showToast }) {
  const { user, canEdit, isProf } = useAuth()
  const [activeSub, setActiveSub] = useState('missions-list')

  useEffect(() => {
    function onSub(e) { setActiveSub(e.detail.id) }
    window.addEventListener('sidebar:sub', onSub)
    return () => window.removeEventListener('sidebar:sub', onSub)
  }, [])

  if (!user) return (
    <div className="lock-screen">
      <div className="lock-icon">🔒</div>
      <h2>Connexion requise</h2>
    </div>
  )

  const canSeeFortschritt = canEdit() || isProf()
  const sub = canSeeFortschritt ? activeSub : 'missions-list'
  const Active = (TABS[sub] || TABS['missions-list']).Component

  return <Active matiereId={matiereId} showToast={showToast} />
}
