import React from 'react'
import StringListEditor from './StringListEditor'
import MiniRichEditor from './MiniRichEditor'
import SectionBlocksEditor from './SectionBlocksEditor'

export default function SectionContentEditor({ type, draft, onChange, showToast, revealProps }) {
  if (type === 'blocs') {
    return <SectionBlocksEditor draft={draft} onChange={onChange} showToast={showToast} revealProps={revealProps} />
  }

  if (type === 'definition' || type === 'exemple') {
    return (
      <div className="form-group">
        <label>{type === 'definition' ? 'Définition' : 'Exemple'}</label>
        <MiniRichEditor
          content={draft.fr}
          onChange={fr => onChange({ ...draft, fr })}
          showToast={showToast}
        />
      </div>
    )
  }

  if (type === 'formule' || type === 'liste') {
    return (
      <div className="form-group">
        <label>{type === 'formule' ? 'Formules' : 'Éléments de la liste'}</label>
        <StringListEditor items={draft.fr} onChange={fr => onChange({ ...draft, fr })} />
      </div>
    )
  }

  if (type === 'activite') {
    const phases = draft.phases || []

    function updatePhase(i, patch) {
      const next = [...phases]
      next[i] = { ...next[i], ...patch }
      onChange({ ...draft, phases: next })
    }
    function addPhase() {
      onChange({ ...draft, phases: [...phases, { label: '', question_depart: '', consignes: [] }] })
    }
    function removePhase(i) {
      onChange({ ...draft, phases: phases.filter((_, idx) => idx !== i) })
    }
    function movePhase(i, dir) {
      const j = i + dir
      if (j < 0 || j >= phases.length) return
      const next = [...phases]
      ;[next[i], next[j]] = [next[j], next[i]]
      onChange({ ...draft, phases: next })
    }

    return (
      <div>
        <div className="form-group">
          <label>Contexte</label>
          <MiniRichEditor
            content={draft.contexte}
            onChange={contexte => onChange({ ...draft, contexte })}
            showToast={showToast}
          />
        </div>

        {phases.map((phase, i) => (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.7rem' }}>
              <strong style={{ fontSize: '0.78rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Phase {i + 1}
              </strong>
              <div>
                <button type="button" className="icon-btn" onClick={() => movePhase(i, -1)} disabled={i === 0} title="Monter">↑</button>
                <button type="button" className="icon-btn" onClick={() => movePhase(i, 1)} disabled={i === phases.length - 1} title="Descendre">↓</button>
                <button type="button" className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={() => removePhase(i)} title="Supprimer">🗑️</button>
              </div>
            </div>
            <div className="form-group">
              <label>Titre</label>
              <input
                className="form-input"
                value={phase.label}
                onChange={e => updatePhase(i, { label: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Question de départ (optionnel)</label>
              <MiniRichEditor
                content={phase.question_depart}
                onChange={question_depart => updatePhase(i, { question_depart })}
                showToast={showToast}
              />
            </div>
            <div className="form-group">
              <label>Consignes</label>
              <StringListEditor
                items={phase.consignes}
                onChange={consignes => updatePhase(i, { consignes })}
              />
            </div>
          </div>
        ))}
        <button type="button" className="fic-btn" onClick={addPhase}>➕ Ajouter une phase</button>
      </div>
    )
  }

  return null
}
