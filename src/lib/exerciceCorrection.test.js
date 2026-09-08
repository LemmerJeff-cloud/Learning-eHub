import { describe, it, expect } from 'vitest'
import { gradeReponse } from './exerciceCorrection'

describe('gradeReponse — types existants (comportement inchangé)', () => {
  const qcm = { type: 'qcm', points: 2, correction: [0, 2] }
  it('qcm : bonne combinaison, ordre indifférent', () => {
    expect(gradeReponse(qcm, { selected: [2, 0] }).correcte).toBe(true)
  })
  it('qcm : mauvaise combinaison → score 0', () => {
    expect(gradeReponse(qcm, { selected: [1] }).score).toBe(0)
  })

  const vf = { type: 'vrai_faux', points: 1, correction: true }
  it('vrai_faux : correct', () => {
    expect(gradeReponse(vf, { valeur: true }).correcte).toBe(true)
  })
  it('vrai_faux : incorrect', () => {
    expect(gradeReponse(vf, { valeur: false }).correcte).toBe(false)
  })

  const ordre = { type: 'ordre', points: 3, correction: ['a', 'b', 'c'] }
  it('ordre : bon ordre', () => {
    expect(gradeReponse(ordre, { ordre: ['a', 'b', 'c'] }).correcte).toBe(true)
  })
  it('ordre : mauvais ordre', () => {
    expect(gradeReponse(ordre, { ordre: ['b', 'a', 'c'] }).correcte).toBe(false)
  })

  const gd = { type: 'glisser_deposer', points: 2, correction: [{ gauche: 'Actif', droite: 'Bilan' }] }
  it('glisser_deposer (Association) : toutes les paires correctes', () => {
    expect(gradeReponse(gd, { paires: { Actif: 'Bilan' } }).correcte).toBe(true)
  })

  it('libre lève une erreur explicite (reste sur resultats)', () => {
    expect(() => gradeReponse({ type: 'libre', points: 1 }, { texte: 'x' })).toThrow()
  })
})

describe('gradeReponse — nouveaux types', () => {
  const cu = { type: 'choix_unique', points: 1, correction: { index: 1 } }
  it('choix_unique : correct', () => {
    expect(gradeReponse(cu, { index: 1 }).correcte).toBe(true)
  })
  it('choix_unique : incorrect → score 0', () => {
    expect(gradeReponse(cu, { index: 0 }).score).toBe(0)
  })

  const rc = {
    type: 'reponse_courte', points: 1,
    correction: { reponses: ['Bilan', 'bilan comptable'], case_sensible: false, ignorer_espaces: true },
  }
  it('reponse_courte : insensible à la casse', () => {
    expect(gradeReponse(rc, { texte: 'BILAN' }).correcte).toBe(true)
  })
  it('reponse_courte : espaces ignorés', () => {
    expect(gradeReponse(rc, { texte: 'bilan  comptable' }).correcte).toBe(true)
  })
  it('reponse_courte : réponse fausse', () => {
    expect(gradeReponse(rc, { texte: 'actif' }).correcte).toBe(false)
  })

  const rn = { type: 'reponse_numerique', points: 1, correction: { valeur: 12500, tolerance: 1, unite: '€' } }
  it('reponse_numerique : dans la tolérance, avec points comme séparateur de milliers', () => {
    expect(gradeReponse(rn, { brut: '12.500' }).correcte).toBe(true)
  })
  it('reponse_numerique : hors tolérance', () => {
    expect(gradeReponse(rn, { brut: '12.000' }).correcte).toBe(false)
  })
  it('reponse_numerique : virgule décimale', () => {
    expect(gradeReponse(rn, { brut: '12500,5' }).correcte).toBe(true)
  })

  const cat = {
    type: 'categorisation', points: 4,
    correction: { placements: { i1: 'actif', i2: 'passif', i3: 'actif', i4: 'passif' } },
  }
  it('categorisation : crédit partiel proportionnel', () => {
    const res = gradeReponse(cat, { placements: { i1: 'actif', i2: 'passif', i3: 'passif', i4: 'passif' } })
    expect(res.score).toBe(3)
    expect(res.correcte).toBe(false)
  })
  it('categorisation : tout correct', () => {
    const res = gradeReponse(cat, { placements: { i1: 'actif', i2: 'passif', i3: 'actif', i4: 'passif' } })
    expect(res.correcte).toBe(true)
  })

  const tc = {
    type: 'tableau_calcul', points: 5,
    options: { champs: [
      { id: 'ca', label: 'CA', type: 'nombre', tolerance: 0.5, points: 3 },
      { id: 'nom', label: 'Nom', type: 'texte', points: 2 },
    ] },
    correction: { champs: { ca: { valeur: 1000, tolerance: 0.5 }, nom: { valeur: 'Acme' } } },
  }
  it('tableau_calcul : champ numérique dans la tolérance + champ texte insensible à la casse', () => {
    const res = gradeReponse(tc, { valeurs: { ca: '1000,3', nom: 'acme' } })
    expect(res.detail.ca).toBe(true)
    expect(res.detail.nom).toBe(true)
    expect(res.score).toBe(5)
    expect(res.max_score).toBe(5)
  })
  it('tableau_calcul : champ numérique hors tolérance → crédit partiel', () => {
    const res = gradeReponse(tc, { valeurs: { ca: '1002', nom: 'acme' } })
    expect(res.detail.ca).toBe(false)
    expect(res.score).toBe(2)
  })

  const jr = {
    type: 'journal', points: 2,
    options: { tolerance: 0, lignes: [{ id: 'l1', points: 1 }, { id: 'l2', points: 1 }] },
    correction: { lignes: {
      l1: { compte: '606', libelle: 'Achats non stockés', debit: 300, credit: 0 },
      l2: { compte: '512', libelle: 'Banque', debit: 0, credit: 300 },
    } },
  }
  it('journal : compte et montants corrects (virgule décimale acceptée)', () => {
    const res = gradeReponse(jr, { lignes: {
      l1: { compte: '606', debit: '300', credit: '' },
      l2: { compte: '512', debit: '', credit: '300' },
    } })
    expect(res.detail.l1).toBe(true)
    expect(res.detail.l2).toBe(true)
    expect(res.correcte).toBe(true)
    expect(res.score).toBe(2)
  })
  it('journal : mauvais compte sur une ligne → crédit partiel', () => {
    const res = gradeReponse(jr, { lignes: {
      l1: { compte: '607', debit: '300', credit: '' },
      l2: { compte: '512', debit: '', credit: '300' },
    } })
    expect(res.detail.l1).toBe(false)
    expect(res.detail.l2).toBe(true)
    expect(res.correcte).toBe(false)
    expect(res.score).toBe(1)
  })
  it('journal : montant erroné → ligne fausse', () => {
    const res = gradeReponse(jr, { lignes: {
      l1: { compte: '606', debit: '250', credit: '' },
      l2: { compte: '512', debit: '', credit: '300' },
    } })
    expect(res.detail.l1).toBe(false)
    expect(res.score).toBe(1)
  })
})
