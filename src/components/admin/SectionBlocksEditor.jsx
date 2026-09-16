import React, { useState } from 'react'
import StringListEditor from './StringListEditor'
import MiniRichEditor from './MiniRichEditor'
import { toEmbedUrl } from './VideoEmbedExtension'
import { uploadContentImage, uploadContentVideo, uploadContentFile } from '../../lib/upload'

const BLOCK_TYPES = [
  { value: 'texte',      label: 'Texte libre' },
  { value: 'definition', label: 'Définition' },
  { value: 'exemple',    label: 'Exemple' },
  { value: 'formule',    label: 'Formule' },
  { value: 'liste',      label: 'Liste' },
  { value: 'image',      label: 'Image' },
  { value: 'video',      label: 'Vidéo' },
  { value: 'fichier',    label: 'Fichier à télécharger' },
]

function defaultsForBlockType(type) {
  if (type === 'formule' || type === 'liste') return { items: [''] }
  if (type === 'video') return { src: '', provider: '' }
  if (type === 'image') return { src: '', alt: '' }
  if (type === 'fichier') return { url: '', nom: '' }
  return { html: '' } // texte, definition, exemple
}

function ImageBlockEditor({ block, onChange, showToast }) {
  const [uploading, setUploading] = useState(false)

  async function handleFilePick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const src = await uploadContentImage(file)
      onChange({ src })
    } catch (err) {
      showToast?.(err.message || "Échec de l'upload de l'image", 'error')
    } finally {
      setUploading(false)
    }
  }

  if (block.src) {
    return (
      <div>
        <img src={block.src} alt={block.alt || ''} style={{ width: '100%', borderRadius: 'var(--radius)' }} />
        <input
          className="form-input" style={{ marginTop: '0.5rem' }}
          placeholder="Texte alternatif (optionnel)"
          value={block.alt || ''} onChange={e => onChange({ alt: e.target.value })}
        />
        <button type="button" className="icon-btn danger" style={{ marginTop: '0.5rem' }} onClick={() => onChange({ src: '', alt: '' })}>🗑️ Retirer l'image</button>
      </div>
    )
  }

  return (
    <label className="tiptap-upload-btn">
      {uploading ? 'Téléversement…' : '📤 Téléverser une image'}
      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFilePick} disabled={uploading} />
    </label>
  )
}

function VideoBlockEditor({ block, onChange, showToast }) {
  const [urlInput, setUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)

  function applyUrl() {
    const embed = toEmbedUrl(urlInput.trim())
    if (!embed) { showToast?.('Lien YouTube ou Vimeo non reconnu', 'error'); return }
    onChange({ src: embed.src, provider: embed.provider })
    setUrlInput('')
  }

  async function handleFilePick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadContentVideo(file)
      onChange({ src: url, provider: 'file' })
    } catch (err) {
      showToast?.(err.message || "Échec de l'upload de la vidéo", 'error')
    } finally {
      setUploading(false)
    }
  }

  if (block.src) {
    return (
      <div>
        <div className="video-embed">
          {block.provider === 'file'
            ? <video src={block.src} controls style={{ width: '100%', borderRadius: 'var(--radius)' }} />
            : <iframe src={block.src} frameBorder="0" allowFullScreen title="Vidéo" style={{ width: '100%', aspectRatio: '16/9', border: 0, borderRadius: 'var(--radius)' }} />}
        </div>
        <button type="button" className="icon-btn danger" style={{ marginTop: '0.5rem' }} onClick={() => onChange({ src: '', provider: '' })}>🗑️ Retirer la vidéo</button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Lien YouTube ou Vimeo"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyUrl() } }}
        />
        <button type="button" className="fic-btn" onClick={applyUrl}>Insérer</button>
      </div>
      <label className="tiptap-upload-btn">
        {uploading ? 'Téléversement…' : '📤 Ou téléverser un fichier vidéo'}
        <input type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFilePick} disabled={uploading} />
      </label>
    </div>
  )
}

function FileBlockEditor({ block, onChange, showToast }) {
  const [uploading, setUploading] = useState(false)

  async function handleFilePick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadContentFile(file)
      onChange({ url, nom: file.name })
    } catch (err) {
      showToast?.(err.message || "Échec de l'upload du fichier", 'error')
    } finally {
      setUploading(false)
    }
  }

  if (block.url) {
    return (
      <div>
        <a href={block.url} target="_blank" rel="noreferrer">⬇️ {block.nom || block.url}</a>
        <div>
          <button type="button" className="icon-btn danger" style={{ marginTop: '0.5rem' }} onClick={() => onChange({ url: '', nom: '' })}>🗑️ Retirer le fichier</button>
        </div>
      </div>
    )
  }

  return (
    <label className="tiptap-upload-btn">
      {uploading ? 'Téléversement…' : '📤 Téléverser un fichier'}
      <input type="file" style={{ display: 'none' }} onChange={handleFilePick} disabled={uploading} />
    </label>
  )
}

export default function SectionBlocksEditor({ draft, onChange, showToast }) {
  const blocks = draft.blocks || []

  function updateBlock(i, patch) {
    const next = [...blocks]
    next[i] = { ...next[i], ...patch }
    onChange({ ...draft, blocks: next })
  }
  function changeType(i, type) {
    updateBlock(i, { type, ...defaultsForBlockType(type) })
  }
  function addBlock() {
    onChange({ ...draft, blocks: [...blocks, { id: crypto.randomUUID(), type: 'texte', html: '' }] })
  }
  function removeBlock(i) {
    onChange({ ...draft, blocks: blocks.filter((_, idx) => idx !== i) })
  }
  function moveBlock(i, dir) {
    const j = i + dir
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange({ ...draft, blocks: next })
  }

  return (
    <div>
      {blocks.map((block, i) => (
        <div key={block.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.7rem', gap: '0.6rem' }}>
            <select className="form-select" value={block.type} onChange={e => changeType(i, e.target.value)} style={{ maxWidth: '200px' }}>
              {BLOCK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <div>
              <button type="button" className="icon-btn" onClick={() => moveBlock(i, -1)} disabled={i === 0} title="Monter">↑</button>
              <button type="button" className="icon-btn" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} title="Descendre">↓</button>
              <button type="button" className="icon-btn danger" style={{ marginLeft: '0.35rem' }} onClick={() => removeBlock(i)} title="Supprimer">🗑️</button>
            </div>
          </div>

          {(block.type === 'texte' || block.type === 'definition' || block.type === 'exemple') && (
            <MiniRichEditor content={block.html} onChange={html => updateBlock(i, { html })} showToast={showToast} />
          )}
          {(block.type === 'formule' || block.type === 'liste') && (
            <StringListEditor
              items={block.items || []}
              onChange={items => updateBlock(i, { items })}
              placeholder={block.type === 'formule' ? 'Formule' : 'Élément'}
            />
          )}
          {block.type === 'video' && (
            <VideoBlockEditor block={block} onChange={patch => updateBlock(i, patch)} showToast={showToast} />
          )}
          {block.type === 'image' && (
            <ImageBlockEditor block={block} onChange={patch => updateBlock(i, patch)} showToast={showToast} />
          )}
          {block.type === 'fichier' && (
            <FileBlockEditor block={block} onChange={patch => updateBlock(i, patch)} showToast={showToast} />
          )}
        </div>
      ))}
      <button type="button" className="fic-btn" onClick={addBlock}>➕ Ajouter un bloc</button>
    </div>
  )
}
