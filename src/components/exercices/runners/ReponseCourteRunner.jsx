import React from 'react'

export default function ReponseCourteRunner({ value, onChange, disabled }) {
  return (
    <input
      className="form-input"
      value={value?.texte || ''}
      disabled={disabled}
      onChange={e => onChange({ texte: e.target.value })}
      placeholder="Votre réponse…"
    />
  )
}
