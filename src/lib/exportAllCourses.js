import JSZip from 'jszip'
import { supabase } from './supabase'
import { buildChapitreDocxBlob, slugify } from './exportWord'

const SANS_MATIERE = 'Sans matiere'

function pad(n) { return String(n).padStart(2, '0') }

// "Backup sHub JJ-MM-AAAA HHhMM" — pas de ":" (interdit dans les noms de fichiers Windows).
function backupZipName() {
  const d = new Date()
  const date = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
  const heure = `${pad(d.getHours())}h${pad(d.getMinutes())}`
  return `Backup sHub ${date} ${heure}.zip`
}

// Exporte tous les chapitres de tous les matières en un seul zip, un dossier par matière
// (un chapitre rattaché à plusieurs matières est dupliqué dans chaque dossier concerné).
export async function downloadAllCoursesBackup() {
  const [{ data: matieres, error: matieresError }, { data: chapitres, error: chapitresError }] = await Promise.all([
    supabase.from('matieres').select('id, nom').order('ordre'),
    supabase.from('chapitres').select('*').order('ordre'),
  ])
  if (matieresError) throw matieresError
  if (chapitresError) throw chapitresError

  const chapitreIds = (chapitres || []).map(ch => ch.id)
  const { data: sections, error: sectionsError } = chapitreIds.length
    ? await supabase.from('sections_cours').select('*').in('chapitre_id', chapitreIds).order('ordre')
    : { data: [], error: null }
  if (sectionsError) throw sectionsError

  const sectionsByChapitre = {}
  for (const sec of sections || []) {
    (sectionsByChapitre[sec.chapitre_id] ||= []).push(sec)
  }
  const nomById = Object.fromEntries((matieres || []).map(m => [m.id, m.nom]))

  const zip = new JSZip()
  const usedNamesByFolder = {}

  for (const ch of chapitres || []) {
    const blob = await buildChapitreDocxBlob(ch, sectionsByChapitre[ch.id] || [])
    const buffer = await blob.arrayBuffer()
    const folderNames = (ch.matiere_ids || []).map(id => nomById[id]).filter(Boolean)
    for (const folderName of folderNames.length ? folderNames : [SANS_MATIERE]) {
      const used = (usedNamesByFolder[folderName] ||= new Set())
      let fileName = `${slugify(ch.titre_fr)}.docx`
      let i = 2
      while (used.has(fileName)) fileName = `${slugify(ch.titre_fr)}-${i++}.docx`
      used.add(fileName)
      zip.folder(folderName).file(fileName, buffer)
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupZipName()
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
