import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import ConfirmModal from './ConfirmModal'
import FiliereCheckboxes from './FiliereCheckboxes'
import LyceeCheckboxes from './LyceeCheckboxes'
import { useOverlayClose } from '../../lib/useOverlayClose'

const TAGS = [
  { value: 'event',    label: 'Événement' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'atelier',  label: 'Atelier' },
]
const MOIS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEP', 'OCT', 'NOV', 'DÉC']
const BUCKET = 'content-images'

// Comme PageAccueil.jsx : un événement en période reste "à venir" tant que sa date de fin
// n'est pas dépassée, pas seulement sa date de début.
function eventEndDate(e) {
  if (e.jour_fin && e.mois_fin && e.annee_fin) {
    return new Date(e.annee_fin, MOIS.indexOf(e.mois_fin), e.jour_fin)
  }
  return new Date(e.annee, MOIS.indexOf(e.mois), e.jour)
}

const SUB_TABS = [
  { id: 'venir',  label: 'Événements à venir' },
  { id: 'passes', label: 'Événements passés' },
]

export default function AdminCalendrier({ showToast }) {
  const { user } = useAuth()
  const [items, setItems]     = useState([])
  const [filieresList, setFilieresList] = useState([])
  const [nLycees, setNLycees] = useState(1)
  const [nFilieres, setNFilieres] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [subTab, setSubTab]         = useState('venir')
  const [filterMois, setFilterMois] = useState('')
  const [filterFiliere, setFilterFiliere] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data, error }, { count }, { data: filieresData, count: countFilieres }] = await Promise.all([
      supabase.from('calendrier').select('*'),
      supabase.from('lycees').select('*', { count: 'exact', head: true }),
      supabase.from('filieres').select('*', { count: 'exact' }).order('ordre'),
    ])
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    const sorted = (data || []).sort((a, b) =>
      new Date(a.annee, MOIS.indexOf(a.mois), a.jour) - new Date(b.annee, MOIS.indexOf(b.mois), b.jour)
    )
    setItems(sorted)
    setFilieresList(filieresData || [])
    setNLycees(count ?? 1)
    setNFilieres(countFilieres ?? 1)
    setLoading(false)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filtered = items
    .filter(e => subTab === 'passes' ? eventEndDate(e) < today : eventEndDate(e) >= today)
    .filter(e => !filterMois || e.mois === filterMois)
    .filter(e => !filterFiliere || e.filieres?.includes(filterFiliere))
  if (subTab === 'passes') filtered.reverse()

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {SUB_TABS.map(t => (
            <button key={t.id} className={`fic-btn ${subTab === t.id ? 'active' : ''}`} onClick={() => setSubTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <button className="fic-btn" onClick={() => setModal('new')}>➕ Nouvel événement</button>
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select className="form-select" style={{ maxWidth: '160px' }} value={filterMois} onChange={e => setFilterMois(e.target.value)}>
          <option value="">Tous les mois</option>
          {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: '200px' }} value={filterFiliere} onChange={e => setFilterFiliere(e.target.value)}>
          <option value="">Toutes les sections</option>
          {filieresList.map(f => <option key={f.code} value={f.code}>{f.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {filtered.map(e => (
          <div key={e.id} className="cal-item" style={{ alignItems: 'center' }}>
            <div className="cal-date">
              <div className="cal-day">{e.jour}</div>
              <div className="cal-month">{e.mois} {e.annee}</div>
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
        {filtered.length === 0 && (
          <p className="empty-state">
            {subTab === 'passes' ? 'Aucun événement passé.' : 'Aucun événement à venir.'}
          </p>
        )}
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
  const overlayClose = useOverlayClose(onClose)
  const anneeCourante = new Date().getFullYear()
  const [jour, setJour]           = useState(item?.jour || 1)
  const [mois, setMois]           = useState(item?.mois || 'JAN')
  const [annee, setAnnee]         = useState(item?.annee || anneeCourante)
  const [periode, setPeriode]     = useState(!!(item?.jour_fin || item?.mois_fin))
  const [jourFin, setJourFin]     = useState(item?.jour_fin || item?.jour || 1)
  const [moisFin, setMoisFin]     = useState(item?.mois_fin || item?.mois || 'JAN')
  const [anneeFin, setAnneeFin]   = useState(item?.annee_fin || item?.annee || anneeCourante)
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
        jour: Number(jour), mois, annee: Number(annee), titre, sous_titre: sousTitre, tag, fichiers, filieres, lycee_ids: lyceeIds,
        lieu, horaire_debut: horaireDebut || null, horaire_fin: horaireFin || null, enseignants_only: enseignantsOnly,
        jour_fin: periode ? Number(jourFin) : null, mois_fin: periode ? moisFin : null,
        annee_fin: periode ? Number(anneeFin) : null,
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
    <div className="modal-overlay open" {...overlayClose}>
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
            <div className="form-group" style={{ flex: 1 }}>
              <label>Année</label>
              <input className="form-input" type="number" value={annee} onChange={e => setAnnee(e.target.value)} />
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
              <div className="form-group" style={{ flex: 1 }}>
                <label>Année fin</label>
                <input className="form-input" type="number" value={anneeFin} onChange={e => setAnneeFin(e.target.value)} />
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
