import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun,
  Table, TableRow, TableCell, WidthType, ExternalHyperlink,
} from 'docx'

// Largeur max d'une image insérée, en pixels — tient confortablement sur une page A4
// avec les marges par défaut de docx.
const MAX_IMAGE_WIDTH = 500

const MIME_TO_DOCX_TYPE = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
  'image/gif': 'gif', 'image/bmp': 'bmp',
}

function rgbToHex(rgbStr) {
  const nums = rgbStr?.match(/\d+/g)
  if (!nums) return undefined
  return nums.slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase()
}

// Parcourt les nœuds inline (texte, gras/italique/souligné/barré/couleur) d'un fragment HTML
// Tiptap et les convertit en TextRun. Les marques (marks) se propagent en descendant l'arbre.
function runsFromInline(node, marks = {}) {
  const runs = []
  node.childNodes.forEach(child => {
    if (child.nodeType === 3) { // Node.TEXT_NODE
      if (child.textContent) runs.push(new TextRun({ text: child.textContent, ...marks }))
      return
    }
    if (child.nodeType !== 1) return // pas un Node.ELEMENT_NODE
    const tag = child.tagName.toLowerCase()
    if (tag === 'br') { runs.push(new TextRun({ text: '', break: 1 })); return }
    const nextMarks = { ...marks }
    if (tag === 'strong' || tag === 'b') nextMarks.bold = true
    if (tag === 'em' || tag === 'i') nextMarks.italics = true
    if (tag === 'u') nextMarks.underline = {}
    if (tag === 's' || tag === 'strike') nextMarks.strike = true
    if (tag === 'span') {
      const hex = child.style?.color && rgbToHex(child.style.color)
      if (hex) nextMarks.color = hex
    }
    runs.push(...runsFromInline(child, nextMarks))
  })
  return runs
}

async function imageParagraphFromEl(imgEl) {
  const src = imgEl.getAttribute('src')
  try {
    const res = await fetch(src)
    if (!res.ok) throw new Error('fetch failed')
    const blob = await res.blob()
    const docxType = MIME_TO_DOCX_TYPE[blob.type]
    if (!docxType) throw new Error(`format non pris en charge (${blob.type || 'inconnu'})`)

    const bitmap = await createImageBitmap(blob)
    const scale = bitmap.width > MAX_IMAGE_WIDTH ? MAX_IMAGE_WIDTH / bitmap.width : 1
    const buffer = await blob.arrayBuffer()

    return new Paragraph({
      children: [new ImageRun({
        type: docxType,
        data: buffer,
        transformation: { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) },
      })],
      spacing: { after: 160 },
    })
  } catch {
    return new Paragraph({
      children: [new TextRun({ text: '[Image non disponible dans cet export]', italics: true, color: '999999' })],
      spacing: { after: 120 },
    })
  }
}

// Word ne peut pas intégrer de vidéo — on insère un lien cliquable vers la source
// (YouTube/Vimeo ou fichier téléversé) à la place.
function videoParagraph(src) {
  return new Paragraph({
    children: [
      new TextRun({ text: '🎬 Vidéo : ', bold: true }),
      new ExternalHyperlink({
        link: src,
        children: [new TextRun({ text: src, color: '2563EB', underline: {} })],
      }),
    ],
    spacing: { after: 120 },
  })
}

function buildTable(tableEl) {
  const rows = [...tableEl.querySelectorAll('tr')].map(tr => {
    const cells = [...tr.children].map(cellEl => {
      const isHeader = cellEl.tagName.toLowerCase() === 'th'
      const runs = runsFromInline(cellEl, isHeader ? { bold: true } : {})
      return new TableCell({
        children: [new Paragraph({ children: runs.length ? runs : [new TextRun('')] })],
        shading: isHeader ? { fill: 'F0F0F0' } : undefined,
      })
    })
    return new TableRow({ children: cells })
  })
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } })
}

// Convertit un fragment HTML issu de Tiptap (MiniRichEditor ou TiptapEditor) en une liste
// de blocs docx (Paragraph/Table). Volontairement tolérant : toute balise inconnue est
// traitée comme un paragraphe de secours plutôt que de faire échouer tout l'export.
async function blocksFromHtml(html) {
  const body = new DOMParser().parseFromString(html || '', 'text/html').body
  const blocks = []
  for (const node of [...body.childNodes]) {
    // Contenu ancien seedé en base sans balise <p> (texte brut) — sans ce cas, le nœud
    // texte serait silencieusement ignoré puisqu'il n'est pas un Node.ELEMENT_NODE.
    if (node.nodeType === 3) {
      if (node.textContent.trim()) blocks.push(new Paragraph({ children: [new TextRun(node.textContent)], spacing: { after: 120 } }))
      continue
    }
    if (node.nodeType !== 1) continue
    const tag = node.tagName.toLowerCase()
    if (tag === 'p') {
      const runs = runsFromInline(node)
      blocks.push(new Paragraph({ children: runs.length ? runs : [new TextRun('')], spacing: { after: 120 } }))
    } else if (tag === 'h1' || tag === 'h2') {
      blocks.push(new Paragraph({ children: runsFromInline(node), heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 } }))
    } else if (tag === 'h3') {
      blocks.push(new Paragraph({ children: runsFromInline(node), heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 100 } }))
    } else if (tag === 'ul') {
      ;[...node.children].forEach(li => blocks.push(new Paragraph({ children: runsFromInline(li), bullet: { level: 0 } })))
    } else if (tag === 'ol') {
      ;[...node.children].forEach((li, i) => blocks.push(new Paragraph({ children: [new TextRun(`${i + 1}. `), ...runsFromInline(li)] })))
    } else if (tag === 'table') {
      blocks.push(buildTable(node))
    } else if (tag === 'img') {
      blocks.push(await imageParagraphFromEl(node))
    } else if (tag === 'div' && node.hasAttribute('data-video-embed')) {
      const src = node.querySelector('iframe, video')?.getAttribute('src')
      blocks.push(src
        ? videoParagraph(src)
        : new Paragraph({ children: [new TextRun({ text: '[Vidéo non disponible dans cet export]', italics: true, color: '999999' })], spacing: { after: 120 } }))
    } else {
      const runs = runsFromInline(node)
      if (runs.length) blocks.push(new Paragraph({ children: runs, spacing: { after: 120 } }))
    }
  }
  return blocks
}

// Un seul bloc de contenu (type 'blocs' d'une section, ou — par compatibilité — l'ancien
// contenu direct d'une section definition/exemple/formule/liste) converti en paragraphes docx.
async function blockToDocxParagraphs(block) {
  if (block.type === 'texte') {
    return blocksFromHtml(block.html)
  }
  if (block.type === 'definition' || block.type === 'exemple') {
    return [
      plain(block.type === 'definition' ? 'Définition' : 'Exemple', { bold: true, color: block.type === 'definition' ? 'D4780A' : '2E7D32' }),
      ...await blocksFromHtml(block.html),
    ]
  }
  if (block.type === 'formule') {
    return (block.items || []).map(f => plain(f))
  }
  if (block.type === 'liste') {
    return (block.items || []).map(item => bulletItem(item))
  }
  if (block.type === 'video') {
    return block.src ? [videoParagraph(block.src)] : []
  }
  return []
}

function heading(text, level) {
  return new Paragraph({ text, heading: level, spacing: { before: 300, after: 160 } })
}
function plain(text, opts = {}) {
  return new Paragraph({ children: [new TextRun({ text, ...opts })], spacing: { after: 100 } })
}
function bulletItem(text) {
  return new Paragraph({ children: [new TextRun(text)], bullet: { level: 0 } })
}

export async function buildChapitreDocx(chapitre, sections) {
  const children = []
  children.push(new Paragraph({ text: [chapitre.emoji, chapitre.titre_fr].filter(Boolean).join(' '), heading: HeadingLevel.TITLE, spacing: { after: 200 } }))
  if (chapitre.description_fr) children.push(plain(chapitre.description_fr, { italics: true, color: '666666' }))

  for (const sec of sections) {
    children.push(heading(sec.titre_fr, HeadingLevel.HEADING_1))
    const c = sec.contenu || {}

    if (sec.type === 'blocs') {
      for (const block of c.blocks || []) {
        children.push(...await blockToDocxParagraphs(block))
      }
    } else if (sec.type === 'definition' || sec.type === 'exemple') {
      children.push(...await blockToDocxParagraphs({ type: sec.type, html: c.fr }))
    } else if (sec.type === 'formule') {
      children.push(...await blockToDocxParagraphs({ type: 'formule', items: c.fr }))
    } else if (sec.type === 'liste') {
      children.push(...await blockToDocxParagraphs({ type: 'liste', items: c.fr }))
    } else if (sec.type === 'activite') {
      children.push(plain('✏️ Tâche à réaliser', { bold: true }))
      if (c.contexte) {
        children.push(plain('Contexte', { bold: true }))
        children.push(...await blocksFromHtml(c.contexte))
      }
      for (const phase of c.phases || []) {
        children.push(heading(phase.label || 'Phase', HeadingLevel.HEADING_2))
        if (phase.question_depart) {
          children.push(plain('❓ Question de départ', { bold: true }))
          children.push(...await blocksFromHtml(phase.question_depart))
        }
        ;(phase.consignes || []).forEach(ci => children.push(bulletItem(ci)))
      }
    } else if (sec.type === 'editeur') {
      children.push(...await blocksFromHtml(c.html))
    }
  }

  return new Document({ sections: [{ children }] })
}

const DIACRITICS_RE = new RegExp('[̀-ͯ]', 'g')

export function slugify(str) {
  return (str || '')
    .normalize('NFD').replace(DIACRITICS_RE, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    || 'chapitre'
}

export async function buildChapitreDocxBlob(chapitre, sections) {
  const doc = await buildChapitreDocx(chapitre, sections)
  return Packer.toBlob(doc)
}

export async function downloadChapitreWord(chapitre, sections) {
  const blob = await buildChapitreDocxBlob(chapitre, sections)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slugify(chapitre.titre_fr)}.docx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
