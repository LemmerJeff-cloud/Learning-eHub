import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import ConfirmModal from './ConfirmModal'
import FiliereCheckboxes from './FiliereCheckboxes'
import LyceeCheckboxes from './LyceeCheckboxes'

const TAGS = [
  { value: 'event',    label: 'Événement' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'atelier',  label: 'Atelier' },
]
const MOIS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEP', 'OCT', 'NOV', 'DÉC']
const BUCKET = 'content-images'

export default function AdminCalendrier({ showToast }) {
  const { user } = useAuth()
  const [items, setItems]     = useState([])
  const [nLycees, setNLycees] = useState(1)
  const [nFilieres, setNFilieres] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data, error }, { count }, { count: countFilieres }] = await Promise.all([
      supabase.from('calendrier').select('*').order('jour'),
      supabase.from('lycees').select('*', { count: 'exact', head: true }),
      supabase.from('filieres').select('*', { count: 'exact', head: true }),
    ])
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setItems(data)
    setNLycees(count ?? 1)
    setNFilieres(countFilieres ?? 1)
    setLoading(false)
  }

  async function handleDelete(item) {
    const { error } = await supabase.from('calendrier').delete().eq('id', item.id)
    setConfirmDelete(null)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Événement supprimé', 'success')
    load()
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="fic-btn" onClick={() => setModal('new')}>➕ Nouvel événement</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {items.map(e => (
          <div key={e.id} className="cal-item" style={{ alignItems: 'center' }}>
            <div className="cal-date">
              <div className="cal-day">{e.jour}</div>
              <div className="cal-month">{e.mois}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="cal-title">{e.titre}</div>
              <div className="cal-sub">
                {e.sous_titre}
                {e.jour_fin && e.mois_fin ? ` · 📅 ${e.jour} ${e.mois} – ${e.jour_fin} ${e.mois_fin}` : ''}
                {e.lieu ? ` · 📍 ${e.lieu}` : ''}
                {e.horaire_debut ? ` · 🕒 ${e.horaire_debut.slice(0, 5)}${e.horaire_fin ? `–${e.horaire_fin.slice(0, 5)}` : ''}` : ''}
                {e.fichiers?.length ? ` · 📎 ${e.fichiers.length}` : ''}
                {(e.filieres?.length < nFilieres || e.lycee_ids?.length < nLycees) ? ' · 🎯 ciblé' : ''}
                {e.enseignants_only ? ' · 🔒 enseignants' : ''}
              </div>
              <span className={`cal-tag ${e.tag}`}>{TAGS.find(t => t.value === e.tag)?.label}</span>
            </div>
            <button className="icon-btn" onClick={() => setModal(e)} title="Modifier">✏️</button>
            <button className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={() => setConfirmDelete(e)} title="Supprimer">🗑️</button>
          </div>
        ))}
        {items.length === 0 && <p className="empty-state">Aucun événement.</p>}
      </div>

      {modal && (
        <CalendrierModal
          item={modal === 'new' ? null : modal}
          userId={user.id}
          onClose={() => setModal(null)}
          onSaved={load}
          showToast={showToast}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer cet événement ?"
          message={`"${confirmDelete.titre}" sera supprimé définitivement.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  )
}

function CalendrierModal({ item, userId, onClose, onSaved, showToast }) {
  const [jour, setJour]           = useState(item?.jour || 1)
  const [mois, setMois]           = useState(item?.mois || 'JAN')
  const [periode, setPeriode]     = useState(!!(item?.jour_fin || item?.mois_fin))
  const [jourFin, setJourFin]     = useState(item?.jour_fin || item?.jour || 1)
  const [moisFin, setMoisFin]     = useState(item?.mois_fin || item?.mois || 'JAN')
  const [titre, setTitre]         = useState(item?.titre || '')
  const [sousTitre, setSousTitre] = useState(item?.sous_titre || '')
  const [lieu, setLieu]           = useState(item?.lieu || '')
  const [horaireDebut, setHoraireDebut] = useState(item?.horaire_debut?.slice(0, 5) || '')
  const [horaireFin, setHoraireFin]     = useState(item?.horaire_fin?.slice(0, 5) || '')
  const [enseignantsOnly, setEnseignantsOnly] = useState(item?.enseignants_only || false)
  const [tag, setTag]             = useState(item?.tag || 'event')
  const [fichiers, setFichiers]   = useState(item?.fichiers || [])
  const [filieres, setFilieres]   = useState(item?.filieres || null)
  const [lyceeIds, setLyceeIds]   = useState(item?.lycee_ids || [])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    if (!item) supabase.from('lycees').select('id').then(({ data }) => setLyceeIds((data || []).map(l => l.id)))
  }, [])

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const path = `calendrier/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file)
      if (error) throw error
      setFichiers([...fichiers, { nom: file.name, chemin: path }])
    } catch (err) {
      showToast(err.message || "Échec de l'envoi", 'error')
    } finally {
      setUploading(false)
    }
  }

  function removeFichier(i) {
    setFichiers(fichiers.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!titre.trim() || filieres === null) return
    setLoading(true)
    try {
      const payload = {
        jour: Number(jour), mois, titre, sous_titre: sousTitre, tag, fichiers, filieres, lycee_ids: lyceeIds,
        lieu, horaire_debut: horaireDebut || null, horaire_fin: horaireFin || null, enseignants_only: enseignantsOnly,
        jour_fin: periode ? Number(jourFin) : null, mois_fin: periode ? moisFin : null,
      }
      if (item) {
        const { error } = await supabase.from('calendrier').update(payload).eq('id', item.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('calendrier').insert({ ...payload, created_by: userId })
        if (error) throw error
      }
      showToast(item ? 'Événement mis à jour' : 'Événement créé', 'success')
      onSaved()
      onClose()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target.classList.contains('modal-overlay')) onClose() }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>{item ? "Modifier l'événement" : 'Nouvel événement'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Titre</label>
            <input className="form-input" value={titre} onChange={e => setTitre(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label>Sous-titre</label>
            <input className="form-input" value={sousTitre} onChange={e => setSousTitre(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Jour</label>
              <input className="form-input" type="number" min="1" max="31" value={jour} onChange={e => setJour(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Mois</label>
              <select className="form-select" value={mois} onChange={e => setMois(e.target.value)}>
                {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={periode} onChange={e => setPeriode(e.target.checked)} /> S'étend sur une période (plusieurs jours)
            </label>
          </div>
          {periode && (
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Jour fin</label>
                <input className="form-input" type="number" min="1" max="31" value={jourFin} onChange={e => setJourFin(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Mois fin</label>
                <select className="form-select" value={moisFin} onChange={e => setMoisFin(e.target.value)}>
                  {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="form-group">
            <label>Lieu</label>
            <input className="form-input" value={lieu} onChange={e => setLieu(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Horaire début</label>
              <input className="form-input" type="time" value={horaireDebut} onChange={e => setHoraireDebut(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Horaire fin</label>
              <input className="form-input" type="time" value={horaireFin} onChange={e => setHoraireFin(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Type</label>
            <select className="form-select" value={tag} onChange={e => setTag(e.target.value)}>
              {TAGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={enseignantsOnly} onChange={e => setEnseignantsOnly(e.target.checked)} /> Réservé aux enseignants
            </label>
          </div>
          <div className="form-group">
            <label>Visible pour les sections</label>
            <FiliereCheckboxes value={filieres} onChange={setFilieres} />
          </div>
          <div className="form-group">
            <label>Visible pour les lycées</label>
            <LyceeCheckboxes value={lyceeIds} onChange={setLyceeIds} />
          </div>
          <div className="form-group">
            <label>Fichiers joints (optionnel)</label>
            {fichiers.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <span style={{ flex: 1, fontSize: '0.82rem' }}>{f.nom}</span>
                <button type="button" className="icon-btn danger" onClick={() => removeFichier(i)} title="Supprimer">🗑️</button>
              </div>
            ))}
            <input type="file" onChange={handleFileUpload} disabled={uploading} />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
