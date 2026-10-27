import { supabase } from './supabase'

// Les Edge Functions sont désormais validées côté gateway contre les nouvelles clés API
// (sb_publishable_…/sb_secret_…), même si le reste de l'app utilise encore l'ancienne clé
// anon (JWT) — cf. "apikey header matched no key configured for auth mode(s)". On passe
// donc explicitement la clé publishable sur ces appels (create-user fonctionnait encore
// sans grâce à une config legacy sur cette fonction précise, mais ça finira par casser
// pareil le jour où Supabase désactivera les clés legacy).
const FUNCTION_HEADERS = { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }

async function invoke(name, payload) {
  const { data, error } = await supabase.functions.invoke(name, { body: payload, headers: FUNCTION_HEADERS })
  if (error) {
    let message = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch {
      // keep default message
    }
    throw new Error(message)
  }
  return data
}

export async function createUserAccount(payload) {
  return invoke('create-user', payload)
}

export async function resetUserPassword(userId, password) {
  return invoke('reset-password', { userId, password })
}
