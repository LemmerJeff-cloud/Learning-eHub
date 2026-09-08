import React from 'react'
import MiniRichEditor from '../admin/MiniRichEditor'

const DEFAULTS = {
  hint: '', explication: '', feedback_faux: '',
  max_tentatives: null, afficher_solution_apres: null,
  melanger: false, requis: true, pour_progression: true,
}

export default function ExerciceParametresPanel({ value, onChange, showToast }) {
  const p = { ...DEFAULTS, ...value }

  function patch(next) { onChange({ ...p, ...next }) }

  return (
    <div className="form-group" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.9rem', marginTop: '0.5rem' }}>
      <label style={{ marginBottom: '0.6rem', display: 'block' }}>Paramètres avancés</label>

      <div style={{ marginBottom: '0.7rem' }}>
        <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Indice (affiché après une réponse incorrecte)</label>
        <MiniRichEditor content={p.hint} onChange={hint => patch({ hint })} showToast={showToast} />
      </div>

      <div style={{ marginBottom: '0.7rem' }}>
        <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Message si réponse incorrecte</label>
        <MiniRichEditor content={p.feedback_faux} onChange={feedback_faux => patch({ feedback_faux })} showToast={showToast} />
      </div>

      <div style={{ marginBottom: '0.7rem' }}>
        <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Explication complète (affichée avec la solution)</label>
        <MiniRichEditor content={p.explication} onChange={explication => patch({ explication })} showToast={showToast} />
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.7rem' }}>
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>Tentatives max.</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              className="form-input"
              type="number" min="1"
              value={p.max_tentatives ?? ''}
              disabled={p.max_tentatives === null}
              onChange={e => patch({ max_tentatives: e.target.value === '' ? null : Number(e.target.value) })}
              style={{ maxWidth: '90px' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 400, fontSize: '0.78rem' }}>
              <input type="checkbox" checked={p.max_tentatives === null} onChange={e => patch({ max_tentatives: e.target.checked ? null : 3 })} /> Illimité
            </label>
          </div>
        </div>
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>Solution visible après N tentatives</label>
          <input
            className="form-input"
            type="number" min="1"
            value={p.afficher_solution_apres ?? ''}
            onChange={e => patch({ afficher_solution_apres: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="jamais"
            style={{ maxWidth: '90px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 400 }}>
          <input type="checkbox" checked={p.melanger} onChange={e => patch({ melanger: e.target.checked })} /> Mélanger les choix
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 400 }}>
          <input type="checkbox" checked={p.requis} onChange={e => patch({ requis: e.target.checked })} /> Obligatoire
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 400 }}>
          <input type="checkbox" checked={p.pour_progression} onChange={e => patch({ pour_progression: e.target.checked })} /> Compter pour la progression
        </label>
      </div>
    </div>
  )
}
