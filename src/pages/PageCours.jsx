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
import { fetchMyClasses } from '../lib/progression'
import { fetchRevealedBlocIds, revealBloc, hideBloc } from '../lib/reveal'

export default function PageCours({ matiereId, showToast }) {
  const { user, profile, canEditMatiere, visibleFilieres } = useAuth()
  const canEdit = () => canEditMatiere(matiereId)
  const [view, setView]             = useState('list')
  const [chapitres, setChapitres]   = useState([])
  const [currentCh, setCurrentCh]   = useState(null)
  const [currentSec, setCurrentSec] = useState(null)
  const [currentPartie, setCurrentPartie] = useState(null)
  const [sections, setSections]     = useState([])
  const [parties, setParties]       = useState([])
  const [loading, setLoading]       = useState(false)

  // La vue 'section' affiche le contenu de currentSec ; la vue 'partie' affiche celui de
  // currentPartie. Les deux partagent le même bloc de rendu/édition (une partie est une
  // sections_cours comme une autre, juste avec parent_section_id renseigné).
  const openRow = view === 'partie' ? currentPartie : currentSec
  function setOpenRow(updater) {
    if (view === 'partie') setCurrentPartie(updater)
    else setCurrentSec(updater)
  }

  const [myClasses, setMyClasses]         = useState([])
  const [activeClasseId, setActiveClasseId] = useState('')
  const [revealedBlocIds, setRevealedBlocIds] = useState(new Set())
  const [allChapitres, setAllChapitres]   = useState([]) // tous les chapitres, toutes matières — pour les sélecteurs "déplacer vers"
  const [matieresById, setMatieresById]   = useState({})

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

  // Les chapitres cibles d'un déplacement (section/partie/bloc/exercice) ne doivent pas se
  // limiter à la matière courante : un chapitre peut être partagé entre plusieurs matières/
  // filières (ex. ACENT 3CN et ENTRA 2TPCM), et on veut pouvoir y déplacer du contenu même
  // depuis une autre matière.
  useEffect(() => {
    if (!profile || !canEdit()) return
    Promise.all([
      supabase.from('chapitres').select('*').order('ordre'),
      supabase.from('matieres').select('id, nom'),
    ]).then(([{ data: chData, error: chErr }, { data: matData, error: matErr }]) => {
      if (chErr) { showToast(chErr.message, 'error'); return }
      if (matErr) { showToast(matErr.message, 'error'); return }
      setAllChapitres(chData || [])
      setMatieresById(Object.fromEntries((matData || []).map(m => [m.id, m.nom])))
    })
  }, [profile])

  useEffect(() => {
    if (!profile || !canEdit()) return
    fetchMyClasses(profile.role, user.id)
      .then(cls => { setMyClasses(cls); if (cls.length > 0) setActiveClasseId(prev => prev || cls[0].id) })
      .catch(err => showToast(err.message || 'Erreur', 'error'))
  }, [profile])

  const classeIdActive = canEdit() ? activeClasseId : profile?.classe_id

  useEffect(() => {
    if ((view !== 'section' && view !== 'partie') || !openRow) { setRevealedBlocIds(new Set()); return }
    if (!classeIdActive) { setRevealedBlocIds(new Set()); return }
    fetchRevealedBlocIds(openRow.id, classeIdActive)
      .then(setRevealedBlocIds)
      .catch(err => showToast(err.message || 'Erreur', 'error'))
  }, [openRow, view, classeIdActive])

  async function toggleReveal(blocId, isRevealed) {
    if (!classeIdActive) return
    try {
      if (isRevealed) {
        await hideBloc(blocId, classeIdActive)
        setRevealedBlocIds(prev => { const next = new Set(prev); next.delete(blocId); return next })
      } else {
        await revealBloc(openRow.id, blocId, classeIdActive, user.id)
        setRevealedBlocIds(prev => new Set(prev).add(blocId))
      }
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    }
  }

  useEffect(() => {
    if (!openRow || (view !== 'section' && view !== 'partie')) return
    const key = `${openRow.id}:${openRow.type}`
    if (openRow.type === 'editeur' && editorLoadedFor !== key) {
      setEditorHtml(openRow.contenu?.html || '')
      setEditorLoadedFor(key)
    }
    if (openRow.type !== 'editeur' && contentLoadedFor !== key) {
      setContentDraft(buildContentDraft(openRow))
      setContentLoadedFor(key)
    }
  }, [openRow, view])

  useEffect(() => {
    function onChapitre(e) {
      const ch = chapitres.find(c => c.id === e.detail.id)
      if (ch) openChapitre(ch)
    }
    function onSection(e) { openSection(e.detail.chId, e.detail.secId) }
    async function onPartie(e) {
      await openSection(e.detail.chId, e.detail.secId)
      openPartie(e.detail.partieId)
    }
    window.addEventListener('sidebar:chapitre', onChapitre)
    window.addEventListener('sidebar:section', onSection)
    window.addEventListener('sidebar:partie', onPartie)
    return () => {
      window.removeEventListener('sidebar:chapitre', onChapitre)
      window.removeEventListener('sidebar:section', onSection)
      window.removeEventListener('sidebar:partie', onPartie)
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
    setCurrentPartie(null)
    setView('chapitre')
    window.dispatchEvent(new CustomEvent('cours:chapitre', { detail: { id: ch.id } }))
    const { data, error } = await supabase.from('sections_cours').select('*').eq('chapitre_id', ch.id).order('ordre')
    if (error) { showToast(error.message, 'error'); return }
    const visible = visibleFilieres ? data.filter(s => s.filieres.some(f => visibleFilieres.includes(f))) : data
    const topLevel = visible.filter(s => !s.parent_section_id)
    topLevel.forEach(s => { s.parties = visible.filter(p => p.parent_section_id === s.id) })
    setSections(topLevel)
  }

  async function loadParties(sectionId) {
    const { data, error } = await supabase.from('sections_cours').select('*').eq('parent_section_id', sectionId).order('ordre')
    if (error) { showToast(error.message, 'error'); return }
    setParties(visibleFilieres ? data.filter(s => s.filieres.some(f => visibleFilieres.includes(f))) : data)
  }

  // Les blocs importés avant la fonctionnalité de masquage n'ont pas de champ `id` propre
  // (juste {"type": "texte", "html": "..."}) : on en génère un et on le persiste dès
  // l'ouverture, sinon "réveler" un tel bloc écrirait bloc_id: null dans revele_etat.
  async function ensureBlockIds(sec) {
    const blocks = sec.contenu?.blocks
    if (sec.type !== 'blocs' || !Array.isArray(blocks) || blocks.every(b => b.id)) return sec
    const contenu = { ...sec.contenu, blocks: blocks.map(b => ({ ...b, id: b.id || crypto.randomUUID() })) }
    if (canEdit()) {
      const { error } = await supabase.from('sections_cours').update({ contenu }).eq('id', sec.id)
      if (error) showToast(error.message, 'error')
    }
    return { ...sec, contenu }
  }

  async function openSection(chId, secId) {
    if (!currentCh || currentCh.id !== chId) {
      const ch = chapitres.find(c => c.id === chId)
      if (ch) await openChapitre(ch)
    }
    const { data, error } = await supabase.from('sections_cours').select('*').eq('id', secId).single()
    if (error) { showToast(error.message, 'error'); return }
    setCurrentSec(await ensureBlockIds(data))
    setCurrentPartie(null)
    setView('section')
    await loadParties(secId)
    window.dispatchEvent(new CustomEvent('cours:section', { detail: { chId, secId } }))
  }

  async function openPartie(partieId) {
    const { data, error } = await supabase.from('sections_cours').select('*').eq('id', partieId).single()
    if (error) { showToast(error.message, 'error'); return }
    setCurrentPartie(await ensureBlockIds(data))
    setView('partie')
    window.dispatchEvent(new CustomEvent('cours:partie', { detail: { chId: currentCh.id, secId: currentSec.id, partieId } }))
  }

  function goList() {
    setView('list')
    window.dispatchEvent(new CustomEvent('cours:back'))
  }

  function goChapitre() {
    setView('chapitre')
    window.dispatchEvent(new CustomEvent('cours:chapitre', { detail: { id: currentCh?.id } }))
  }

  function goSection() {
    setView('section')
    window.dispatchEvent(new CustomEvent('cours:section', { detail: { chId: currentCh?.id, secId: currentSec?.id } }))
  }

  // Après la modale de déplacement/conversion (SectionModal) : si la ligne a désormais un
  // parent (devenue une partie), on atterrit sur la section parente ; sinon sur le chapitre
  // (section de premier niveau, comme avant la fonctionnalité "partie").
  function handleSectionMoved(newChapitreId, newParentId) {
    refreshSidebar()
    const ch = chapitres.find(c => c.id === newChapitreId)
    if (!ch) {
      // Déplacé vers un chapitre d'une autre matière : cette page (scopée à la matière
      // courante) ne peut pas y naviguer — on revient simplement sur le chapitre d'origine.
      if (currentCh) goChapitre()
      return
    }
    if (newParentId) openSection(newChapitreId, newParentId)
    else openChapitre(ch)
  }

  async function handleMoveBlock(block, toChapitreId, toSectionId) {
    try {
      await backupChapitre(currentCh.id, `avant déplacement d'un bloc de la section "${openRow.titre_fr}"`, user.id)
      if (toChapitreId !== currentCh.id) {
        await backupChapitre(toChapitreId, `avant réception d'un bloc déplacé depuis "${openRow.titre_fr}"`, user.id)
      }

      const newBlocks = (contentDraft.blocks || []).filter(b => b.id !== block.id)
      const { error: sourceError } = await supabase.from('sections_cours')
        .update({ contenu: { ...contentDraft, blocks: newBlocks } })
        .eq('id', openRow.id)
      if (sourceError) throw sourceError

      const { data: targetSec, error: fetchError } = await supabase.from('sections_cours')
        .select('contenu').eq('id', toSectionId).single()
      if (fetchError) throw fetchError
      const targetBlocks = [...(targetSec.contenu?.blocks || []), block]
      const { error: targetError } = await supabase.from('sections_cours')
        .update({ contenu: { ...targetSec.contenu, blocks: targetBlocks } })
        .eq('id', toSectionId)
      if (targetError) throw targetError

      await supabase.from('revele_etat').update({ section_id: toSectionId }).eq('bloc_id', block.id)

      setContentDraft({ ...contentDraft, blocks: newBlocks })
      setOpenRow(prev => ({ ...prev, contenu: { ...prev.contenu, blocks: newBlocks } }))
      refreshSidebar()
      showToast('Bloc déplacé', 'success')
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    }
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

  // ── Sections / Parties CRUD ──────────────────────────────────
  // Une "partie" est une sections_cours avec parent_section_id renseigné : la suppression
  // est la même opération, seule la navigation de retour diffère.
  async function handleDeleteSection(s) {
    try {
      await backupChapitre(currentCh.id, `avant suppression de "${s.titre_fr}"`, user.id)
      const { error } = await supabase.from('sections_cours').delete().eq('id', s.id)
      if (error) throw error
      showToast(s.parent_section_id ? 'Partie supprimée' : 'Section supprimée', 'success')
      if (s.parent_section_id) {
        if (currentPartie?.id === s.id) { setCurrentPartie(null); setView('section') }
        await loadParties(s.parent_section_id)
      } else {
        if (currentSec?.id === s.id) goChapitre()
        openChapitre(currentCh)
      }
      refreshSidebar()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setConfirmDelete(null)
    }
  }

  // Copie une sections_cours (contenu, exercices/exercice_blocks compris) sous un nouvel
  // id. `newParentId`/`newChapitreId` permettent de la rattacher ailleurs que l'original
  // (utilisé pour dupliquer récursivement les parties d'une section dupliquée).
  async function duplicateRow(row, { newParentId = row.parent_section_id, newChapitreId = row.chapitre_id, ordreOverride } = {}) {
    const newId = crypto.randomUUID()
    // `parties` est une annotation purement côté client ajoutée par openChapitre() pour
    // l'aperçu dans la vue chapitre — ce n'est pas une colonne de sections_cours.
    const { id, created_at, updated_at, parties: _parties, ...rest } = row
    const { error } = await supabase.from('sections_cours').insert({
      ...rest, id: newId, chapitre_id: newChapitreId, parent_section_id: newParentId,
      ordre: ordreOverride ?? row.ordre, titre_fr: `${row.titre_fr} (copie)`,
    })
    if (error) throw error

    const { data: blocks } = await supabase.from('exercice_blocks').select('*').eq('section_id', row.id)
    const blockIdMap = {}
    for (const b of blocks || []) {
      const newBlockId = crypto.randomUUID()
      blockIdMap[b.id] = newBlockId
      const { id: bId, created_at: bc, updated_at: bu, ...bRest } = b
      const { error: bErr } = await supabase.from('exercice_blocks').insert({ ...bRest, id: newBlockId, section_id: newId, chapitre_id: newChapitreId })
      if (bErr) throw bErr
    }

    const { data: exs } = await supabase.from('exercices').select('*').eq('section_id', row.id)
    for (const ex of exs || []) {
      const { id: exId, created_at: ec, updated_at: eu, ...exRest } = ex
      const { error: exErr } = await supabase.from('exercices').insert({
        ...exRest, id: crypto.randomUUID(), section_id: newId, chapitre_id: newChapitreId,
        block_id: ex.block_id ? blockIdMap[ex.block_id] : null,
      })
      if (exErr) throw exErr
    }
    return newId
  }

  async function handleDuplicateSection(s) {
    try {
      await backupChapitre(currentCh.id, `avant duplication de "${s.titre_fr}"`, user.id)
      const { data: maxRows } = await supabase.from('sections_cours')
        .select('ordre').eq('chapitre_id', currentCh.id)
        [s.parent_section_id ? 'eq' : 'is']('parent_section_id', s.parent_section_id || null)
        .order('ordre', { ascending: false }).limit(1)
      const ordre = (maxRows?.[0]?.ordre ?? -1) + 1
      const newId = await duplicateRow(s, { ordreOverride: ordre })

      if (!s.parent_section_id) {
        const { data: childParties } = await supabase.from('sections_cours').select('*').eq('parent_section_id', s.id).order('ordre')
        for (const p of childParties || []) {
          await duplicateRow(p, { newParentId: newId })
        }
      }

      showToast(s.parent_section_id ? 'Partie dupliquée' : 'Section dupliquée', 'success')
      if (s.parent_section_id) await loadParties(s.parent_section_id)
      else openChapitre(currentCh)
      refreshSidebar()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
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

  async function handleDragEndParties(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = parties.findIndex(s => s.id === active.id)
    const newIndex = parties.findIndex(s => s.id === over.id)
    const reordered = arrayMove(parties, oldIndex, newIndex)
    const previous = parties
    setParties(reordered)
    try {
      await backupChapitre(currentCh.id, `avant réordonnancement des parties de "${currentSec.titre_fr}"`, user.id)
      const results = await Promise.all(reordered.map((s, i) => supabase.from('sections_cours').update({ ordre: i }).eq('id', s.id)))
      const failed = results.find(r => r.error)
      if (failed) throw failed.error
      refreshSidebar()
    } catch (err) {
      setParties(previous)
      showToast(err.message || 'Erreur lors du réordonnancement', 'error')
    }
  }

  async function handleSaveEditeur() {
    setSavingSection(true)
    try {
      await backupChapitre(currentCh.id, `avant modification de la section "${openRow.titre_fr}"`, user.id)
      const { error } = await supabase.from('sections_cours')
        .update({ contenu: { html: editorHtml } })
        .eq('id', openRow.id)
      if (error) throw error
      setOpenRow({ ...openRow, contenu: { html: editorHtml } })
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
      await backupChapitre(currentCh.id, `avant modification de la section "${openRow.titre_fr}"`, user.id)
      const { error } = await supabase.from('sections_cours')
        .update({ contenu: contentDraft })
        .eq('id', openRow.id)
      if (error) throw error
      setOpenRow({ ...openRow, contenu: contentDraft })
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {canEdit() && myClasses.length > 0 && (
            <ClasseActiveSelector classes={myClasses} value={activeClasseId} onChange={setActiveClasseId} />
          )}
          {canEdit() && <EditorModeToggle editMode={editMode} setEditMode={setEditMode} />}
        </div>
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
              <div key={s.id}>
                <SortableSectionRow
                  section={s}
                  index={i}
                  editMode={editMode}
                  onOpen={() => openSection(currentCh.id, s.id)}
                  onEdit={() => setSectionModal(s)}
                  onDuplicate={() => handleDuplicateSection(s)}
                  onDelete={() => setConfirmDelete({ type: 'section', item: s })}
                />
                {s.parties?.length > 0 && (
                  <div className="parties-preview">
                    {s.parties.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="partie-preview-item"
                        onClick={async () => { await openSection(currentCh.id, s.id); openPartie(p.id) }}
                      >
                        {p.type === 'activite' ? '✏️ ' : ''}{p.titre_fr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
          chapitres={allChapitres}
          matieresById={matieresById}
          onClose={() => setSectionModal(null)}
          onSaved={() => { openChapitre(currentCh); refreshSidebar() }}
          onMoved={handleSectionMoved}
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

  if ((view === 'section' || view === 'partie') && openRow) {
    const siblings    = view === 'partie' ? parties : sections
    const openSibling = id => view === 'partie' ? openPartie(id) : openSection(currentCh.id, id)
    const idx  = siblings.findIndex(s => s.id === openRow.id)
    const prev = idx > 0 ? siblings[idx - 1] : null
    const next = idx < siblings.length - 1 ? siblings[idx + 1] : null

    return (
      <div>
        <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <button onClick={goList}>Cours</button>
            <span className="bc-sep">›</span>
            <button onClick={goChapitre}>{currentCh?.titre_fr}</button>
            {view === 'partie' && (
              <>
                <span className="bc-sep">›</span>
                <button onClick={goSection}>{currentSec?.titre_fr}</button>
              </>
            )}
            <span className="bc-sep">›</span>
            <span>{openRow.titre_fr}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {canEdit() && myClasses.length > 0 && (
              <ClasseActiveSelector classes={myClasses} value={activeClasseId} onChange={setActiveClasseId} />
            )}
            {canEdit() && <EditorModeToggle editMode={editMode} setEditMode={setEditMode} />}
          </div>
        </div>

        {canEdit() && editMode && (
          <div className="edit-mode-bar">
            <span>{openRow.titre_fr} — {openRow.type}</span>
            <button className="fic-btn" onClick={() => setSectionModal(openRow)}>✏️ Métadonnées</button>
          </div>
        )}

        <div className="cours-section-block">
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)' }}>
            {openRow.titre_fr}
          </h3>
          {canEdit() && editMode && openRow.type === 'editeur' ? (
            editorLoadedFor === `${openRow.id}:${openRow.type}` ? (
              <div>
                <TiptapEditor key={openRow.id} content={editorHtml} onChange={setEditorHtml} showToast={showToast} />
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
            contentLoadedFor === `${openRow.id}:${openRow.type}` ? (
              <div>
                <SectionContentEditor
                  type={openRow.type}
                  draft={contentDraft}
                  onChange={setContentDraft}
                  showToast={showToast}
                  revealProps={{
                    activeClasseId, myClasses, revealedBlocIds,
                    onChangeActiveClasse: setActiveClasseId,
                    onToggleReveal: toggleReveal,
                  }}
                  chapitres={allChapitres}
                  matieresById={matieresById}
                  chapitreId={currentCh.id}
                  sectionId={openRow.id}
                  onMoveBlock={handleMoveBlock}
                />
                <button className="btn-primary" style={{ width: 'auto', marginTop: '0.9rem', padding: '0.6rem 1.4rem' }}
                  onClick={handleSaveContent} disabled={savingSection}>
                  {savingSection ? 'Enregistrement…' : '💾 Enregistrer'}
                </button>
                <PreviewPane sec={{ type: openRow.type, contenu: contentDraft }} />
              </div>
            ) : (
              <p style={{ color: 'var(--text-3)' }}>Chargement…</p>
            )
          ) : (
            <SectionBody
              sec={openRow}
              canEdit={canEdit()}
              revealedBlocIds={revealedBlocIds}
              onToggleReveal={toggleReveal}
            />
          )}
        </div>

        <ExercicesList sectionId={openRow.id} chapitreId={currentCh.id} matiereId={matiereId} showToast={showToast} />

        {view === 'section' && (
          <div className="cours-section-block" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: parties.length > 0 ? '1rem' : 0 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)' }}>Parties</h3>
            </div>
            {parties.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndParties}>
                <SortableContext items={parties.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {parties.map((s, i) => (
                      <SortableSectionRow
                        key={s.id}
                        section={s}
                        index={i}
                        editMode={editMode}
                        onOpen={() => openPartie(s.id)}
                        onEdit={() => setSectionModal(s)}
                        onDuplicate={() => handleDuplicateSection(s)}
                        onDelete={() => setConfirmDelete({ type: 'section', item: s })}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {editMode && (
              <button className="fic-btn" style={{ marginTop: '0.75rem' }} onClick={() => setSectionModal('new-partie')}>
                ➕ Nouvelle partie
              </button>
            )}
          </div>
        )}

        <div className="cours-nav">
          {prev && (
            <button className="btn-nav" onClick={() => openSibling(prev.id)}>← {prev.titre_fr}</button>
          )}
          {next && (
            <button className="btn-nav next" onClick={() => openSibling(next.id)}>{next.titre_fr} →</button>
          )}
        </div>

        {sectionModal && (
          <SectionModal
            section={typeof sectionModal === 'string' ? null : sectionModal}
            chapitreId={currentCh.id}
            parentSectionId={sectionModal === 'new-partie' ? currentSec.id : null}
            chapitres={allChapitres}
            matieresById={matieresById}
            onClose={() => setSectionModal(null)}
            onSaved={async () => {
              refreshSidebar()
              if (currentSec) {
                const { data, error } = await supabase.from('sections_cours').select('*').eq('id', currentSec.id).single()
                if (!error) setCurrentSec(await ensureBlockIds(data))
                await loadParties(currentSec.id)
              }
              if (currentPartie) {
                const { data, error } = await supabase.from('sections_cours').select('*').eq('id', currentPartie.id).single()
                if (!error) setCurrentPartie(await ensureBlockIds(data))
              }
            }}
            onMoved={handleSectionMoved}
            showToast={showToast}
          />
        )}
        {confirmDelete?.type === 'section' && (
          <ConfirmModal
            title={confirmDelete.item.parent_section_id ? 'Supprimer cette partie ?' : 'Supprimer cette section ?'}
            message={`"${confirmDelete.item.titre_fr}" sera supprimée définitivement (une sauvegarde est créée automatiquement).`}
            onCancel={() => setConfirmDelete(null)}
            onConfirm={() => handleDeleteSection(confirmDelete.item)}
          />
        )}
      </div>
    )
  }

  return null
}

function ClasseActiveSelector({ classes, value, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)' }}>
      Classe active
      <select className="form-select" value={value} onChange={e => onChange(e.target.value)} style={{ maxWidth: '160px' }}>
        {classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
    </label>
  )
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

function SectionBody({ sec, canEdit = false, revealedBlocIds, onToggleReveal }) {
  const { type, contenu } = sec
  const c = contenu || {}

  if (type === 'blocs') return (
    <div>
      {(c.blocks || []).map(block => {
        if (!block.masquable) return <BlockBody key={block.id} block={block} />
        const isRevealed = !revealedBlocIds || revealedBlocIds.has(block.id)
        // Le contenu masqué reste caché même pour l'enseignant en navigation normale (pas en
        // mode édition) : le cours est souvent projeté au beamer devant la classe, afficher le
        // contenu réel côté enseignant le révélerait quand même à l'écran.
        if (canEdit) return (
          <div key={block.id} style={{ position: 'relative', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', marginBottom: '1rem' }}>
            <button
              type="button"
              className="fic-btn"
              style={{ marginBottom: '0.6rem' }}
              onClick={() => onToggleReveal?.(block.id, isRevealed)}
            >
              {isRevealed ? '🔓 Révélé — cliquer pour re-masquer' : '🔒 Masqué — cliquer pour révéler'}
            </button>
            {isRevealed ? <BlockBody block={block} /> : (
              <p style={{ fontStyle: 'italic', color: 'var(--text-3)', margin: 0 }}>
                🔒 Contenu masqué pour les élèves (y compris au beamer) — cliquez ci-dessus pour révéler.
              </p>
            )}
          </div>
        )
        if (!isRevealed) return (
          <div key={block.id} className="box box-definition" style={{ fontStyle: 'italic', color: 'var(--text-2)' }}>
            🔍 Contenu à découvrir. Faites vos recherches (internet, IA) sur le sujet — votre enseignant révélera le contenu officiel après correction collective.
          </div>
        )
        return <BlockBody key={block.id} block={block} />
      })}
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
    <div className="box box-liste">
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

