import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function LyceeCheckboxes({ value, onChange }) {
  const [lycees, setLycees] = useState([])

  useEffect(() => {
    supabase.from('lycees').select('*').order('nom').then(({ data }) => setLycees(data || []))
  }, [])

  function toggle(id) {
    onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {lycees.map(l => (
        <label key={l.id} className={`filiere-checkbox ${value.includes(l.id) ? 'checked' : ''}`}>
          <input type="checkbox" checked={value.includes(l.id)} onChange={() => toggle(l.id)} style={{ display: 'none' }} />
          {l.nom}
        </label>
      ))}
    </div>
  )
}
