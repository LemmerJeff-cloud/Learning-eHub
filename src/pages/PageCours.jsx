import React, { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { backupChapitre } from '../lib/backup'
import ChapitreModal from '../components/admin/ChapitreModal'
import SectionModal from '../components/admin/SectionModal'
import ConfirmModal from '../components/admin/ConfirmModal'
import SortableSectionRow from '../components/admin/SortableSectionRow'
import TiptapEditor from '../components/admin/TiptapEditor'
import SectionContentEditor from '../components/admin/SectionContentEditor'
import ExercicesList from '../components/exercices/ExercicesList'
import BlockBody from '../components/BlockBody'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'

export default function PageCours({ matiereId, showToast }) {
  const { user, profile, canEditMatiere, visibleFilieres } = useAuth()
  const canEdit = () => canEditMatiere(matiereId)
  const [view, setView]             = useState('list')
  const [chapitres, setChapitres]   = useState([])
  const [currentCh, setCurrentCh]   = useState(null)
  const [currentSec, setCurrentSec] = useState(null)
  const [sections, setSections]     = useState([])
  const [loading, setLoading]       = useState(false)

  const [editMode, setEditMode]         = useState(false)
  const [chapitreModal, setChapitreModal] = useState(null) // null | 'new' | chapitre
  const [sectionModal, setSectionModal]   = useState(null) // null | 'new' | section
  const [confirmDelete, setConfirmDelete] = useState(null) // null | { type: 'chapitre'|'section', item }
  const [editorHtml, setEditorHtml]     = useState(null)
  const [editorLoadedFor, setEditorLoadedFor] = useState(null)
  const [contentDraft, setContentDraft]     = useState(null)
  const [contentLoadedFor, setContentLoadedFor] = useState(null)
  const [savingSection, setSavingSection] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => { if (matiereId) loadChapitres() }, [visibleFilieres, profile, matiereId])

  useEffect(() => {
    if (!currentSec) return
    const key = `${currentSec.id}:${currentSec.type}`
    if (view === 'section' && currentSec.type === 'editeur' && editorLoadedFor !== key) {
      setEditorHtml(currentSec.contenu?.html || '')
      setEditorLoadedFor(key)
    }
    if (view === 'section' && currentSec.type !== 'editeur' && contentLoadedFor !== key) {
      setContentDraft(buildContentDraft(currentSec))
      setContentLoadedFor(key)
    }
  }, [currentSec, view])

  useEffect(() => {
    function onChapitre(e) {
      const ch = chapitres.find(c => c.id === e.detail.id)
      if (ch) openChapitre(ch)
    }
    function onSection(e) { openSection(e.detail.chId, e.detail.secId) }
    window.addEventListener('sidebar:chapitre', onChapitre)
    window.addEventListener('sidebar:section', onSection)
    return () => {
      window.removeEventListener('sidebar:chapitre', onChapitre)
      window.removeEventListener('sidebar:section', onSection)
    }
  }, [chapitres, sections])

  async function loadChapitres() {
    setLoading(true)
    const { data, error } = await supabase.from('chapitres').select('*').contains('matiere_ids', [matiereId]).order('ordre')
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setChapitres(data)
    setLoading(false)
  }

  function refreshSidebar() {
    window.dispatchEvent(new CustomEvent('cours:refresh'))
  }

  async function openChapitre(ch) {
    setCurrentCh(ch)
    setCurrentSec(null)
    setView('chapitre')
    window.dispatchEvent(new CustomEvent('cours:chapitre', { detail: { id: ch.id } }))
    const { data, error } = await supabase.from('sections_cours').select('*').eq('chapitre_id', ch.id).order('ordre')
    if (error) { showToast(error.message, 'error'); return }
    setSections(visibleFilieres ? data.filter(s => s.filieres.some(f => visibleFilieres.includes(f))) : data)
  }

  async function openSection(chId, secId) {
    if (!currentCh || currentCh.id !== chId) {
      const ch = chapitres.find(c => c.id === chId)
      if (ch) await openChapitre(ch)
    }
    const { data, error } = await supabase.from('sections_cours').select('*').eq('id', secId).single()
    if (error) { showToast(error.message, 'error'); return }
    setCurrentSec(data)
    setView('section')
    window.dispatchEvent(new CustomEvent('cours:section', { detail: { chId, secId } }))
  }

  function goList() {
    setView('list')
    window.dispatchEvent(new CustomEvent('cours:back'))
  }

  function goChapitre() {
    setView('chapitre')
    window.dispatchEvent(new CustomEvent('cours:chapitre', { detail: { id: currentCh?.id } }))
  }

  // ── Chapitres CRUD ──────────────────────────────────────────
  async function handleDeleteChapitre(ch) {
    try {
      await backupChapitre(ch.id, `avant suppression du chapitre "${ch.titre_fr}"`, user.id)
      const { error } = await supabase.from('chapitres').delete().eq('id', ch.id)
      if (error) throw error
      showToast('Chapitre supprimé', 'success')
      if (currentCh?.id === ch.id) goList()
      loadChapitres()
      refreshSidebar()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setConfirmDelete(null)
    }
  }

  // ── Sections CRUD ───────────────────────────────────────────
  async function handleDeleteSection(s) {
    try {
      await backupChapitre(currentCh.id, `avant suppression de la section "${s.titre_fr}"`, user.id)
      const { error } = await supabase.from('sections_cours').delete().eq('id', s.id)
      if (error) throw error
      showToast('Section supprimée', 'success')
      if (currentSec?.id === s.id) goChapitre()
      openChapitre(currentCh)
      refreshSidebar()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setConfirmDelete(null)
    }
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sections.findIndex(s => s.id === active.id)
    const newIndex = sections.findIndex(s => s.id === over.id)
    const reordered = arrayMove(sections, oldIndex, newIndex)
    const previous = sections
    setSections(reordered)
    try {
      await backupChapitre(currentCh.id, `avant réordonnancement des sections de "${currentCh.titre_fr}"`, user.id)
      const results = await Promise.all(reordered.map((s, i) => supabase.from('sections_cours').update({ ordre: i }).eq('id', s.id)))
      const failed = results.find(r => r.error)
      if (failed) throw failed.error
      refreshSidebar()
    } catch (err) {
      setSections(previous)
      showToast(err.message || 'Erreur lors du réordonnancement', 'error')
    }
  }

  async function handleSaveEditeur() {
    setSavingSection(true)
    try {
      await backupChapitre(currentCh.id, `avant modification de la section "${currentSec.titre_fr}"`, user.id)
      const { error } = await supabase.from('sections_cours')
        .update({ contenu: { html: editorHtml } })
        .eq('id', currentSec.id)
      if (error) throw error
      setCurrentSec({ ...currentSec, contenu: { html: editorHtml } })
      showToast('Contenu enregistré', 'success')
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setSavingSection(false)
    }
  }

  function buildContentDraft(sec) {
    const c = sec.contenu || {}
    if (sec.type === 'blocs') return { blocks: Array.isArray(c.blocks) ? c.blocks.map(b => ({ ...b })) : [] }
    if (sec.type === 'definition' || sec.type === 'exemple') return { fr: c.fr || '' }
    if (sec.type === 'formule' || sec.type === 'liste') return { fr: Array.isArray(c.fr) ? [...c.fr] : [] }
    if (sec.type === 'activite') return {
      contexte: c.contexte || '',
      phases: Array.isArray(c.phases) ? c.phases.map(p => ({
        label: p.label || '', question_depart: p.question_depart || '', consignes: p.consignes ? [...p.consignes] : [],
      })) : [],
    }
    return {}
  }

  async function handleSaveContent() {
    setSavingSection(true)
    try {
      await backupChapitre(currentCh.id, `avant modification de la section "${currentSec.titre_fr}"`, user.id)
      const { error } = await supabase.from('sections_cours')
        .update({ contenu: contentDraft })
        .eq('id', currentSec.id)
      if (error) throw error
      setCurrentSec({ ...currentSec, contenu: contentDraft })
      showToast('Contenu enregistré', 'success')
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setSavingSection(false)
    }
  }

  if (!user) return (
    <div className="lock-screen">
      <div className="lock-icon">🔒</div>
      <h2>Contenu réservé</h2>
      <p>Connectez-vous pour accéder aux cours.</p>
    </div>
  )

  if (loading) return <p style={{ color: 'var(--text-3)', padding: '2rem' }}>Chargement…</p>

  if (view === 'list') return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 className="page-heading">Cours</h2>
          <p className="page-sub">Sélectionnez un chapitre.</p>
        </div>
        {canEdit() && <EditorModeToggle editMode={editMode} setEditMode={setEditMode} />}
      </div>

      {editMode && (
        <div className="edit-mode-bar">
          <span>Mode édition — modifiez ou supprimez un chapitre, ou ajoutez-en un nouveau.</span>
        </div>
      )}

      <div className="tiles-grid">
        {chapitres.map((ch, i) => (
          <div key={ch.id} className="module-tile" onClick={() => openChapitre(ch)}>
            {editMode && (
              <div className="tile-actions">
                <button className="icon-btn" onClick={e => { e.stopPropagation(); setChapitreModal(ch) }} title="Modifier">✏️</button>
                <button className="icon-btn danger" onClick={e => { e.stopPropagation(); setConfirmDelete({ type: 'chapitre', item: ch }) }} title="Supprimer">🗑️</button>
              </div>
            )}
            <div className="tile-num">{String(i + 1).padStart(2, '0')}</div>
            <div className="tile-emoji">{ch.emoji}</div>
            <h3>{ch.titre_fr}</h3>
            <p>{ch.description_fr}</p>
          </div>
        ))}
        {editMode && (
          <div className="module-tile new-tile" onClick={() => setChapitreModal('new')}>
            <div className="tile-emoji">➕</div>
            <h3>Nouveau chapitre</h3>
          </div>
        )}
      </div>

      {chapitreModal && (
        <ChapitreModal
          chapitre={chapitreModal === 'new' ? null : chapitreModal}
          matiereId={matiereId}
          onClose={() => setChapitreModal(null)}
          onSaved={() => { loadChapitres(); refreshSidebar() }}
          showToast={showToast}
        />
      )}
      {confirmDelete?.type === 'chapitre' && (
        <ConfirmModal
          title="Supprimer ce chapitre ?"
          message={`"${confirmDelete.item.titre_fr}" et toutes ses sections seront supprimés définitivement (une sauvegarde est créée automatiquement).`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDeleteChapitre(confirmDelete.item)}
        />
      )}
    </div>
  )

  if (view === 'chapitre') return (
    <div>
      <div className="breadcrumb">
        <button onClick={goList}>Cours</button>
        <span className="bc-sep">›</span>
        <span>{currentCh?.titre_fr}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="cours-header">
          <div className="ch-icon">{currentCh?.emoji}</div>
          <div>
            <h2>{currentCh?.titre_fr}</h2>
            <p>{currentCh?.description_fr}</p>
          </div>
        </div>
        {canEdit() && <EditorModeToggle editMode={editMode} setEditMode={setEditMode} />}
      </div>

      {editMode && (
        <div className="edit-mode-bar">
          <span>Mode édition — glissez ⠿ pour réordonner, ou modifiez/supprimez une section.</span>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {sections.map((s, i) => (
              <SortableSectionRow
                key={s.id}
                section={s}
                index={i}
                editMode={editMode}
                onOpen={() => openSection(currentCh.id, s.id)}
                onEdit={() => setSectionModal(s)}
                onDelete={() => setConfirmDelete({ type: 'section', item: s })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {editMode && (
        <button className="fic-btn" style={{ marginTop: '0.75rem' }} onClick={() => setSectionModal('new')}>
          ➕ Nouvelle section
        </button>
      )}

      {sectionModal && (
        <SectionModal
          section={sectionModal === 'new' ? null : sectionModal}
          chapitreId={currentCh.id}
          onClose={() => setSectionModal(null)}
          onSaved={() => { openChapitre(currentCh); refreshSidebar() }}
          showToast={showToast}
        />
      )}
      {confirmDelete?.type === 'section' && (
        <ConfirmModal
          title="Supprimer cette section ?"
          message={`"${confirmDelete.item.titre_fr}" sera supprimée définitivement (une sauvegarde est créée automatiquement).`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDeleteSection(confirmDelete.item)}
        />
      )}
    </div>
  )

  if (view === 'section' && currentSec) {
    const idx  = sections.findIndex(s => s.id === currentSec.id)
    const prev = idx > 0 ? sections[idx - 1] : null
    const next = idx < sections.length - 1 ? sections[idx + 1] : null

    return (
      <div>
        <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <button onClick={goList}>Cours</button>
            <span className="bc-sep">›</span>
            <button onClick={goChapitre}>{currentCh?.titre_fr}</button>
            <span className="bc-sep">›</span>
            <span>{currentSec.titre_fr}</span>
          </div>
          {canEdit() && <EditorModeToggle editMode={editMode} setEditMode={setEditMode} />}
        </div>

        {canEdit() && editMode && (
          <div className="edit-mode-bar">
            <span>{currentSec.titre_fr} — {currentSec.type}</span>
            <button className="fic-btn" onClick={() => setSectionModal(currentSec)}>✏️ Métadonnées</button>
          </div>
        )}

        <div className="cours-section-block">
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)' }}>
            {currentSec.titre_fr}
          </h3>
          {canEdit() && editMode && currentSec.type === 'editeur' ? (
            editorLoadedFor === `${currentSec.id}:${currentSec.type}` ? (
              <div>
                <TiptapEditor key={currentSec.id} content={editorHtml} onChange={setEditorHtml} showToast={showToast} />
                <button className="btn-primary" style={{ width: 'auto', marginTop: '0.9rem', padding: '0.6rem 1.4rem' }}
                  onClick={handleSaveEditeur} disabled={savingSection}>
                  {savingSection ? 'Enregistrement…' : '💾 Enregistrer'}
                </button>
                <PreviewPane sec={{ type: 'editeur', contenu: { html: editorHtml } }} />
              </div>
            ) : (
              <p style={{ color: 'var(--text-3)' }}>Chargement…</p>
            )
          ) : canEdit() && editMode ? (
            contentLoadedFor === `${currentSec.id}:${currentSec.type}` ? (
              <div>
                <SectionContentEditor type={currentSec.type} draft={contentDraft} onChange={setContentDraft} showToast={showToast} />
                <button className="btn-primary" style={{ width: 'auto', marginTop: '0.9rem', padding: '0.6rem 1.4rem' }}
                  onClick={handleSaveContent} disabled={savingSection}>
                  {savingSection ? 'Enregistrement…' : '💾 Enregistrer'}
                </button>
                <PreviewPane sec={{ type: currentSec.type, contenu: contentDraft }} />
              </div>
            ) : (
              <p style={{ color: 'var(--text-3)' }}>Chargement…</p>
            )
          ) : (
            <SectionBody sec={currentSec} />
          )}
        </div>

        <ExercicesList sectionId={currentSec.id} chapitreId={currentCh.id} matiereId={matiereId} showToast={showToast} />

        <div className="cours-nav">
          {prev && (
            <button className="btn-nav" onClick={() => {
              setCurrentSec(prev)
              window.dispatchEvent(new CustomEvent('cours:section', { detail: { chId: currentCh.id, secId: prev.id } }))
            }}>← {prev.titre_fr}</button>
          )}
          {next && (
            <button className="btn-nav next" onClick={() => {
              setCurrentSec(next)
              window.dispatchEvent(new CustomEvent('cours:section', { detail: { chId: currentCh.id, secId: next.id } }))
            }}>{next.titre_fr} →</button>
          )}
        </div>

        {sectionModal && (
          <SectionModal
            section={sectionModal === 'new' ? null : sectionModal}
            chapitreId={currentCh.id}
            onClose={() => setSectionModal(null)}
            onSaved={async () => {
              refreshSidebar()
              const { data, error } = await supabase.from('sections_cours').select('*').eq('id', currentSec.id).single()
              if (error) { showToast(error.message, 'error'); return }
              setCurrentSec(data)
            }}
            showToast={showToast}
          />
        )}
      </div>
    )
  }

  return null
}

function EditorModeToggle({ editMode, setEditMode }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer',
      fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', userSelect: 'none',
    }}>
      <input type="checkbox" checked={editMode} onChange={e => setEditMode(e.target.checked)} />
      Mode édition
    </label>
  )
}

function PreviewPane({ sec }) {
  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{
        fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--text-3)', marginBottom: '0.6rem',
      }}>
        👁️ Aperçu — ce que verront les élèves
      </div>
      <div style={{
        border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)',
        padding: '1.25rem', background: 'var(--bg)',
      }}>
        <SectionBody sec={sec} />
      </div>
    </div>
  )
}

function SectionBody({ sec }) {
  const { type, contenu } = sec
  const c = contenu || {}

  if (type === 'blocs') return (
    <div>
      {(c.blocks || []).map(block => <BlockBody key={block.id} block={block} />)}
    </div>
  )

  if (type === 'definition') return (
    <div className="box box-definition">
      <div className="box-label">Définition</div>
      <div className="html-content" dangerouslySetInnerHTML={{ __html: c.fr || '' }} />
    </div>
  )
  if (type === 'exemple') return (
    <div className="box box-exemple">
      <div className="box-label">Exemple</div>
      <div className="html-content" dangerouslySetInnerHTML={{ __html: c.fr || '' }} />
    </div>
  )
  if (type === 'formule') return (
    <div>{Array.isArray(c.fr) && c.fr.map((f, i) => <div key={i} className="formule-display">{f}</div>)}</div>
  )
  if (type === 'liste') return (
    <div className="box box-definition">
      <ul style={{ marginLeft: '1.25rem', lineHeight: 1.7 }}>
        {Array.isArray(c.fr) && c.fr.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  )
  if (type === 'activite') return (
    <div>
      <div className="activite-banner">✏️ Tâche à réaliser</div>
      {c.contexte && (
        <div className="box box-exemple" style={{ marginBottom: '1rem' }}>
          <div className="box-label">Contexte</div>
          <div className="html-content" dangerouslySetInnerHTML={{ __html: c.contexte }} />
        </div>
      )}
      {Array.isArray(c.phases) && c.phases.length > 0 && (
        <div className="activite-phases">
          {c.phases.map((phase, i) => (
            <div key={i} className="activite-phase" style={{ borderLeftColor: i % 2 === 0 ? 'var(--navy)' : 'var(--cn)' }}>
              <div className="activite-phase-header">
                <span>{['👥', '🎤', '🚀', '📊', '💡'][i % 5]}</span><strong>{phase.label}</strong>
              </div>
              {phase.question_depart && (
                <div className="activite-question">
                  ❓ <span className="html-content" dangerouslySetInnerHTML={{ __html: phase.question_depart }} />
                </div>
              )}
              <ul className="activite-list">{phase.consignes?.map((ci, idx) => <li key={idx}>{ci}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
  if (type === 'editeur') return (
    <div className="tiptap-editor" style={{ border: 'none', padding: 0, minHeight: 'unset' }}
      dangerouslySetInnerHTML={{ __html: c.html || '' }} />
  )
  return <p style={{ color: 'var(--text-3)' }}>Contenu non disponible.</p>
}

