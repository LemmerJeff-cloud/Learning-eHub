import React, { useState, useEffect } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ExerciceModal from './ExerciceModal'
import ExerciceBlockModal from './ExerciceBlockModal'
import ExerciceCard from './ExerciceCard'
import ExerciceBlockCard from './ExerciceBlockCard'
import ExercicePreview from './ExercicePreview'
import ConfirmModal from '../admin/ConfirmModal'

function SortableWrapper({ id, canEdit, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return <div ref={setNodeRef} style={style}>{children(canEdit ? { ...attributes, ...listeners } : null)}</div>
}

export default function ExercicesList({ sectionId, chapitreId, matiereId, showToast }) {
  const { user, canEditMatiere } = useAuth()
  const editable = canEditMatiere(matiereId)
  const [exercices, setExercices] = useState([])
  const [blocks, setBlocks]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [exerciceModal, setExerciceModal] = useState(null) // null | { mode:'new', blockId } | { mode:'edit', exercice }
  const [blockModal, setBlockModal]       = useState(null) // null | 'new' | block
  const [confirmDelete, setConfirmDelete] = useState(null) // null | { kind:'exercice'|'block', item }
  const [previewExercice, setPreviewExercice] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => { load() }, [sectionId])

  async function load() {
    setLoading(true)
    const [{ data: ex, error: exErr }, { data: bl, error: blErr }] = await Promise.all([
      supabase.from('exercices').select('*').eq('section_id', sectionId).order('ordre'),
      supabase.from('exercice_blocks').select('*').eq('section_id', sectionId).order('ordre'),
    ])
    if (exErr || blErr) { showToast((exErr || blErr).message, 'error'); setLoading(false); return }
    setExercices(ex)
    setBlocks(bl)
    setLoading(false)
  }

  const standalone = exercices.filter(e => !e.block_id)
  const blockExercices = Object.fromEntries(blocks.map(b => [b.id, exercices.filter(e => e.block_id === b.id)]))
  const merged = [
    ...standalone.map(e => ({ kind: 'exercice', id: e.id, ordre: e.ordre, data: e })),
    ...blocks.map(b => ({ kind: 'block', id: b.id, ordre: b.ordre, data: b })),
  ].sort((a, b) => a.ordre - b.ordre)

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = merged.findIndex(i => i.id === active.id)
    const newIndex = merged.findIndex(i => i.id === over.id)
    const reordered = arrayMove(merged, oldIndex, newIndex)
    try {
      const results = await Promise.all(reordered.map((item, i) =>
        supabase.from(item.kind === 'exercice' ? 'exercices' : 'exercice_blocks').update({ ordre: i }).eq('id', item.id)
      ))
      const failed = results.find(r => r.error)
      if (failed) throw failed.error
      load()
    } catch (err) {
      showToast(err.message || 'Erreur lors du réordonnancement', 'error')
    }
  }

  async function handleDelete() {
    const { kind, item } = confirmDelete
    const table = kind === 'exercice' ? 'exercices' : 'exercice_blocks'
    const { error } = await supabase.from(table).delete().eq('id', item.id)
    setConfirmDelete(null)
    if (error) { showToast(error.message, 'error'); return }
    showToast(kind === 'exercice' ? 'Exercice supprimé' : 'Bloc supprimé', 'success')
    load()
  }

  if (loading) return null
  if (merged.length === 0 && !editable) return null

  return (
    <div className="cours-section-block" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)' }}>📝 Exercices</h3>
        {editable && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="fic-btn" onClick={() => setBlockModal('new')}>➕ Bloc</button>
            <button className="fic-btn" onClick={() => setExerciceModal({ mode: 'new', blockId: null })}>➕ Exercice</button>
          </div>
        )}
      </div>

      {merged.length === 0 && (
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Aucun exercice pour cette section.</p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={merged.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {merged.map(item => (
              <SortableWrapper key={item.id} id={item.id} canEdit={editable}>
                {dragHandleProps => item.kind === 'exercice' ? (
                  <ExerciceCard
                    exercice={item.data}
                    userId={user.id}
                    canEdit={editable}
                    dragHandleProps={dragHandleProps}
                    onEdit={() => setExerciceModal({ mode: 'edit', exercice: item.data })}
                    onDelete={() => setConfirmDelete({ kind: 'exercice', item: item.data })}
                    onPreview={() => setPreviewExercice(item.data)}
                    showToast={showToast}
                  />
                ) : (
                  <ExerciceBlockCard
                    block={item.data}
                    exercices={blockExercices[item.data.id] || []}
                    userId={user.id}
                    canEdit={editable}
                    dragHandleProps={dragHandleProps}
                    onEditBlock={() => setBlockModal(item.data)}
                    onDeleteBlock={() => setConfirmDelete({ kind: 'block', item: item.data })}
                    onAddExercice={() => setExerciceModal({ mode: 'new', blockId: item.data.id })}
                    onEditExercice={ex => setExerciceModal({ mode: 'edit', exercice: ex })}
                    onDeleteExercice={ex => setConfirmDelete({ kind: 'exercice', item: ex })}
                    onPreviewExercice={ex => setPreviewExercice(ex)}
                    onChanged={load}
                    showToast={showToast}
                  />
                )}
              </SortableWrapper>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {exerciceModal && (
        <ExerciceModal
          exercice={exerciceModal.mode === 'edit' ? exerciceModal.exercice : null}
          sectionId={sectionId}
          chapitreId={chapitreId}
          blockId={exerciceModal.mode === 'new' ? exerciceModal.blockId : exerciceModal.exercice.block_id}
          nextOrdre={exerciceModal.mode === 'new'
            ? (exerciceModal.blockId ? (blockExercices[exerciceModal.blockId] || []).length : merged.length)
            : undefined}
          onClose={() => setExerciceModal(null)}
          onSaved={load}
          showToast={showToast}
        />
      )}
      {blockModal && (
        <ExerciceBlockModal
          block={blockModal === 'new' ? null : blockModal}
          sectionId={sectionId}
          chapitreId={chapitreId}
          nextOrdre={blockModal === 'new' ? merged.length : undefined}
          onClose={() => setBlockModal(null)}
          onSaved={load}
          showToast={showToast}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.kind === 'exercice' ? 'Supprimer cet exercice ?' : 'Supprimer ce bloc ?'}
          message={confirmDelete.kind === 'exercice'
            ? `"${confirmDelete.item.titre}" et tous les résultats des élèves seront supprimés définitivement.`
            : `"${confirmDelete.item.titre}" sera supprimé. Les exercices qu'il contient deviendront des exercices autonomes.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}
      {previewExercice && (
        <ExercicePreview exercice={previewExercice} onClose={() => setPreviewExercice(null)} />
      )}
    </div>
  )
}
