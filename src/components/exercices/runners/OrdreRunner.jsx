import React, { useEffect, useMemo } from 'react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function OrdreRunner({ exercice, value, onChange, disabled }) {
  const shuffled = useMemo(() => shuffle(exercice.options), [exercice.id])
  const items = value?.ordre?.length ? value.ordre : shuffled

  useEffect(() => {
    if (!value?.ordre?.length) onChange({ ordre: shuffled })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffled])

  function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange({ ordre: next })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.map((item, i) => (
        <div key={item} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ flex: 1, padding: '0.5rem 0.75rem', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>{item}</span>
          <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={disabled || i === 0} title="Monter">↑</button>
          <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={disabled || i === items.length - 1} title="Descendre">↓</button>
        </div>
      ))}
    </div>
  )
}
