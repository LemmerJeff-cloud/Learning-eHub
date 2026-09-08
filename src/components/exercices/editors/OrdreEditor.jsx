import React from 'react'
import StringListEditor from '../../admin/StringListEditor'

// La correction est toujours identique à la liste des options : l'ordre saisi ici EST
// l'ordre correct, l'élève les reçoit mélangés (voir OrdreRunner).
export default function OrdreEditor({ options, onChange }) {
  return (
    <div className="form-group">
      <label>Éléments, dans le bon ordre (mélangés pour l'élève)</label>
      <StringListEditor items={options} onChange={next => onChange({ options: next, correction: next })} placeholder="Élément" />
    </div>
  )
}
