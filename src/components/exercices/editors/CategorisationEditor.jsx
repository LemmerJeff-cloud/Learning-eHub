import React from 'react'

function newId() { return crypto.randomUUID() }

export default function CategorisationEditor({ options, correction, onChange }) {
  const items = options?.items || []
  const categories = options?.categories || []
  const placements = correction?.placements || {}

  function set(nextItems, nextCategories, nextPlacements) {
    onChange({
      options: { items: nextItems, categories: nextCategories },
      correction: { placements: nextPlacements },
    })
  }

  function addCategory() {
    set(items, [...categories, { id: newId(), label: '' }], placements)
  }
  function updateCategory(i, label) {
    const next = [...categories]
    next[i] = { ...next[i], label }
    set(items, next, placements)
  }
  function removeCategory(i) {
    const removed = categories[i]
    const nextCategories = categories.filter((_, idx) => idx !== i)
    const nextPlacements = { ...placements }
    for (const id of Object.keys(nextPlacements)) {
      if (nextPlacements[id] === removed.id) delete nextPlacements[id]
    }
    set(items, nextCategories, nextPlacements)
  }

  function addItem() {
    set([...items, { id: newId(), label: '' }], categories, placements)
  }
  function updateItem(i, label) {
    const next = [...items]
    next[i] = { ...next[i], label }
    set(next, categories, placements)
  }
  function removeItem(i) {
    const removed = items[i]
    const nextItems = items.filter((_, idx) => idx !== i)
    const nextPlacements = { ...placements }
    delete nextPlacements[removed.id]
    set(nextItems, categories, nextPlacements)
  }
  function placeItem(itemId, categoryId) {
    set(items, categories, { ...placements, [itemId]: categoryId })
  }

  return (
    <div className="form-group">
      <label>Catégories</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.9rem' }}>
        {categories.map((cat, i) => (
          <div key={cat.id} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input className="form-input" value={cat.label} onChange={e => updateCategory(i, e.target.value)} placeholder={`Catégorie ${i + 1}`} />
            <button type="button" className="icon-btn danger" onClick={() => removeCategory(i)} title="Supprimer">🗑️</button>
          </div>
        ))}
        <button type="button" className="fic-btn" style={{ alignSelf: 'flex-start' }} onClick={addCategory}>➕ Ajouter une catégorie</button>
      </div>

      <label>Éléments à classer</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map((item, i) => (
          <div key={item.id} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input className="form-input" value={item.label} onChange={e => updateItem(i, e.target.value)} placeholder={`Élément ${i + 1}`} />
            <select className="form-select" value={placements[item.id] || ''} onChange={e => placeItem(item.id, e.target.value)} style={{ maxWidth: '180px' }}>
              <option value="">— Catégorie —</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.label || '(sans nom)'}</option>)}
            </select>
            <button type="button" className="icon-btn danger" onClick={() => removeItem(i)} title="Supprimer">🗑️</button>
          </div>
        ))}
        <button type="button" className="fic-btn" style={{ alignSelf: 'flex-start' }} onClick={addItem}>➕ Ajouter un élément</button>
      </div>
    </div>
  )
}
