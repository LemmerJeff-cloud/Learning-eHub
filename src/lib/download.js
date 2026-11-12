import { supabase } from './supabase'

// iOS Safari bloque window.open() s'il n'est pas appelé de façon strictement synchrone
// dans le gestionnaire de clic — ouvrir l'onglet seulement après le "await" de
// createSignedUrl() (comme on le faisait) le fait traiter comme un popup et le bloque
// silencieusement sur iPhone. On ouvre l'onglet vide tout de suite, puis on le redirige
// une fois l'URL signée obtenue.
export async function downloadFromStorage(bucket, path, expiresIn = 60) {
  const win = window.open('', '_blank')
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error || !data) { win?.close(); return false }
  if (win) win.location.href = data.signedUrl
  else window.open(data.signedUrl, '_blank')
  return true
}
