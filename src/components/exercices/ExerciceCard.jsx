import React from 'react'
import ExerciceRunner from './ExerciceRunner'

export const TYPE_LABELS = {
  libre: 'Réponse libre', qcm: 'QCM', vrai_faux: 'Vrai / Faux',
  ordre: 'Remise en ordre', glisser_deposer: 'Association',
  choix_unique: 'Choix unique', reponse_courte: 'Réponse courte',
  reponse_numerique: 'Réponse numérique', categorisation: 'Catégorisation',
  tableau_calcul: 'Tableau de calcul', journal: 'Journal comptable',
}

export default function ExerciceCard({ exercice, userId, canEdit, dragHandleProps, onEdit, onDelete, onPreview, showToast }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          {dragHandleProps && (
            <span className="drag-handle" {...dragHandleProps} title="Glisser pour réordonner">⠿</span>
          )}
          <div>
            <strong style={{ fontSize: '0.9rem' }}>{exercice.titre}</strong>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.15rem' }}>
              {TYPE_LABELS[exercice.type]} · {exercice.points} pt{exercice.points > 1 ? 's' : ''}
            </div>
          </div>
        </div>
        {canEdit && (
          <div style={{ whiteSpace: 'nowrap' }}>
            {exercice.type !== 'libre' && <button className="icon-btn" onClick={onPreview} title="Aperçu élève">👁️</button>}
            <button className="icon-btn" style={{ marginLeft: '0.35rem' }} onClick={onEdit} title="Modifier">✏️</button>
            <button className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={onDelete} title="Supprimer">🗑️</button>
          </div>
        )}
      </div>
      <div className="html-content" style={{ fontSize: '0.85rem', marginBottom: '0.8rem' }} dangerouslySetInnerHTML={{ __html: exercice.enonce }} />
      {!canEdit && <ExerciceRunner exercice={exercice} userId={userId} showToast={showToast} />}
    </div>
  )
}
