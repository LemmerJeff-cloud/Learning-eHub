import React, { useMemo } from 'react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function QcmRunner({ exercice, value, onChange, disabled }) {
  const selected = value?.selected || []
  const order = useMemo(() => {
    const idx = exercice.options.map((_, i) => i)
    return exercice.parametres?.melanger ? shuffle(idx) : idx
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercice.id])

  function toggle(i) {
    onChange({ selected: selected.includes(i) ? selected.filter(x => x !== i) : [...selected, i] })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {order.map(i => (
        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 400 }}>
          <input type="checkbox" checked={selected.includes(i)} disabled={disabled} onChange={() => toggle(i)} />
          {exercice.options[i]}
        </label>
      ))}
    </div>
  )
}
