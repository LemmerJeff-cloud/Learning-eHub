import React, { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import SectionBlocksEditor from '../components/admin/SectionBlocksEditor'
import BlockBody from '../components/BlockBody'

export const INFOS_SECTIONS = [
  { cle: 'general', label: 'Général' },
  { cle: 'jel', label: 'JEL' },
  { cle: 'entreprises_entrainement', label: "Entreprises d'entraînement" },
  { cle: 'mini_entreprises', label: 'Mini-entreprises' },
  { cle: 'startup_program', label: 'Start-up Program' },
  { cle: 'gene', label: 'GEN-E' },
  { cle: 'liens_utiles', label: 'Liens utiles' },
]

export default function PageInfos({ showToast }) {
  const { user, canEdit } = useAuth()
  const [activeSub, setActiveSub] = useState('infos-general')
  const [section, setSection] = useState(null)
  const [draft, setDraft]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving]   = useState(false)

  const cle = activeSub.replace('infos-', '')
  const meta = INFOS_SECTIONS.find(s => s.cle === cle) || INFOS_SECTIONS[0]

  useEffect(() => {
    function onSub(e) { if (e.detail.id.startsWith('infos-')) { setActiveSub(e.detail.id); setEditMode(false) } }
    window.addEventListener('sidebar:sub', onSub)
    return () => window.removeEventListener('sidebar:sub', onSub)
  }, [])

  useEffect(() => { load() }, [cle])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('infos_sections').select('*').eq('cle', cle).single()
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setSection(data)
    setDraft({ blocks: Array.isArray(data.contenu?.blocks) ? data.contenu.blocks.map(b => ({ ...b })) : [] })
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { error } = await supabase.from('infos_sections')
        .update({ contenu: draft, updated_at: new Date().toISOString() })
        .eq('id', section.id)
      if (error) throw error
      showToast('Section enregistrée', 'success')
      setEditMode(false)
      load()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return (
    <div className="lock-screen">
      <div className="lock-icon">🔒</div>
      <h2>Contenu réservé</h2>
      <p>Connectez-vous pour accéder aux infos.</p>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h2 className="page-heading">{meta.label}</h2>
        {canEdit() && (
          <label style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', userSelect: 'none',
          }}>
            <input type="checkbox" checked={editMode} onChange={e => setEditMode(e.target.checked)} />
            Mode édition
          </label>
        )}
      </div>

      {loading || !draft ? (
        <p style={{ color: 'var(--text-3)' }}>Chargement…</p>
      ) : canEdit() && editMode ? (
        <div>
          <SectionBlocksEditor draft={draft} onChange={setDraft} showToast={showToast} />
          <button className="btn-primary" style={{ width: 'auto', marginTop: '0.9rem', padding: '0.6rem 1.4rem' }}
            onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : '💾 Enregistrer'}
          </button>
        </div>
      ) : draft.blocks.length === 0 ? (
        <div className="empty-state"><p>Aucun contenu pour l'instant.</p></div>
      ) : (
        <div>
          {draft.blocks.map(block => <BlockBody key={block.id} block={block} />)}
        </div>
      )}
    </div>
  )
}
