import { supabase } from './supabase'

// Masquage progressif du contenu par classe — l'absence de ligne dans `revele_etat`
// signifie "caché", cf. supabase/schema.sql (section RÉVÉLATION DE CONTENU PAR CLASSE).

export async function fetchRevealedBlocIds(sectionId, classeId) {
  if (!classeId) return new Set()
  const { data, error } = await supabase
    .from('revele_etat')
    .select('bloc_id')
    .eq('section_id', sectionId)
    .eq('classe_id', classeId)
  if (error) throw error
  return new Set((data || []).map(r => r.bloc_id))
}

export async function revealBloc(sectionId, blocId, classeId, userId) {
  const { error } = await supabase
    .from('revele_etat')
    .upsert({ section_id: sectionId, bloc_id: blocId, classe_id: classeId, revele_par: userId }, { onConflict: 'classe_id,bloc_id' })
  if (error) throw error
}

export async function hideBloc(blocId, classeId) {
  const { error } = await supabase
    .from('revele_etat')
    .delete()
    .eq('bloc_id', blocId)
    .eq('classe_id', classeId)
  if (error) throw error
}
