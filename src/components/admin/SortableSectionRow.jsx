import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function SortableSectionRow({ section, index, editMode, onOpen, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="section-row" onClick={() => onOpen()}>
      {editMode && (
        <span
          className="drag-handle"
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          title="Glisser pour réordonner"
        >⠿</span>
      )}
      <span className="section-row-num">{String(index + 1).padStart(2, '0')}</span>
      <span className="section-row-title">
        {section.titre_fr}
      </span>
      {section.type === 'activite' && <span className="section-row-tag">✏️ Activité</span>}
      {editMode ? (
        <span style={{ display: 'flex', gap: '0.35rem' }}>
          <button className="icon-btn" onClick={e => { e.stopPropagation(); onEdit() }} title="Modifier">✏️</button>
          <button className="icon-btn danger" onClick={e => { e.stopPropagation(); onDelete() }} title="Supprimer">🗑️</button>
        </span>
      ) : (
        <span className="section-row-arrow">→</span>
      )}
    </div>
  )
}
