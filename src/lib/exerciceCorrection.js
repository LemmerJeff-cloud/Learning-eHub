import { parseLocaleNumber } from './numberParsing'

function arraysEqual(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i])
}

function binaire(correcte, points) {
  return { correcte, score: correcte ? points : 0, max_score: points, detail: {} }
}

const GRADERS = {
  qcm(exercice, reponse) {
    const selected = reponse?.selected || []
    const correcte = arraysEqual([...selected].sort(), [...exercice.correction].sort())
    return binaire(correcte, exercice.points)
  },

  vrai_faux(exercice, reponse) {
    const correcte = reponse?.valeur === exercice.correction
    return binaire(correcte, exercice.points)
  },

  ordre(exercice, reponse) {
    const correcte = arraysEqual(reponse?.ordre, exercice.correction)
    return binaire(correcte, exercice.points)
  },

  glisser_deposer(exercice, reponse) {
    const paires = reponse?.paires || {}
    const correcte = exercice.correction.every(p => paires[p.gauche] === p.droite)
    return binaire(correcte, exercice.points)
  },

  choix_unique(exercice, reponse) {
    const correcte = reponse?.index === exercice.correction?.index
    return binaire(correcte, exercice.points)
  },

  reponse_courte(exercice, reponse) {
    const { reponses = [], case_sensible = false, ignorer_espaces = true } = exercice.correction || {}
    const normalize = s => {
      let v = String(s ?? '')
      if (ignorer_espaces) v = v.replace(/\s+/g, '')
      if (!case_sensible) v = v.toLowerCase()
      return v.trim()
    }
    const donnee = normalize(reponse?.texte)
    const correcte = reponses.some(r => normalize(r) === donnee)
    return binaire(correcte, exercice.points)
  },

  reponse_numerique(exercice, reponse) {
    const { valeur, tolerance = 0 } = exercice.correction || {}
    const donnee = parseLocaleNumber(reponse?.brut ?? reponse?.valeur)
    const correcte = donnee !== null && Math.abs(donnee - valeur) <= tolerance
    return binaire(correcte, exercice.points)
  },

  categorisation(exercice, reponse) {
    const attendu = exercice.correction?.placements || {}
    const donne = reponse?.placements || {}
    const itemIds = Object.keys(attendu)
    const detail = {}
    let correctCount = 0
    for (const id of itemIds) {
      const ok = donne[id] === attendu[id]
      detail[id] = ok
      if (ok) correctCount++
    }
    const correcte = itemIds.length > 0 && correctCount === itemIds.length
    const score = itemIds.length > 0 ? Math.round((exercice.points * correctCount) / itemIds.length) : 0
    return { correcte, score, max_score: exercice.points, detail }
  },

  tableau_calcul(exercice, reponse) {
    const champs = exercice.options?.champs || []
    const correction = exercice.correction?.champs || {}
    const valeurs = reponse?.valeurs || {}
    const detail = {}
    let score = 0
    let maxScore = 0
    let allCorrect = true
    for (const champ of champs) {
      const attendu = correction[champ.id]
      if (!attendu) continue
      maxScore += champ.points || 0
      let ok
      if (champ.type === 'texte') {
        ok = String(valeurs[champ.id] ?? '').trim().toLowerCase() === String(attendu.valeur ?? '').trim().toLowerCase()
      } else {
        const donnee = parseLocaleNumber(valeurs[champ.id])
        const tolerance = attendu.tolerance ?? champ.tolerance ?? 0
        ok = donnee !== null && Math.abs(donnee - attendu.valeur) <= tolerance
      }
      detail[champ.id] = ok
      if (ok) score += champ.points || 0
      else allCorrect = false
    }
    return { correcte: allCorrect, score, max_score: maxScore, detail }
  },

  journal(exercice, reponse) {
    const lignes = exercice.options?.lignes || []
    const tolerance = exercice.options?.tolerance || 0
    const correction = exercice.correction?.lignes || {}
    const donnees = reponse?.lignes || {}
    const normalizeCompte = s => String(s ?? '').trim().toLowerCase()
    const detail = {}
    let score = 0
    let maxScore = 0
    let allCorrect = true
    for (const ligne of lignes) {
      const attendu = correction[ligne.id]
      if (!attendu) continue
      maxScore += ligne.points || 0
      const saisie = donnees[ligne.id] || {}
      const compteOk = normalizeCompte(saisie.compte) === normalizeCompte(attendu.compte)
      const debitDonnee = parseLocaleNumber(saisie.debit) ?? 0
      const creditDonnee = parseLocaleNumber(saisie.credit) ?? 0
      const debitAttendu = Number(attendu.debit) || 0
      const creditAttendu = Number(attendu.credit) || 0
      const montantOk = Math.abs(debitDonnee - debitAttendu) <= tolerance && Math.abs(creditDonnee - creditAttendu) <= tolerance
      const ok = compteOk && montantOk
      detail[ligne.id] = ok
      if (ok) score += ligne.points || 0
      else allCorrect = false
    }
    return { correcte: allCorrect, score, max_score: maxScore, detail }
  },
}

export function gradeReponse(exercice, reponse) {
  const grader = GRADERS[exercice.type]
  if (!grader) throw new Error(`Type d'exercice non corrigible automatiquement : ${exercice.type}`)
  return grader(exercice, reponse)
}
