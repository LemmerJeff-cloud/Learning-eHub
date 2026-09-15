import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { createUserAccount } from '../../lib/adminApi'
import ConfirmModal from './ConfirmModal'
import { useOverlayClose } from '../../lib/useOverlayClose'

const ROLES = [
  { value: 'eleve', label: 'Élève' },
  { value: 'enseignant', label: 'Enseignant' },
  { value: 'enseignant_guest', label: 'Enseignant (lecture seule)' },
  { value: 'admin', label: 'Admin' },
]

export default function AdminUsers({ showToast }) {
  const [users, setUsers] = useState([])
  const [classes, setClasses] = useState([])
  const [entreprises, setEntreprises] = useState([])
  const [lycees, setLycees] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalUser, setModalUser] = useState(null) // null | 'new' | user
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [filterLycee, setFilterLycee]         = useState('')
  const [filterAnnee, setFilterAnnee]         = useState('')
  const [filterClasse, setFilterClasse]       = useState('')
  const [filterEntreprise, setFilterEntreprise] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: profiles, error: profilesError }, { data: cls, error: clsError }, { data: ent, error: entError }, { data: lyc, error: lycError }] = await Promise.all([
      supabase.from('profiles')
        .select('*, classe:classes!profiles_classe_id_fkey(id,label,annee,lycee_id), entreprise:entreprises!profiles_entreprise_id_fkey(id,nom), lycee:lycees(id,nom)')
        .order('prenom'),
      supabase.from('classes').select('id, label, annee, lycee_id').order('label'),
      supabase.from('entreprises').select('id, nom').order('nom'),
      supabase.from('lycees').select('id, nom').order('nom'),
    ])
    if (profilesError || clsError || entError || lycError) {
      showToast((profilesError || clsError || entError || lycError).message, 'error')
      setLoading(false)
      return
    }
    // Requête séparée (pas d'embed PostgREST) pour l'enseignant demandé à l'inscription :
    // profiles est une auto-référence, et le cache de schéma de PostgREST ne semble pas se
    // rafraîchir de façon fiable ici après l'ajout de la FK (NOTIFY pgrst sans effet observé,
    // probablement lié au pooler) — on résout donc ce nom côté client.
    let withEnseignant = profiles
    const enseignantIds = [...new Set(profiles.map(p => p.demande_enseignant_id).filter(Boolean))]
    if (enseignantIds.length > 0) {
      const { data: profs, error: profsError } = await supabase.from('profiles').select('id, prenom, initiale').in('id', enseignantIds)
      if (profsError) { showToast(profsError.message, 'error'); setLoading(false); return }
      const byId = Object.fromEntries(profs.map(p => [p.id, p]))
      withEnseignant = profiles.map(p => ({ ...p, demande_enseignant: p.demande_enseignant_id ? byId[p.demande_enseignant_id] : null }))
    }
    setUsers(withEnseignant)
    setClasses(cls)
    setEntreprises(ent)
    setLycees(lyc)
    setLoading(false)
  }

  async function handleDelete(u) {
    const { error } = await supabase.from('profiles').delete().eq('id', u.id)
    setConfirmDelete(null)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Profil supprimé', 'success')
    load()
  }

  async function handleApprove(u) {
    const { error } = await supabase.from('profiles').update({ statut: 'actif' }).eq('id', u.id)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Compte validé', 'success')
    load()
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  const annees = [...new Set(classes.map(c => c.annee).filter(Boolean))].sort()

  function matchesFilters(u) {
    if (filterLycee && (u.lycee_id || u.classe?.lycee_id) !== filterLycee) return false
    if (filterAnnee && u.classe?.annee !== filterAnnee) return false
    if (filterClasse && u.classe_id !== filterClasse) return false
    if (filterEntreprise && u.entreprise_id !== filterEntreprise) return false
    return true
  }

  const pending = users.filter(u => u.statut === 'en_attente')
  const actifs  = users.filter(u => u.statut !== 'en_attente').filter(matchesFilters)
  const filtersActive = filterLycee || filterAnnee || filterClasse || filterEntreprise

  return (
    <div>
      {pending.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '0.6rem' }}>
            ⏳ Comptes en attente de validation ({pending.length})
          </h3>
          <div className="table-wrap">
            <table className="user-table">
              <thead>
                <tr><th>Nom</th><th>Rôle demandé</th><th>Lycée</th><th>Classe</th><th>Enseignant demandé</th><th></th></tr>
              </thead>
              <tbody>
                {pending.map(u => (
                  <tr key={u.id}>
                    <td>{u.prenom} {u.initiale}</td>
                    <td><span className="status-badge pending">{u.role}</span></td>
                    <td>{u.lycee?.nom || '—'}</td>
                    <td>{u.classe?.label || '—'}</td>
                    <td>{u.demande_enseignant ? `${u.demande_enseignant.prenom} ${u.demande_enseignant.initiale}` : '—'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="icon-btn" onClick={() => setModalUser(u)} title="Modifier avant validation">✏️</button>
                      <button className="icon-btn" style={{ marginLeft: '0.35rem' }} onClick={() => handleApprove(u)} title="Valider">✅</button>
                      <button className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={() => setConfirmDelete(u)} title="Refuser">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select className="form-select" value={filterLycee} onChange={e => setFilterLycee(e.target.value)} style={{ width: 'auto' }}>
            <option value="">Tous les lycées</option>
            {lycees.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
          </select>
          <select className="form-select" value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)} style={{ width: 'auto' }}>
            <option value="">Toutes les années</option>
            {annees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="form-select" value={filterClasse} onChange={e => setFilterClasse(e.target.value)} style={{ width: 'auto' }}>
            <option value="">Toutes les classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select className="form-select" value={filterEntreprise} onChange={e => setFilterEntreprise(e.target.value)} style={{ width: 'auto' }}>
            <option value="">Toutes les entreprises</option>
            {entreprises.map(en => <option key={en.id} value={en.id}>{en.nom}</option>)}
          </select>
          {filtersActive && (
            <button className="icon-btn" title="Réinitialiser les filtres" onClick={() => { setFilterLycee(''); setFilterAnnee(''); setFilterClasse(''); setFilterEntreprise('') }}>✕</button>
          )}
        </div>
        <button className="fic-btn" onClick={() => setModalUser('new')}>➕ Nouvel utilisateur</button>
      </div>

      <div className="table-wrap">
        <table className="user-table">
          <thead>
            <tr><th>Nom</th><th>Rôle</th><th>Lycée</th><th>Classe</th><th>Entreprise</th><th></th></tr>
          </thead>
          <tbody>
            {actifs.length === 0 && (
              <tr><td colSpan={6} className="empty-state">Aucun utilisateur ne correspond à ces filtres.</td></tr>
            )}
            {actifs.map(u => (
              <tr key={u.id}>
                <td>{u.prenom} {u.initiale}</td>
                <td>
                  <span className={`status-badge ${u.role === 'admin' ? 'active' : u.role === 'eleve' ? 'pending' : 'inactive'}`}>
                    {u.role}
                  </span>
                </td>
                <td>{u.lycee?.nom || '—'}</td>
                <td>{u.classe?.label || '—'}</td>
                <td>{u.entreprise?.nom || '—'}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" onClick={() => setModalUser(u)} title="Modifier">✏️</button>
                  <button className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={() => setConfirmDelete(u)} title="Retirer l'accès">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalUser && (
        <UserModal
          user={modalUser === 'new' ? null : modalUser}
          classes={classes}
          entreprises={entreprises}
          onClose={() => setModalUser(null)}
          onSaved={load}
          showToast={showToast}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Retirer cet utilisateur ?"
          message={`Le profil de "${confirmDelete.prenom}" sera supprimé et perdra l'accès à EHub. Le compte de connexion Supabase restera actif (à supprimer manuellement dans le Dashboard si besoin).`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  )
}

function UserModal({ user, classes, entreprises, onClose, onSaved, showToast }) {
  const overlayClose = useOverlayClose(onClose)
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [prenom, setPrenom]       = useState(user?.prenom || '')
  const [initiale, setInitiale]   = useState(user?.initiale || '')
  const [role, setRole]           = useState(user?.role || 'eleve')
  const [classeId, setClasseId]   = useState(user?.classe_id || '')
  const [lycees, setLycees]       = useState([])
  const [lyceeId, setLyceeId]     = useState(user?.lycee_id || '')
  const [entrepriseId, setEntrepriseId] = useState(user?.entreprise_id || '')
  const [allFilieres, setAllFilieres] = useState([])
  const [section, setSection]     = useState(user?.section || '')
  const [teacherFilieres, setTeacherFilieres] = useState(user?.filieres || [])
  const [matieres, setMatieres]   = useState([])
  const [matiereAccess, setMatiereAccess] = useState({}) // { [matiereId]: 'lecture' | 'ecriture' }
  const [loading, setLoading]     = useState(false)

  const isStaff = role === 'enseignant' || role === 'enseignant_guest'

  useEffect(() => {
    supabase.from('lycees').select('*').order('nom').then(({ data }) => {
      setLycees(data || [])
      if (!user && !lyceeId && data?.length > 0) setLyceeId(data[0].id)
    })
    supabase.from('filieres').select('*').order('ordre').then(({ data }) => setAllFilieres(data || []))
    supabase.from('matieres').select('*').order('ordre').then(({ data }) => setMatieres(data || []))
    if (user) {
      supabase.from('enseignant_matieres').select('matiere_id, niveau').eq('enseignant_id', user.id).then(({ data }) => {
        setMatiereAccess(Object.fromEntries((data || []).map(r => [r.matiere_id, r.niveau])))
      })
    }
  }, [])

  function toggleTeacherFiliere(code) {
    setTeacherFilieres(prev => prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code])
  }

  function toggleMatiere(matiereId) {
    setMatiereAccess(prev => {
      const next = { ...prev }
      if (next[matiereId]) delete next[matiereId]
      else next[matiereId] = 'ecriture'
      return next
    })
  }

  function setNiveau(matiereId, niveau) {
    setMatiereAccess(prev => ({ ...prev, [matiereId]: niveau }))
  }

  async function syncMatiereAccess(userId) {
    const { data: existing, error } = await supabase.from('enseignant_matieres').select('matiere_id, niveau').eq('enseignant_id', userId)
    if (error) throw error
    const existingMap = Object.fromEntries((existing || []).map(r => [r.matiere_id, r.niveau]))
    const wanted = isStaff ? matiereAccess : {}

    const toDelete = Object.keys(existingMap).filter(id => !(id in wanted))
    const toInsert = Object.keys(wanted).filter(id => !(id in existingMap))
    const toUpdate = Object.keys(wanted).filter(id => id in existingMap && existingMap[id] !== wanted[id])

    if (toDelete.length > 0) {
      const { error: delError } = await supabase.from('enseignant_matieres').delete().eq('enseignant_id', userId).in('matiere_id', toDelete)
      if (delError) throw delError
    }
    if (toInsert.length > 0) {
      const { error: insError } = await supabase.from('enseignant_matieres')
        .insert(toInsert.map(matiereId => ({ enseignant_id: userId, matiere_id: matiereId, niveau: wanted[matiereId] })))
      if (insError) throw insError
    }
    for (const matiereId of toUpdate) {
      const { error: updError } = await supabase.from('enseignant_matieres')
        .update({ niveau: wanted[matiereId] }).eq('enseignant_id', userId).eq('matiere_id', matiereId)
      if (updError) throw updError
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      let userId = user?.id
      if (user) {
        const { error } = await supabase.from('profiles').update({
          prenom, initiale, role,
          classe_id: classeId || null,
          lycee_id: lyceeId || null,
          entreprise_id: role === 'eleve' ? (entrepriseId || null) : null,
          section: role === 'eleve' ? (section || null) : null,
          filieres: isStaff ? teacherFilieres : [],
        }).eq('id', user.id)
        if (error) throw error
      } else {
        if (!email || !password || !prenom) {
          showToast('Email, mot de passe et prénom requis', 'error')
          setLoading(false)
          return
        }
        const created = await createUserAccount({
          email, password, prenom, initiale, role,
          classe_id: classeId || null,
          lycee_id: lyceeId || null,
          entreprise_id: role === 'eleve' ? (entrepriseId || null) : null,
          section: role === 'eleve' ? (section || null) : null,
        })
        userId = created.id
        // L'edge function create-user (service_role) ne gère pas encore "filieres" — complété
        // ici avec la session admin normale, déjà autorisée via profiles_admin (RLS).
        if (isStaff && teacherFilieres.length > 0) {
          const { error } = await supabase.from('profiles').update({ filieres: teacherFilieres }).eq('id', userId)
          if (error) throw error
        }
      }
      await syncMatiereAccess(userId)
      showToast(user ? 'Profil mis à jour' : 'Utilisateur créé', 'success')
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
        <h2>{user ? 'Modifier le profil' : 'Nouvel utilisateur'}</h2>
        <form onSubmit={handleSubmit}>
          {!user && (
            <>
              <div className="form-group">
                <label>Email</label>
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              </div>
              <div className="form-group">
                <label>Mot de passe initial</label>
                <input className="form-input" type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="min. 6 caractères" />
              </div>
            </>
          )}
          <div className="form-group">
            <label>Prénom</label>
            <input className="form-input" value={prenom} onChange={e => setPrenom(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Initiale (nom)</label>
            <input className="form-input" value={initiale} onChange={e => setInitiale(e.target.value)} maxLength={2} />
          </div>
          <div className="form-group">
            <label>Rôle</label>
            <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Lycée</label>
            <select className="form-select" value={lyceeId} onChange={e => setLyceeId(e.target.value)}>
              <option value="">—</option>
              {lycees.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Classe</label>
            <select className="form-select" value={classeId} onChange={e => setClasseId(e.target.value)}>
              <option value="">—</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          {role === 'eleve' && (
            <div className="form-group">
              <label>Entreprise</label>
              <select className="form-select" value={entrepriseId} onChange={e => setEntrepriseId(e.target.value)}>
                <option value="">—</option>
                {entreprises.map(en => <option key={en.id} value={en.id}>{en.nom}</option>)}
              </select>
            </div>
          )}

          {role === 'eleve' && (
            <div className="form-group">
              <label>Section (filière)</label>
              <select className="form-select" value={section} onChange={e => setSection(e.target.value)}>
                <option value="">— Héritée de la classe —</option>
                {allFilieres.map(f => <option key={f.code} value={f.code}>{f.label}</option>)}
              </select>
              <small style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                Seulement si cet élève doit être rattaché à une autre section que celle de sa classe.
              </small>
            </div>
          )}

          {isStaff && (
            <div className="form-group">
              <label>
                <input
                  type="checkbox" checked={teacherFilieres.length > 0}
                  onChange={e => setTeacherFilieres(e.target.checked ? allFilieres.map(f => f.code) : [])}
                  style={{ marginRight: '0.4rem' }}
                />
                Restreindre à certaines sections
              </label>
              <small style={{ fontSize: '0.72rem', color: 'var(--text-3)', display: 'block', marginBottom: '0.4rem' }}>
                Décoché (par défaut) : accès à toutes les sections. Coché : ne voit plus, dans Cours,
                que les sections de cours taguées pour les filières sélectionnées ci-dessous.
              </small>
              {teacherFilieres.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {allFilieres.map(f => (
                    <label key={f.code} className={`filiere-checkbox ${teacherFilieres.includes(f.code) ? 'checked' : ''}`}>
                      <input type="checkbox" checked={teacherFilieres.includes(f.code)} onChange={() => toggleTeacherFiliere(f.code)} style={{ display: 'none' }} />
                      {f.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {isStaff && (
            <div className="form-group">
              <label>Matières</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {matieres.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <label className={`filiere-checkbox ${matiereAccess[m.id] ? 'checked' : ''}`} style={{ flex: 1 }}>
                      <input type="checkbox" checked={!!matiereAccess[m.id]} onChange={() => toggleMatiere(m.id)} style={{ display: 'none' }} />
                      {m.emoji} {m.nom}
                    </label>
                    {matiereAccess[m.id] && role === 'enseignant' && (
                      <select className="form-select" style={{ width: 'auto' }} value={matiereAccess[m.id]} onChange={e => setNiveau(m.id, e.target.value)}>
                        <option value="lecture">Lecture seule</option>
                        <option value="ecriture">Lecture + écriture</option>
                      </select>
                    )}
                  </div>
                ))}
                {matieres.length === 0 && <span style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>Aucune matière créée.</span>}
              </div>
              {role === 'enseignant_guest' && (
                <small style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                  Un enseignant invité reste toujours en lecture seule, quelle que soit la matière.
                </small>
              )}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
