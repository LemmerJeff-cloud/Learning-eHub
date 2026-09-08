import { supabase } from './supabase'

// Un seul backup par chapitre et par jour calendaire : les sauvegardes automatiques
// (déclenchées à chaque changement de type, migration, restauration...) rendraient
// l'historique vite illisible sinon. Un backup existant du jour est mis à jour
// (dernier état avant modification) plutôt que d'en empiler un nouveau.
export async function backupChapitre(chapitreId, label, userId) {
  const { data: chapitre, error: chapitreError } = await supabase.from('chapitres').select('*').eq('id', chapitreId).single()
  if (chapitreError) throw chapitreError
  const { data: sections, error: sectionsError } = await supabase.from('sections_cours').select('*').eq('chapitre_id', chapitreId).order('ordre')
  if (sectionsError) throw sectionsError

  const snapshot = { chapitre, sections: sections || [] }
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: existing, error: existingError } = await supabase
    .from('content_backups')
    .select('id')
    .eq('chapitre_id', chapitreId)
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existingError) throw existingError

  if (existing) {
    const { error } = await supabase.from('content_backups')
      .update({ label, snapshot, created_by: userId, created_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('content_backups').insert({
      chapitre_id: chapitreId,
      label,
      snapshot,
      created_by: userId,
    })
    if (error) throw error
  }
}

// Restaure un chapitre à partir d'un snapshot de content_backups.
// N'upsert que les sections présentes dans le snapshot (par id) — les sections ajoutées
// depuis la sauvegarde ne sont volontairement PAS supprimées, pour éviter une perte de
// données en cascade (exercices/blocs liés) qui n'a rien à voir avec ce qu'on restaure.
export async function restoreChapitreBackup(backup, userId) {
  const { chapitre, sections } = backup.snapshot

  await backupChapitre(
    backup.chapitre_id,
    `avant restauration de "${backup.label || new Date(backup.created_at).toLocaleString('fr-FR')}"`,
    userId,
  )

  const { id, ...chapitreFields } = chapitre
  const { error: chapitreError } = await supabase.from('chapitres').update(chapitreFields).eq('id', id)
  if (chapitreError) throw chapitreError

  if (sections?.length > 0) {
    const { error: sectionsError } = await supabase.from('sections_cours').upsert(sections, { onConflict: 'id' })
    if (sectionsError) throw sectionsError
  }
}
