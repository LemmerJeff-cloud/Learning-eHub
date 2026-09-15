import React from 'react'
import ExerciceRunner from './ExerciceRunner'
import { useOverlayClose } from '../../lib/useOverlayClose'

export default function ExercicePreview({ exercice, onClose }) {
  const overlayClose = useOverlayClose(onClose)
  return (
    <div className="modal-overlay open" {...overlayClose}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>{exercice.titre}</h2>
        <div className="html-content" style={{ fontSize: '0.85rem', marginBottom: '1rem' }} dangerouslySetInnerHTML={{ __html: exercice.enonce }} />

        <div style={{
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--text-3)', marginBottom: '0.6rem',
        }}>
          👁️ Aperçu — ce que verra l'élève
        </div>
        <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', background: 'var(--bg)' }}>
          <ExerciceRunner exercice={exercice} userId="preview" showToast={() => {}} previewMode />
        </div>
      </div>
    </div>
  )
}
