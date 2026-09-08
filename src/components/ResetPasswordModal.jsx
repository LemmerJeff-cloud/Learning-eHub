import React, { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

export default function ResetPasswordModal({ onClose, showToast }) {
  const { updatePassword } = useAuth()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 6) {
      showToast('Le mot de passe doit contenir au moins 6 caractères', 'error')
      return
    }
    if (password !== confirm) {
      showToast('Les mots de passe ne correspondent pas', 'error')
      return
    }
    setLoading(true)
    try {
      await updatePassword(password)
      showToast('Mot de passe mis à jour !', 'success')
      onClose?.()
    } catch (err) {
      showToast(err.message || 'Erreur lors de la mise à jour', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (onClose && e.target.classList.contains('modal-overlay')) onClose() }}>
      <div className="modal">
        {onClose && <button className="modal-close" onClick={onClose}>✕</button>}
        <h2>Nouveau mot de passe</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--gray)', marginBottom: '1rem' }}>
          Choisissez un nouveau mot de passe pour votre compte.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nouveau mot de passe</label>
            <input
              className="form-input" type="password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" autoFocus
            />
          </div>
          <div className="form-group">
            <label>Confirmer le mot de passe</label>
            <input
              className="form-input" type="password"
              value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Mise à jour…' : 'Enregistrer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}
