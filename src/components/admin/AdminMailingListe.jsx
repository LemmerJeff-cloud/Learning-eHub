import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const TYPES = [
  { value: 'classe',      label: 'Classe' },
  { value: 'lycee',       label: 'Lycée' },
  { value: 'filiere',     label: 'Filière (section)' },
  { value: 'entreprise',  label: 'Entreprise' },
]
// "; " est le séparateur attendu par la plupart des clients mail pour coller une liste
// de destinataires directement dans le champ À/Cc/Cci.
const SEPARATOR = '; '

export default function AdminMailingListe({ showToast }) {
  const [type, setType]           = useState('classe')
  const [classes, setClasses]     = useState([])
  const [lycees, setLycees]       = useState([])
  const [entreprises, setEntreprises] = useState([])
  const [filieres, setFilieres]   = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading]     = useState(true)
  const [generating, setGenerating] = useState(false)
  const [emails, setEmails]       = useState(null) // null = pas encore généré

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: cls }, { data: lyc }, { data: ent }, { data: fil }] = await Promise.all([
      supabase.from('classes').select('id, label').order('label'),
      supabase.from('lycees').select('id, nom').order('nom'),
      supabase.from('entreprises').select('id, nom').order('nom'),
      supabase.from('filieres').select('code, label').order('ordre'),
    ])
    setClasses(cls || [])
    setLycees(lyc || [])
    setEntreprises(ent || [])
    setFilieres(fil || [])
    setLoading(false)
  }

  function changeType(t) {
    setType(t)
    setSelectedId('')
    setEmails(null)
  }

  const options = type === 'classe' ? classes
    : type === 'lycee' ? lycees
    : type === 'entreprise' ? entreprises
    : filieres.map(f => ({ id: f.code, label: f.label }))

  async function handleGenerate() {
    if (!selectedId) return
    setGenerating(true)
    setEmails(null)
    try {
      // "classes!profiles_classe_id_fkey" nécessaire pour lever l'ambiguïté : profiles a
      // aussi une relation many-to-many vers classes via enseignant_classes.
      let query = supabase.from('profiles').select('prenom, initiale, email, classe:classes!profiles_classe_id_fkey!inner(lycee_id, section)').eq('role', 'eleve').not('email', 'is', null)
      if (type === 'classe') query = supabase.from('profiles').select('prenom, initiale, email').eq('role', 'eleve').not('email', 'is', null).eq('classe_id', selectedId)
      if (type === 'entreprise') query = supabase.from('profiles').select('prenom, initiale, email').eq('role', 'eleve').not('email', 'is', null).eq('entreprise_id', selectedId)
      if (type === 'lycee') query = query.eq('classe.lycee_id', selectedId)
      if (type === 'filiere') query = query.eq('classe.section', selectedId)

      const { data, error } = await query.order('prenom')
      if (error) throw error
      setEmails(data || [])
      if ((data || []).length === 0) showToast('Aucun élève avec adresse e-mail pour cette sélection', 'error')
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy() {
    const list = (emails || []).map(e => e.email).join(SEPARATOR)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API indisponible')
      // L'API Clipboard peut rester bloquée en attente de permission dans certains
      // contextes (ex. navigation automatisée) — on bascule sur le repli execCommand
      // plutôt que de laisser le bouton sans réaction.
      await Promise.race([
        navigator.clipboard.writeText(list),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
      ])
      showToast('Liste copiée', 'success')
    } catch {
      const ta = document.createElement('textarea')
      ta.value = list
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      showToast(ok ? 'Liste copiée' : "Impossible de copier automatiquement — sélectionnez le texte manuellement", ok ? 'success' : 'error')
    }
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  return (
    <div style={{ maxWidth: '560px' }}>
      <p className="page-sub" style={{ marginBottom: '1.25rem' }}>
        Génère la liste des adresses e-mail des élèves d'une classe, d'un lycée, d'une filière ou d'une entreprise.
      </p>

      <div className="form-group">
        <label>Regrouper par</label>
        <select className="form-select" value={type} onChange={e => changeType(e.target.value)}>
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label>{TYPES.find(t => t.value === type)?.label}</label>
        <select className="form-select" value={selectedId} onChange={e => { setSelectedId(e.target.value); setEmails(null) }}>
          <option value="">— Choisir —</option>
          {options.map(o => <option key={o.id} value={o.id}>{o.label || o.nom}</option>)}
        </select>
      </div>

      <button className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.4rem' }} onClick={handleGenerate} disabled={!selectedId || generating}>
        {generating ? 'Génération…' : '📧 Générer la liste'}
      </button>

      {emails && emails.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.4rem' }}>
            {emails.length} adresse{emails.length > 1 ? 's' : ''}
          </label>
          <textarea
            className="form-input" rows={5} readOnly
            value={emails.map(e => e.email).join(SEPARATOR)}
            onFocus={e => e.target.select()}
          />
          <button className="fic-btn" style={{ marginTop: '0.6rem' }} onClick={handleCopy}>📋 Copier la liste</button>
        </div>
      )}
    </div>
  )
}
