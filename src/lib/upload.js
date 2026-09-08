import { supabase } from './supabase'

const BUCKET = 'content-images'
const VIDEO_BUCKET = 'content-videos'

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
