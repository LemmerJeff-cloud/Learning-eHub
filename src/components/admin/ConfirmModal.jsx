import React from 'react'
import { useOverlayClose } from '../../lib/useOverlayClose'

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = 'Supprimer' }) {
  const overlayClose = useOverlayClose(onCancel)
  return (
    <div className="modal-overlay open" {...overlayClose}>
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
