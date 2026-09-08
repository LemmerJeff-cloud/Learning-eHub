import React, { useMemo } from 'react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function ChoixUniqueRunner({ exercice, value, onChange, disabled }) {
  const index = value?.index ?? null
  const order = useMemo(() => {
    const idx = exercice.options.map((_, i) => i)
    return exercice.parametres?.melanger ? shuffle(idx) : idx
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercice.id])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {order.map(i => (
        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 400 }}>
          <input type="radio" checked={index === i} disabled={disabled} onChange={() => onChange({ index: i })} />
          {exercice.options[i]}
        </label>
      ))}
    </div>
  )
}
