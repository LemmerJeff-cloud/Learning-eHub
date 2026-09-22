import React, { useState, useRef, useEffect } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { uploadContentImage, uploadContentVideo, uploadContentFile } from '../../lib/upload'
import { VideoEmbed, toEmbedUrl } from './VideoEmbedExtension'
import { FontSize } from './FontSizeExtension'
import { ResizableImage, IMAGE_SIZE_OPTIONS } from './ResizableImageExtension'
import { ArrowInputRule } from './ArrowInputRule'

const FONT_SIZES = [
  { label: 'Petit', value: '0.85em' },
  { label: 'Normal', value: '' },
  { label: 'Grand', value: '1.25em' },
  { label: 'Très grand', value: '1.75em' },
]

export default function TiptapEditor({ content, onChange, showToast }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontSize,
      Typography.configure({ rightArrow: false, emDash: false }),
      ArrowInputRule,
      ResizableImage,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noreferrer' } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      VideoEmbed,
    ],
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  const [videoMenuOpen, setVideoMenuOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const videoMenuRef = useRef(null)

  useEffect(() => {
    if (!videoMenuOpen) return
    function onClickOutside(e) {
      if (videoMenuRef.current && !videoMenuRef.current.contains(e.target)) setVideoMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [videoMenuOpen])

  async function handleImagePick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !editor) return
    try {
      const url = await uploadContentImage(file)
      editor.chain().focus().setImage({ src: url }).run()
    } catch (err) {
      showToast?.(err.message || "Échec de l'upload de l'image", 'error')
    }
  }

  function insertVideoUrl() {
    const embed = toEmbedUrl(videoUrl.trim())
    if (!embed) {
      showToast?.('Lien YouTube ou Vimeo non reconnu', 'error')
      return
    }
    editor?.chain().focus().insertContent({ type: 'videoEmbed', attrs: embed }).run()
    setVideoUrl('')
    setVideoMenuOpen(false)
  }

  async function handleVideoFilePick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !editor) return
    try {
      const url = await uploadContentVideo(file)
      editor.chain().focus().insertContent({ type: 'videoEmbed', attrs: { src: url, provider: 'file' } }).run()
      setVideoMenuOpen(false)
    } catch (err) {
      showToast?.(err.message || "Échec de l'upload de la vidéo", 'error')
    }
  }

  async function handleFilePick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !editor) return
    try {
      const url = await uploadContentFile(file)
      editor.chain().focus().insertContent([
        { type: 'text', text: `📎 ${file.name}`, marks: [{ type: 'link', attrs: { href: url } }] },
        { type: 'text', text: ' ' },
      ]).run()
    } catch (err) {
      showToast?.(err.message || "Échec de l'upload du fichier", 'error')
    }
  }

  if (!editor) return null

  return (
    <div>
      <div className="tiptap-toolbar">
        <button type="button" className={editor.isActive('bold') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></button>
        <button type="button" className={editor.isActive('italic') ? 'active' : ''} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
        <button type="button" className={editor.isActive('underline') ? 'active' : ''} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></button>
        <button type="button" className={editor.isActive('heading', { level: 2 }) ? 'active' : ''} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" className={editor.isActive('heading', { level: 3 }) ? 'active' : ''} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button type="button" className={editor.isActive('bulletList') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBulletList().run()}>• Liste</button>
        <button type="button" className={editor.isActive('orderedList') ? 'active' : ''} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. Liste</button>
        <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>▦ Tableau</button>
        <input
          type="color"
          className="tiptap-color-input"
          value={editor.getAttributes('textStyle').color || '#1a1f36'}
          onChange={e => editor.chain().focus().setColor(e.target.value).run()}
          title="Couleur du texte"
        />
        <select
          className="tiptap-fontsize-select"
          value={editor.getAttributes('textStyle').fontSize || ''}
          onChange={e => e.target.value ? editor.chain().focus().setFontSize(e.target.value).run() : editor.chain().focus().unsetFontSize().run()}
          title="Taille du texte"
        >
          {FONT_SIZES.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
        </select>
        <label className="tiptap-upload-btn">
          🖼️ Image
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagePick} />
        </label>
        <div ref={videoMenuRef} style={{ position: 'relative', display: 'inline-block' }}>
          <button type="button" onClick={() => setVideoMenuOpen(o => !o)}>🎬 Vidéo</button>
          {videoMenuOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 20, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.7rem', width: '240px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Lien YouTube / Vimeo</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); insertVideoUrl() } }}
                style={{ marginBottom: '0.5rem', width: '100%' }}
              />
              <button type="button" className="fic-btn" style={{ width: '100%', marginBottom: '0.6rem' }} onClick={insertVideoUrl}>Insérer le lien</button>
              <label className="tiptap-upload-btn" style={{ display: 'block', textAlign: 'center' }}>
                📤 Téléverser un fichier vidéo
                <input type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoFilePick} />
              </label>
            </div>
          )}
        </div>
        <label className="tiptap-upload-btn">
          📎 Fichier
          <input type="file" style={{ display: 'none' }} onChange={handleFilePick} />
        </label>
      </div>
      <BubbleMenu editor={editor} shouldShow={({ editor }) => editor.isActive('image')}>
        <div className="tiptap-image-size-menu">
          {IMAGE_SIZE_OPTIONS.map(opt => (
            <button
              key={opt.label}
              type="button"
              onClick={() => editor.chain().focus().updateAttributes('image', { width: opt.width }).run()}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </BubbleMenu>
      <EditorContent editor={editor} className="tiptap-editor" />
    </div>
  )
}
