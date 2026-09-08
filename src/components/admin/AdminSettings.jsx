import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminSettings({ showToast }) {
  const [id, setId]             = useState(null)
  const [nomSite, setNomSite]   = useState('')
  const [sousTitre, setSousTitre] = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('app_settings').select('*').limit(1).single()
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setId(data.id)
    setNomSite(data.nom_site)
    setSousTitre(data.sous_titre)
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nomSite.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase.from('app_settings')
        .update({ nom_site: nomSite, sous_titre: sousTitre, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      showToast('Paramètres mis à jour', 'success')
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  return (
    <div style={{ maxWidth: '420px' }}>
      <p className="page-sub" style={{ marginBottom: '1.25rem' }}>
        Nom et sous-titre affichés en haut à gauche du site.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nom du site</label>
          <input className="form-input" value={nomSite} onChange={e => setNomSite(e.target.value)} placeholder="EHub" />
        </div>
        <div className="form-group">
          <label>Sous-titre</label>
          <input className="form-input" value={sousTitre} onChange={e => setSousTitre(e.target.value)} placeholder="Économie de Gestion" />
        </div>
        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
