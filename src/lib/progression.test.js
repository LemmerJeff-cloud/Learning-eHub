import { describe, it, expect } from 'vitest'
import { computeEleveMetrics, computeAufgabeMetrics } from './progression'

const rows = [
  { user_id: 'e1', exercice_id: 'ex1', resolu: true, tentatives_total: 1, tentatives_avant_reussite: 1, derniere_tentative_at: '2026-08-20T10:00:00Z' },
  { user_id: 'e1', exercice_id: 'ex2', resolu: true, tentatives_total: 2, tentatives_avant_reussite: 2, derniere_tentative_at: '2026-08-22T09:00:00Z' },
  { user_id: 'e1', exercice_id: 'ex3', resolu: false, tentatives_total: 2, tentatives_avant_reussite: null, derniere_tentative_at: '2026-08-21T08:00:00Z' },
  { user_id: 'e2', exercice_id: 'ex1', resolu: false, tentatives_total: 1, tentatives_avant_reussite: null, derniere_tentative_at: '2026-08-19T08:00:00Z' },
]

describe('computeEleveMetrics', () => {
  it('compte les exercices résolus, tentés, et le total attendu', () => {
    const m = computeEleveMetrics('e1', rows, 3)
    expect(m.bearbeites).toBe(3)
    expect(m.resolus).toBe(2)
    expect(m.nonResolus).toBe(1)
    expect(m.total).toBe(3)
  })
  it('calcule le pourcentage de progression sur le total attendu (pas seulement les exercices tentés)', () => {
    const m = computeEleveMetrics('e1', rows, 4) // un 4e exercice pas encore tenté
    expect(m.pourcentage).toBe(50) // 2 résolus / 4 attendus
  })
  it('calcule le taux de réussite sur les exercices tentés', () => {
    const m = computeEleveMetrics('e1', rows, 3)
    expect(m.tauxReussite).toBe(67) // 2/3 arrondi
  })
  it('calcule la moyenne de tentatives', () => {
    const m = computeEleveMetrics('e1', rows, 3)
    expect(m.moyenneTentatives).toBeCloseTo(1.7, 1) // (1+2+2)/3
  })
  it('compte les réussites au premier coup', () => {
    const m = computeEleveMetrics('e1', rows, 3)
    expect(m.premierCoup).toBe(1) // seul ex1
  })
  it('retient la dernière activité la plus récente', () => {
    const m = computeEleveMetrics('e1', rows, 3)
    expect(m.derniereActivite).toBe('2026-08-22T09:00:00Z')
  })
  it("renvoie des métriques à zéro pour un élève sans aucune tentative", () => {
    const m = computeEleveMetrics('e3', rows, 3)
    expect(m.bearbeites).toBe(0)
    expect(m.pourcentage).toBe(0)
    expect(m.tauxReussite).toBe(0)
    expect(m.derniereActivite).toBeNull()
  })
})

describe('computeAufgabeMetrics', () => {
  it('agrège tous les élèves ayant tenté un exercice donné', () => {
    const m = computeAufgabeMetrics('ex1', rows)
    expect(m.bearbeites).toBe(2) // e1 et e2
    expect(m.resolus).toBe(1) // seul e1
    expect(m.tauxReussite).toBe(50)
    expect(m.premierCoup).toBe(1)
  })
  it("renvoie des métriques à zéro pour un exercice jamais tenté", () => {
    const m = computeAufgabeMetrics('ex-inconnu', rows)
    expect(m.bearbeites).toBe(0)
    expect(m.tauxReussite).toBe(0)
  })
})
