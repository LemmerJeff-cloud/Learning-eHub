import React, { useState, useRef, useEffect } from 'react'

const EMOJIS = [
  '📖', '📚', '💡', '📣', '🧾', '🗺️', '💰', '📈', '👥', '🎯', '🚀', '💼',
  '📊', '🏢', '🛒', '📦', '🤝', '💳', '📱', '💻', '🌐', '⚖️', '🏦', '📉',
  '🔍', '✅', '📝', '🎓', '🧠', '⭐', '🔥', '🏆', '📅', '🗂️', '🧮', '🛠️',
  '🔑', '📌', '🎬', '🎨', '🧩', '🏭', '🚗', '✈️', '🌱', '♻️', '🧑‍💼', '📢',
]

export default function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="form-input"
        style={{ width: '3.2rem', fontSize: '1.2rem', cursor: 'pointer', textAlign: 'center' }}
        onClick={() => setOpen(o => !o)}
        title="Choisir un emoji"
      >
        {value || '📖'}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          boxShadow: '0 12px 32px rgba(27,42,107,0.18)', padding: '0.6rem',
          display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '0.1rem', width: '260px',
        }}>
          {EMOJIS.map(e => (
            <button
              type="button"
              key={e}
              onClick={() => { onChange(e); setOpen(false) }}
              className="emoji-picker-item"
              title={e}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
