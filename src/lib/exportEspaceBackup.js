import JSZip from 'jszip'
import { supabase } from './supabase'

const BUCKET = 'espace-fichiers'

function pad(n) { return String(n).padStart(2, '0') }

// Pas de ":" dans le nom (interdit dans les noms de fichiers Windows).
function backupZipName(prefix) {
  const d = new Date()
  const date = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
  const heure = `${pad(d.getHours())}h${pad(d.getMinutes())}`
  return `${prefix} ${date} ${heure}.zip`
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Reconstitue l'arborescence espace_dossiers/espace_fichiers d'une entreprise dans un
// dossier JSZip donné (téléchargement réel des fichiers depuis le bucket Storage).
async function fillEntrepriseFolder(zipFolder, entrepriseId) {
  const [{ data: dossiers, error: dosError }, { data: fichiers, error: ficError }] = await Promise.all([
    supabase.from('espace_dossiers').select('id, parent_id, nom').eq('entreprise_id', entrepriseId),
    supabase.from('espace_fichiers').select('id, dossier_id, nom, chemin').eq('entreprise_id', entrepriseId),
  ])
  if (dosError) throw dosError
  if (ficError) throw ficError

  const childrenOf = parentId => (dossiers || []).filter(d => (d.parent_id || null) === parentId)
  const filesOf = dossierId => (fichiers || []).filter(f => (f.dossier_id || null) === dossierId)

  async function fill(folder, dossierId) {
    const used = new Set()
    for (const f of filesOf(dossierId)) {
      const { data: blob, error } = await supabase.storage.from(BUCKET).download(f.chemin)
      if (error) throw error
      let name = f.nom
      let i = 2
      while (used.has(name)) name = `${f.nom} (${i++})`
      used.add(name)
      folder.file(name, blob)
    }
    for (const d of childrenOf(dossierId)) {
      await fill(folder.folder(d.nom), d.id)
    }
  }

  await fill(zipFolder, null)
}

// Backup des fichiers d'une seule entreprise (bouton dans EspaceFichiers.jsx —
// accessible à l'admin et aux enseignants rattachés à cette entreprise).
export async function downloadEntrepriseFilesBackup(entrepriseId, entrepriseNom) {
  const zip = new JSZip()
  await fillEntrepriseFolder(zip, entrepriseId)
  const blob = await zip.generateAsync({ type: 'blob' })
  triggerDownload(blob, backupZipName(`Fichiers ${entrepriseNom}`))
}

// Backup global : toutes les entreprises, un sous-dossier par entreprise (bouton dans
// AdminEntreprises.jsx — admin uniquement, sinon RLS ne renverrait que les entreprises
// où l'enseignant est rattaché, donnant un zip silencieusement incomplet).
export async function downloadAllEntreprisesFilesBackup() {
  const { data: entreprises, error } = await supabase.from('entreprises').select('id, nom').order('nom')
  if (error) throw error

  const zip = new JSZip()
  const used = new Set()
  for (const e of entreprises || []) {
    let folderName = e.nom
    let i = 2
    while (used.has(folderName)) folderName = `${e.nom} (${i++})`
    used.add(folderName)
    await fillEntrepriseFolder(zip.folder(folderName), e.id)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  triggerDownload(blob, backupZipName('Backup Espaces entreprises'))
}
