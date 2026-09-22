import React, { useState } from 'react'
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
import { uploadContentImage, uploadContentFile } from '../../lib/upload'
import { FontSize } from './FontSizeExtension'
import { ResizableImage, IMAGE_SIZE_OPTIONS } from './ResizableImageExtension'
import { ArrowInputRule } from './ArrowInputRule'

const FONT_SIZES = [
  { label: 'Petit', value: '0.85em' },
  { label: 'Normal', value: '' },
  { label: 'Grand', value: '1.25em' },
  { label: 'Très grand', value: '1.75em' },
]

export default function MiniRichEditor({ content, onChange, showToast }) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, blockquote: false, codeBlock: false, horizontalRule: false }),
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
    ],
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  function openLinkInput() {
    setLinkUrl(editor.getAttributes('link').href || '')
    setShowLinkInput(true)
  }
  function applyLink() {
    const url = linkUrl.trim()
    if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    else editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setShowLinkInput(false)
  }

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
    <div className="mini-rich-editor">
      <div className="tiptap-toolbar mini">
        <button type="button" className={editor.isActive('bold') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></button>
        <button type="button" className={editor.isActive('italic') ? 'active' : ''} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
        <button type="button" className={editor.isActive('underline') ? 'active' : ''} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></button>
        <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insérer un tableau">▦</button>
        <button type="button" className={editor.isActive('link') ? 'active' : ''} onClick={openLinkInput} title="Insérer un lien">🔗</button>
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
          🖼️
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagePick} />
        </label>
        <label className="tiptap-upload-btn">
          📎
          <input type="file" style={{ display: 'none' }} onChange={handleFilePick} />
        </label>
      </div>
      {showLinkInput && (
        <div style={{ display: 'flex', gap: '0.4rem', padding: '0.4rem', borderBottom: '1px solid var(--border)' }}>
          <input
            className="form-input" style={{ flex: 1 }}
            placeholder="https://…" value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyLink() } }}
            autoFocus
          />
          <button type="button" className="fic-btn" onClick={applyLink}>Appliquer</button>
        </div>
      )}
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
      <EditorContent editor={editor} className="tiptap-editor mini" />
    </div>
  )
}
