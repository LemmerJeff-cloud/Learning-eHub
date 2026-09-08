import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// restrictTo : liste de codes (ex. visibleFilieres d'un enseignant scopé) — quand fourni, seules
// ces filières sont proposées, pour qu'un enseignant scopé à BTS ne puisse pas taguer un contenu
// pour 3CN. `null`/omis = toutes les filières existantes (comportement historique).
export default function FiliereCheckboxes({ value, onChange, restrictTo }) {
  const [allFilieres, setAllFilieres] = useState([])

  useEffect(() => {
    supabase.from('filieres').select('*').order('ordre').then(({ data }) => setAllFilieres(data || []))
  }, [])

  const filieres = restrictTo ? allFilieres.filter(f => restrictTo.includes(f.code)) : allFilieres

  // value === null signale "pas encore choisi" (nouvel élément) : dès que la liste des filières
  // est connue, on la sélectionne entièrement par défaut (comportement historique : toutes cochées
  // — ou, pour un enseignant scopé, uniquement ses filières).
  useEffect(() => {
    if (value === null && filieres.length > 0) onChange(filieres.map(f => f.code))
  }, [allFilieres, restrictTo, value])

  function toggle(code) {
    onChange((value || []).includes(code) ? value.filter(x => x !== code) : [...(value || []), code])
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {filieres.map(f => (
        <label key={f.code} className={`filiere-checkbox ${(value || []).includes(f.code) ? 'checked' : ''}`}>
          <input type="checkbox" checked={(value || []).includes(f.code)} onChange={() => toggle(f.code)} style={{ display: 'none' }} />
          {f.label}
        </label>
      ))}
    </div>
  )
}
