import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)   // Supabase auth user
  const [profile, setProfile] = useState(null)   // our profiles row
  const [profileError, setProfileError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        classe:classes!profiles_classe_id_fkey(id, label, section, annee, lycee_id),
        entreprise:entreprises!profiles_entreprise_id_fkey(id, nom),
        enseignant_matieres(matiere_id, niveau)
      `)
      .eq('id', userId)
      .single()

    if (error) {
      console.error('fetchProfile failed:', error)
      setProfileError(error.message)
    } else {
      setProfile(data)
      setProfileError(null)
    }
    setLoading(false)
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signUpSelf({ email, password, prenom, role, classeId, lyceeId, demandeEnseignantId }) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: {
          signup_source: 'self',
          prenom, role,
          classe_id: classeId || '',
          lycee_id: lyceeId || '',
          demande_enseignant_id: demandeEnseignantId || '',
        },
      },
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  async function updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    setPasswordRecovery(false)
  }

  async function requestPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  }

  // Helpers
  const isAdmin  = () => profile?.role === 'admin'
  const isProf   = () => ['enseignant', 'enseignant_guest'].includes(profile?.role)
  const canEdit  = () => ['admin', 'enseignant'].includes(profile?.role)
  const isEleve  = () => profile?.role === 'eleve'
  const isPending = () => profile?.statut === 'en_attente'
  const section  = profile?.section || profile?.classe?.section || null
  const lyceeId  = profile?.lycee_id || profile?.classe?.lycee_id || null
  const myMatiereIds = (profile?.enseignant_matieres || []).map(r => r.matiere_id)
  const myEcritureMatiereIds = (profile?.enseignant_matieres || []).filter(r => r.niveau === 'ecriture').map(r => r.matiere_id)
  // Un enseignant (pas "guest") ne peut éditer que les matières où il est affecté en écriture —
  // reflète côté UI les policies RLS can_edit_matiere() (supabase/schema.sql), qui bloquent
  // de toute façon l'écriture serveur si ce garde-fou UI était contourné.
  const canEditMatiere = (matiereId) => isAdmin() || (profile?.role === 'enseignant' && myEcritureMatiereIds.includes(matiereId))

  // Filières auxquelles le compte est limité pour la navigation dans Cours : un tableau de codes
  // pour un élève scopé (sa propre filière, cf. `section`) ou un enseignant/enseignant_guest
  // explicitement scopé (profile.filieres) ; `null` = aucune restriction (voit tout — comportement
  // historique, s'applique à l'admin et à tout compte sans filière assignée).
  const teacherFilieres = profile?.filieres || []
  const visibleFilieres = isEleve()
    ? (section ? [section] : null)
    : (isProf() && teacherFilieres.length > 0)
      ? teacherFilieres
      : null

  return (
    <AuthContext.Provider value={{
      user, profile, profileError, loading,
      signIn, signOut, signUpSelf, updatePassword, requestPasswordReset,
      passwordRecovery,
      isAdmin, isProf, canEdit, isEleve, isPending,
      section, lyceeId, myMatiereIds, canEditMatiere, visibleFilieres,
      refreshProfile: () => user && fetchProfile(user.id),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
