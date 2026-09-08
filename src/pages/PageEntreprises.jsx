import React, { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

const BUCKET = 'entreprises-assets'

function publicUrl(chemin) {
  if (!chemin) return null
  return supabase.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl
}

export default function PageEntreprises({ showToast }) {
  const { user, profile, canEdit, isProf } = useAuth()
  const [entreprises, setEntreprises] = useState([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState(null)
  const [membres, setMembres]         = useState([])
  const [profil, setProfil]           = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [editing, setEditing]         = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('entreprises')
      .select('*, classe:classes(id,label), profil:entreprises_profil(logo_chemin)')
      .order('nom')
    if (data) setEntreprises(data)
    setLoading(false)
  }

  async function openEntreprise(ent) {
    setSelected(ent)
    setEditing(false)
    setLoadingDetail(true)
    const [{ data: mem }, { data: prof }] = await Promise.all([
      supabase.from('profiles').select('id, prenom, initiale').eq('entreprise_id', ent.id).eq('role', 'eleve').order('prenom'),
      supabase.from('entreprises_profil').select('*').eq('entreprise_id', ent.id).maybeSingle(),
    ])
    setMembres(mem || [])
    setProfil(prof)
    setLoadingDetail(false)
  }

  const canEditProfil = !!selected && (canEdit() || isProf() || profile?.entreprise_id === selected.id)

  if (!user) return (
    <div className="lock-screen">
      <div className="lock-icon">🔒</div>
      <h2>Connexion requise</h2>
    </div>
  )

  if (loading) return <p style={{ color: 'var(--text-3)', padding: '2rem' }}>Chargement…</p>

  if (selected) {
    return (
      <div>
        <div className="breadcrumb">
          <button onClick={() => setSelected(null)}>Entreprises</button>
          <span className="bc-sep">›</span>
          <span>{selected.nom}</span>
        </div>

        {loadingDetail ? (
          <p style={{ color: 'var(--text-3)' }}>Chargement…</p>
        ) : editing ? (
          <EntrepriseProfilForm
            entreprise={selected}
            profil={profil}
            onCancel={() => setEditing(false)}
            onSaved={() => { setEditing(false); openEntreprise(selected) }}
            showToast={showToast}
          />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {profil?.logo_chemin ? (
                  <img src={publicUrl(profil.logo_chemin)} alt="" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: '#fff' }} />
                ) : (
                  <div className="tile-emoji" style={{ fontSize: '2.2rem' }}>🏢</div>
                )}
                <div>
                  <h2 className="page-heading" style={{ marginBottom: '0.15rem' }}>{selected.nom}</h2>
                  <p className="page-sub">{selected.classe?.label || 'Aucune classe assignée'}</p>
                </div>
              </div>
              {canEditProfil && (
                <button className="fic-btn" onClick={() => setEditing(true)}>✏️ Modifier la présentation</button>
              )}
            </div>

            {profil?.description && (
              <p style={{ margin: '1rem 0', lineHeight: 1.6, color: 'var(--text-2)' }}>{profil.description}</p>
            )}

            {(profil?.catalogue_chemin || profil?.site_web) && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {profil?.catalogue_chemin && (
                  <a className="fic-btn" href={publicUrl(profil.catalogue_chemin)} target="_blank" rel="noreferrer">
                    📥 {profil.catalogue_nom || 'Télécharger le catalogue'}
                  </a>
                )}
                {profil?.site_web && (
                  <a className="fic-btn" href={profil.site_web} target="_blank" rel="noreferrer">🔗 Site web</a>
                )}
              </div>
            )}

            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.8rem' }}>
              Membres
            </h3>
            {membres.length === 0 ? (
              <div className="empty-state"><p>Aucun membre assigné pour l'instant.</p></div>
            ) : (
              <div className="table-wrap">
                <table className="user-table">
                  <thead><tr><th>Membre</th></tr></thead>
                  <tbody>
                    {membres.map(m => (
                      <tr key={m.id}><td>{m.prenom} {m.initiale}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  const groupes = {}
  entreprises.forEach(e => {
    const label = e.classe?.label || 'Sans classe'
    groupes[label] = groupes[label] || []
    groupes[label].push(e)
  })

  return (
    <div>
      <h2 className="page-heading">Entreprises</h2>
      <p className="page-sub" style={{ marginBottom: '1.5rem' }}>Start-ups, mini-entreprises et ENAP.</p>

      {entreprises.length === 0 ? (
        <div className="empty-state"><p>Aucune entreprise créée pour l'instant.</p></div>
      ) : (
        Object.entries(groupes).map(([label, list]) => (
          <div key={label} style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.8rem' }}>
              {label}
            </h3>
            <div className="tiles-grid">
              {list.map(e => (
                <div key={e.id} className="module-tile" onClick={() => openEntreprise(e)}>
                  {e.profil?.logo_chemin ? (
                    <img src={publicUrl(e.profil.logo_chemin)} alt="" style={{ width: 40, height: 40, objectFit: 'contain', marginBottom: '0.4rem' }} />
                  ) : (
                    <div className="tile-emoji">🏢</div>
                  )}
                  <h3>{e.nom}</h3>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function EntrepriseProfilForm({ entreprise, profil, onCancel, onSaved, showToast }) {
  const [description, setDescription] = useState(profil?.description || '')
  const [siteWeb, setSiteWeb]         = useState(profil?.site_web || '')
  const [logoChemin, setLogoChemin]   = useState(profil?.logo_chemin || null)
  const [catalogueChemin, setCatalogueChemin] = useState(profil?.catalogue_chemin || null)
  const [catalogueNom, setCatalogueNom]       = useState(profil?.catalogue_nom || '')
  const [uploadingLogo, setUploadingLogo]         = useState(false)
  const [uploadingCatalogue, setUploadingCatalogue] = useState(false)
  const [saving, setSaving]           = useState(false)

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingLogo(true)
    try {
      const path = `${entreprise.id}/logo-${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file)
      if (error) throw error
      setLogoChemin(path)
    } catch (err) {
      showToast(err.message || "Échec de l'envoi", 'error')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleCatalogueUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingCatalogue(true)
    try {
      const path = `${entreprise.id}/catalogue-${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file)
      if (error) throw error
      setCatalogueChemin(path)
      setCatalogueNom(file.name)
    } catch (err) {
      showToast(err.message || "Échec de l'envoi", 'error')
    } finally {
      setUploadingCatalogue(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('entreprises_profil').upsert({
        entreprise_id: entreprise.id,
        description,
        site_web: siteWeb,
        logo_chemin: logoChemin,
        catalogue_chemin: catalogueChemin,
        catalogue_nom: catalogueNom,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'entreprise_id' })
      if (error) throw error
      showToast('Présentation enregistrée', 'success')
      onSaved()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '480px' }}>
      <h2 className="page-heading" style={{ marginBottom: '1.25rem' }}>Modifier la présentation</h2>

      <div className="form-group">
        <label>Logo</label>
        {logoChemin && (
          <img src={publicUrl(logoChemin)} alt="" style={{ width: 64, height: 64, objectFit: 'contain', display: 'block', marginBottom: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: '#fff' }} />
        )}
        <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
      </div>

      <div className="form-group">
        <label>Description de l'activité</label>
        <textarea className="form-input" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      <div className="form-group">
        <label>Catalogue (optionnel)</label>
        {catalogueChemin && <div style={{ fontSize: '0.82rem', marginBottom: '0.5rem' }}>📎 {catalogueNom}</div>}
        <input type="file" onChange={handleCatalogueUpload} disabled={uploadingCatalogue} />
      </div>

      <div className="form-group">
        <label>Site web (optionnel)</label>
        <input className="form-input" type="url" placeholder="https://…" value={siteWeb} onChange={e => setSiteWeb(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <button className="btn-primary" type="submit" style={{ width: 'auto', padding: '0.6rem 1.4rem' }} disabled={saving}>
          {saving ? 'Enregistrement…' : '💾 Enregistrer'}
        </button>
        <button type="button" className="fic-btn" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  )
}
