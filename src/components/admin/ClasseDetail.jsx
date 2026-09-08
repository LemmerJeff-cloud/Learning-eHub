import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

export default function ClasseDetail({ classe, onClose, showToast, backLabel = '← Retour aux classes' }) {
  const { isAdmin } = useAuth()
  const [eleves, setEleves]           = useState([])
  const [entreprises, setEntreprises] = useState([])
  const [enseignants, setEnseignants] = useState([])
  const [staff, setStaff]             = useState([])
  const [addingId, setAddingId]       = useState('')
  const [loading, setLoading]         = useState(true)

  useEffect(() => { load() }, [classe.id])

  async function load() {
    setLoading(true)
    const [{ data: el, error: elError }, { data: ent, error: entError }, { data: ec, error: ecError }, { data: st, error: stError }] = await Promise.all([
      supabase.from('profiles').select('id, prenom, initiale, entreprise_id').eq('classe_id', classe.id).eq('role', 'eleve').order('prenom'),
      supabase.from('entreprises').select('id, nom').eq('classe_id', classe.id).order('nom'),
      supabase.from('enseignant_classes').select('enseignant:profiles(id, prenom, initiale, role)').eq('classe_id', classe.id),
      supabase.from('profiles').select('id, prenom, initiale, role').in('role', ['enseignant', 'enseignant_guest', 'admin']).order('prenom'),
    ])
    if (elError || entError || ecError || stError) { showToast((elError || entError || ecError || stError).message, 'error'); setLoading(false); return }
    setEleves(el)
    setEntreprises(ent)
    setEnseignants((ec || []).map(r => r.enseignant).filter(Boolean))
    setStaff(st || [])
    setLoading(false)
  }

  async function updateEntreprise(eleveId, entrepriseId) {
    const previous = eleves
    setEleves(eleves.map(e => e.id === eleveId ? { ...e, entreprise_id: entrepriseId || null } : e))
    const { error } = await supabase.from('profiles').update({ entreprise_id: entrepriseId || null }).eq('id', eleveId)
    if (error) { setEleves(previous); showToast(error.message, 'error'); return }
  }

  async function addEnseignant(id) {
    if (!id) return
    const { error } = await supabase.from('enseignant_classes').insert({ enseignant_id: id, classe_id: classe.id })
    setAddingId('')
    if (error) { showToast(error.message, 'error'); return }
    load()
  }

  async function removeEnseignant(id) {
    const { error } = await supabase.from('enseignant_classes').delete().eq('enseignant_id', id).eq('classe_id', classe.id)
    if (error) { showToast(error.message, 'error'); return }
    load()
  }

  const availableStaff = staff.filter(s => !enseignants.some(e => e.id === s.id))

  return (
    <div>
      <button className="fic-btn" style={{ marginBottom: '1rem' }} onClick={onClose}>{backLabel}</button>
      <h3 style={{ marginBottom: '0.25rem' }}>{classe.label}</h3>
      <p className="page-sub" style={{ marginBottom: '1.25rem' }}>
        {classe.section} · {classe.lycee?.nom || 'Lycée non renseigné'} · {classe.annee}
      </p>

      {!loading && isAdmin() && (
        <div style={{ marginBottom: '1.75rem' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '0.6rem' }}>Enseignants</h4>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {enseignants.length === 0 && (
              <span style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>Aucun enseignant assigné.</span>
            )}
            {enseignants.map(en => (
              <span key={en.id} className="filiere-checkbox checked" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                {en.prenom} {en.initiale}{en.role === 'admin' ? ' (admin)' : ''}
                <button
                  type="button" onClick={() => removeEnseignant(en.id)}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: '0.85rem' }}
                  title="Retirer"
                >✕</button>
              </span>
            ))}
          </div>
          <select className="form-select" value={addingId} onChange={e => addEnseignant(e.target.value)} style={{ width: 'auto' }}>
            <option value="">+ Ajouter un enseignant</option>
            {availableStaff.map(s => (
              <option key={s.id} value={s.id}>{s.prenom} {s.initiale}{s.role === 'admin' ? ' (admin)' : ''}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-3)' }}>Chargement…</p>
      ) : (
        <div className="table-wrap">
          <table className="user-table">
            <thead><tr><th>Élève</th><th>Entreprise</th></tr></thead>
            <tbody>
              {eleves.length === 0 && (
                <tr><td colSpan={2} className="empty-state">Aucun élève dans cette classe.</td></tr>
              )}
              {eleves.map(e => (
                <tr key={e.id}>
                  <td>{e.prenom} {e.initiale}</td>
                  <td>
                    <select
                      className="form-select"
                      value={e.entreprise_id || ''}
                      onChange={ev => updateEntreprise(e.id, ev.target.value)}
                      style={{ width: 'auto' }}
                    >
                      <option value="">—</option>
                      {entreprises.map(en => <option key={en.id} value={en.id}>{en.nom}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
