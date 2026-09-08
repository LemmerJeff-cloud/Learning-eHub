import React, { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { fetchClasseProgression, fetchExercicesCountables, computeEleveMetrics } from '../../../lib/progression'
import EleveDetail from './EleveDetail'

export default function KlasseOverview({ classeId, showToast }) {
  const [loading, setLoading]     = useState(true)
  const [eleves, setEleves]       = useState([])
  const [progression, setProgression] = useState([])
  const [totalCountable, setTotalCountable] = useState(0)
  const [selectedEleve, setSelectedEleve]   = useState(null)

  useEffect(() => { load() }, [classeId])

  async function load() {
    setLoading(true)
    try {
      const { data: classe, error: classeErr } = await supabase.from('classes').select('*').eq('id', classeId).single()
      if (classeErr) throw classeErr
      const [{ eleves: el, progression: prog }, exercices] = await Promise.all([
        fetchClasseProgression(classeId),
        fetchExercicesCountables(),
      ])
      setEleves(el)
      setProgression(prog)
      setTotalCountable(exercices.filter(e => e.filieres?.includes(classe.section)).length)
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  if (selectedEleve) {
    return (
      <div>
        <button className="fic-btn" style={{ marginBottom: '1rem' }} onClick={() => setSelectedEleve(null)}>← Retour à la classe</button>
        <EleveDetail eleve={selectedEleve} progression={progression.filter(p => p.user_id === selectedEleve.id)} showToast={showToast} />
      </div>
    )
  }

  if (eleves.length === 0) return <div className="empty-state"><p>Aucun élève dans cette classe.</p></div>

  return (
    <div className="table-wrap">
      <table className="user-table">
        <thead>
          <tr>
            <th>Élève</th><th>Progression</th><th>Traité</th><th>Réussite</th><th>Moy. tentatives</th><th>1er coup</th><th>Dernière activité</th>
          </tr>
        </thead>
        <tbody>
          {eleves.map(el => {
            const m = computeEleveMetrics(el.id, progression, totalCountable)
            return (
              <tr key={el.id} onClick={() => setSelectedEleve(el)} style={{ cursor: 'pointer' }}>
                <td>{el.prenom} {el.initiale}</td>
                <td>{m.pourcentage}% ({m.resolus}/{m.total})</td>
                <td>{m.bearbeites}/{m.total}</td>
                <td>{m.bearbeites > 0 ? `${m.tauxReussite}%` : '—'}</td>
                <td>{m.bearbeites > 0 ? m.moyenneTentatives : '—'}</td>
                <td>{m.premierCoup}</td>
                <td>{m.derniereActivite ? new Date(m.derniereActivite).toLocaleDateString('fr-FR') : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
