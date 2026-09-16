import React from 'react'

export default function BlockBody({ block }) {
  if (block.type === 'texte') return (
    <div className="html-content" style={{ marginBottom: '1rem' }} dangerouslySetInnerHTML={{ __html: block.html || '' }} />
  )
  if (block.type === 'definition') return (
    <div className="box box-definition">
      <div className="box-label">Définition</div>
      <div className="html-content" dangerouslySetInnerHTML={{ __html: block.html || '' }} />
    </div>
  )
  if (block.type === 'exemple') return (
    <div className="box box-exemple">
      <div className="box-label">Exemple</div>
      <div className="html-content" dangerouslySetInnerHTML={{ __html: block.html || '' }} />
    </div>
  )
  if (block.type === 'formule') return (
    <div>{(block.items || []).map((f, i) => <div key={i} className="formule-display">{f}</div>)}</div>
  )
  if (block.type === 'liste') return (
    <div className="box box-definition">
      <ul style={{ marginLeft: '1.25rem', lineHeight: 1.7 }}>
        {(block.items || []).map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  )
  if (block.type === 'image') return !block.src ? null : (
    <div className="block-image">
      <img src={block.src} alt={block.alt || ''} />
    </div>
  )
  if (block.type === 'video') return !block.src ? null : (
    <div className="video-embed">
      {block.provider === 'file'
        ? <video src={block.src} controls style={{ width: '100%', borderRadius: 'var(--radius)' }} />
        : <iframe src={block.src} frameBorder="0" allowFullScreen title="Vidéo" style={{ width: '100%', aspectRatio: '16/9', border: 0, borderRadius: 'var(--radius)' }} />}
    </div>
  )
  if (block.type === 'fichier') return !block.url ? null : (
    <div className="block-fichier" style={{ marginBottom: '1rem' }}>
      <a href={block.url} target="_blank" rel="noreferrer">⬇️ {block.nom || 'Télécharger le fichier'}</a>
    </div>
  )
  return null
}
