import React from 'react'
import { supabase } from '../../lib/supabase'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ExerciceCard from './ExerciceCard'

function SortableExercice({ exercice, userId, canEdit, onEdit, onDelete, onPreview, showToast }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exercice.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div ref={setNodeRef} style={style}>
      <ExerciceCard
        exercice={exercice}
        userId={userId}
        canEdit={canEdit}
        dragHandleProps={canEdit ? { ...attributes, ...listeners } : null}
        onEdit={onEdit}
        onDelete={onDelete}
        onPreview={onPreview}
        showToast={showToast}
      />
    </div>
  )
}

export default function ExerciceBlockCard({
  block, exercices, userId, canEdit, dragHandleProps,
  onEditBlock, onDeleteBlock, onAddExercice, onEditExercice, onDeleteExercice, onPreviewExercice,
  onChanged, showToast,
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = exercices.findIndex(ex => ex.id === active.id)
    const newIndex = exercices.findIndex(ex => ex.id === over.id)
    const reordered = arrayMove(exercices, oldIndex, newIndex)
    try {
      const results = await Promise.all(reordered.map((ex, i) => supabase.from('exercices').update({ ordre: i }).eq('id', ex.id)))
      const failed = results.find(r => r.error)
      if (failed) throw failed.error
      onChanged()
    } catch (err) {
      showToast(err.message || 'Erreur lors du réordonnancement', 'error')
    }
  }

  return (
    <div style={{ border: '2px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          {dragHandleProps && (
            <span className="drag-handle" {...dragHandleProps} title="Glisser pour réordonner">⠿</span>
          )}
          <div>
            <strong style={{ fontSize: '0.95rem' }}>📦 {block.titre}</strong>
            {block.description?.html && (
              <div className="html-content" style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.2rem' }} dangerouslySetInnerHTML={{ __html: block.description.html }} />
            )}
          </div>
        </div>
        {canEdit && (
          <div style={{ whiteSpace: 'nowrap' }}>
            <button className="icon-btn" onClick={onEditBlock} title="Modifier le bloc">✏️</button>
            <button className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={onDeleteBlock} title="Supprimer le bloc">🗑️</button>
          </div>
        )}
      </div>

      {exercices.length === 0 && (
        <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>Aucun exercice dans ce bloc.</p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={exercices.map(ex => ex.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {exercices.map(ex => (
              <SortableExercice
                key={ex.id}
                exercice={ex}
                userId={userId}
                canEdit={canEdit}
                onEdit={() => onEditExercice(ex)}
                onDelete={() => onDeleteExercice(ex)}
                onPreview={() => onPreviewExercice(ex)}
                showToast={showToast}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {canEdit && (
        <button className="fic-btn" style={{ marginTop: '0.8rem' }} onClick={onAddExercice}>➕ Ajouter un exercice au bloc</button>
      )}
    </div>
  )
}
