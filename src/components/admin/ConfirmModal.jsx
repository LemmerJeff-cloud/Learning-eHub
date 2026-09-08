import React from 'react'

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = 'Supprimer' }) {
  return (
    <div className="modal-overlay open" onClick={e => { if (e.target.classList.contains('modal-overlay')) onCancel() }}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <h2>{title}</h2>
        <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{message}</p>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="fic-btn" style={{ flex: 1 }} onClick={onCancel}>Annuler</button>
          <button className="fic-btn danger-btn" style={{ flex: 1 }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
