import React, { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { useOverlayClose } from '../lib/useOverlayClose'

const ROLES = [
  { value: 'eleve', label: 'Élève' },
  { value: 'enseignant', label: 'Enseignant' },
  { value: 'enseignant_guest', label: 'Enseignant (lecture seule)' },
]

export default function SignupModal({ onClose, showToast }) {
  const overlayClose = useOverlayClose(onClose)
  const { signUpSelf } = useAuth()
  const [prenom, setPrenom]     = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [role, setRole]         = useState('eleve')
  const [lyceeId, setLyceeId]   = useState('')
  const [classeId, setClasseId] = useState('')
  const [enseignantId, setEnseignantId] = useState('')
  const [lycees, setLycees]     = useState([])
  const [classes, setClasses]   = useState([])
  const [enseignants, setEnseignants] = useState([])
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

  useEffect(() => {
    supabase.from('classes').select('id, label, lycee_id').order('label').then(({ data, error }) => {
      if (error) { showToast(error.message, 'error'); return }
      setClasses(data)
    })
    supabase.from('lycees').select('id, nom').order('nom').then(({ data, error }) => {
      if (error) { showToast(error.message, 'error'); return }
      setLycees(data)
      if (data?.length > 0) setLyceeId(data[0].id)
    })
  }, [])

  const classesForLycee = classes.filter(c => !lyceeId || c.lycee_id === lyceeId)

  // La classe choisie doit appartenir au lycée sélectionné : si on change de lycée
  // après avoir déjà choisi une classe, on invalide ce choix devenu incohérent.
  useEffect(() => {
    if (classeId && !classesForLycee.some(c => c.id === classeId)) setClasseId('')
  }, [lyceeId])

  useEffect(() => {
    setEnseignantId('')
    if (!classeId || role !== 'eleve') { setEnseignants([]); return }
    supabase
      .from('enseignant_classes')
      .select('enseignant:profiles(id, prenom, initiale)')
      .eq('classe_id', classeId)
      .then(({ data, error }) => {
        if (error) { showToast(error.message, 'error'); return }
        setEnseignants(data.map(r => r.enseignant).filter(Boolean))
      })
  }, [classeId, role])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!prenom.trim() || !email.trim() || !password) return
    if (password.length < 6) { showToast('Le mot de passe doit contenir au moins 6 caractères', 'error'); return }
    if (password !== confirm) { showToast('Les mots de passe ne correspondent pas', 'error'); return }
    setLoading(true)
    try {
      await signUpSelf({
        email, password, prenom, role,
        classeId: role === 'eleve' ? classeId : null,
        lyceeId: lyceeId || null,
        demandeEnseignantId: role === 'eleve' ? enseignantId : null,
      })
      setDone(true)
    } catch (err) {
      showToast(err.message || 'Erreur lors de la création du compte', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="modal-overlay open" {...overlayClose}>
        <div className="modal">
          <button className="modal-close" onClick={onClose}>✕</button>
          <h2>Compte créé</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray)' }}>
            Votre compte a été créé et est en attente de validation par un enseignant ou l'administrateur.
            Vous pourrez vous connecter dès qu'il sera validé.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay open" {...overlayClose}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>Créer un compte</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom d'utilisateur</label>
            <input className="form-input" value={prenom} onChange={e => setPrenom(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom@ehub.lu" />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="min. 6 caractères" />
          </div>
          <div className="form-group">
            <label>Confirmer le mot de passe</label>
            <input className="form-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Type de compte</label>
            <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Lycée</label>
            <select className="form-select" value={lyceeId} onChange={e => setLyceeId(e.target.value)}>
              {lycees.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </select>
          </div>
          {role === 'eleve' && (
            <>
              <div className="form-group">
                <label>Classe</label>
                <select className="form-select" value={classeId} onChange={e => setClasseId(e.target.value)}>
                  <option value="">— Choisir —</option>
                  {classesForLycee.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              {classeId && (
                <div className="form-group">
                  <label>Enseignant de la classe (optionnel)</label>
                  <select className="form-select" value={enseignantId} onChange={e => setEnseignantId(e.target.value)}>
                    <option value="">— Non précisé —</option>
                    {enseignants.map(en => <option key={en.id} value={en.id}>{en.prenom} {en.initiale}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
          <p style={{ fontSize: '0.72rem', color: 'var(--gray)', margin: '0.5rem 0 1rem' }}>
            Votre compte devra être validé par un enseignant ou l'administrateur avant que vous puissiez vous connecter.
          </p>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
      </div>
    </div>
  )
}
