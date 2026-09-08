import { supabase } from './supabase'

// Les 10 types auto-corrigés (tout sauf "libre", qui reste sur l'ancien système resultats).
const PROGRESSION_TYPES = [
  'qcm', 'vrai_faux', 'ordre', 'glisser_deposer',
  'choix_unique', 'reponse_courte', 'reponse_numerique', 'categorisation', 'tableau_calcul', 'journal',
]

export async function fetchMyClasses(role, userId) {
  if (role === 'admin') {
    const { data, error } = await supabase.from('classes').select('*').order('label')
    if (error) throw error
    return data || []
  }
  const { data, error } = await supabase
    .from('enseignant_classes')
    .select('classe:classes(*)')
    .eq('enseignant_id', userId)
  if (error) throw error
  return (data || [])
    .map(row => row.classe)
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label))
}

// Toutes les exercices "comptables" pour le Fortschritt : auto-corrigés et pas exclus via parametres.pour_progression.
export async function fetchExercicesCountables() {
  const { data, error } = await supabase
    .from('exercices')
    .select('id, titre, type, points, section_id, chapitre_id, block_id, parametres, filieres, chapitre:chapitres(titre_fr), section:sections_cours(titre_fr)')
    .in('type', PROGRESSION_TYPES)
  if (error) throw error
  return (data || []).filter(e => e.parametres?.pour_progression !== false)
}

// Un seul aller-retour pour toute la classe : sert à la fois la vue "Klassenübersicht"
// et la vue "Nach Aufgabe" (regroupement différent des mêmes lignes côté client).
export async function fetchClasseProgression(classeId) {
  const { data: eleves, error: elevesErr } = await supabase
    .from('profiles')
    .select('id, prenom, initiale, classe_id, section')
    .eq('classe_id', classeId)
    .eq('role', 'eleve')
    .order('prenom')
  if (elevesErr) throw elevesErr

  const userIds = (eleves || []).map(e => e.id)
  if (userIds.length === 0) return { eleves: [], progression: [] }

  const { data: progression, error: progErr } = await supabase
    .from('exercice_progression')
    .select('*, exercice:exercices(id, titre, type, points, section_id, chapitre_id, block_id, parametres)')
    .in('user_id', userIds)
  if (progErr) throw progErr

  const filtered = (progression || []).filter(p => p.exercice && p.exercice.parametres?.pour_progression !== false)
  return { eleves: eleves || [], progression: filtered }
}

export async function fetchTentativesHistory(userId, exerciceId) {
  const { data, error } = await supabase
    .from('exercice_tentatives')
    .select('*')
    .eq('user_id', userId)
    .eq('exercice_id', exerciceId)
    .order('numero')
  if (error) throw error
  return data || []
}

export function computeEleveMetrics(eleveId, progressionRows, totalCountable) {
  const rows = progressionRows.filter(p => p.user_id === eleveId)
  const bearbeites = rows.length
  const resolus = rows.filter(r => r.resolu).length
  const totalTentatives = rows.reduce((s, r) => s + (r.tentatives_total || 0), 0)
  const premierCoup = rows.filter(r => r.resolu && r.tentatives_avant_reussite === 1).length
  const derniereActivite = rows.reduce(
    (max, r) => (!max || (r.derniere_tentative_at && r.derniere_tentative_at > max)) ? r.derniere_tentative_at : max,
    null,
  )
  return {
    total: totalCountable,
    bearbeites,
    resolus,
    nonResolus: bearbeites - resolus,
    pourcentage: totalCountable > 0 ? Math.round((resolus / totalCountable) * 100) : 0,
    tauxReussite: bearbeites > 0 ? Math.round((resolus / bearbeites) * 100) : 0,
    moyenneTentatives: bearbeites > 0 ? +(totalTentatives / bearbeites).toFixed(1) : 0,
    premierCoup,
    derniereActivite,
  }
}

export function computeAufgabeMetrics(exerciceId, progressionRows) {
  const rows = progressionRows.filter(p => p.exercice_id === exerciceId)
  const bearbeites = rows.length
  const resolus = rows.filter(r => r.resolu).length
  const premierCoup = rows.filter(r => r.resolu && r.tentatives_avant_reussite === 1).length
  return {
    bearbeites,
    resolus,
    nonResolus: bearbeites - resolus,
    tauxReussite: bearbeites > 0 ? Math.round((resolus / bearbeites) * 100) : 0,
    premierCoup,
  }
}
