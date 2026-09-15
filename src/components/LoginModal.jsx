import React, { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import SignupModal from './SignupModal'
import { useOverlayClose } from '../lib/useOverlayClose'

export default function LoginModal({ onClose, showToast }) {
  const overlayClose = useOverlayClose(onClose)
  const { signIn, requestPasswordReset } = useAuth()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      await signIn(email, password)
      showToast('Bienvenue !', 'success')
      onClose()
    } catch (err) {
      showToast(err.message || 'Identifiants incorrects', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    if (!email) { showToast('Indiquez votre email ci-dessus puis cliquez sur "Mot de passe oublié"', 'error'); return }
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setForgotSent(true)
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (showSignup) {
    return <SignupModal onClose={() => setShowSignup(false)} showToast={showToast} />
  }

  return (
    <div className="modal-overlay open" {...overlayClose}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>Connexion EHub</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              className="form-input" type="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="prenom@ehub.lu" autoFocus
            />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input
              className="form-input" type="password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        {forgotSent ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: '1rem', textAlign: 'center' }}>
            Email envoyé (si ce compte existe) — vérifiez votre boîte de réception.
          </p>
        ) : (
          <button type="button" className="fic-btn" style={{ width: '100%', marginTop: '1rem' }} onClick={handleForgot} disabled={loading}>
            Mot de passe oublié ?
          </button>
        )}

        <button type="button" className="fic-btn" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setShowSignup(true)}>
          Créer un compte
        </button>

        <p style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: '1rem', textAlign: 'center' }}>
          Les nouveaux comptes doivent être validés par un enseignant ou l'administrateur.
        </p>
      </div>
    </div>
  )
}
