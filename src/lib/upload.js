import { supabase } from './supabase'

const BUCKET = 'content-images'
const VIDEO_BUCKET = 'content-videos'
const FILE_BUCKET = 'content-files'

// Les clés de stockage Supabase (S3) n'acceptent pas les accents ni certains
// caractères spéciaux (ex. "^") — un nom de fichier original les contenant fait
// échouer l'upload avec "invalid key". On ne touche qu'à la clé de stockage, le
// nom original (accents compris) reste affiché tel quel (colonne "nom" en base).
export function sanitizeFilename(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9.\-_]/g, '_')
}

export async function uploadContentImage(file) {
  const ext = file.name.split('.').pop() || 'png'
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file)
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadContentVideo(file) {
  const ext = file.name.split('.').pop() || 'mp4'
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(path, file)
  if (error) throw error

  const { data } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadContentFile(file) {
  const path = `${crypto.randomUUID()}-${sanitizeFilename(file.name)}`

  const { error } = await supabase.storage.from(FILE_BUCKET).upload(path, file)
  if (error) throw error

  const { data } = supabase.storage.from(FILE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
