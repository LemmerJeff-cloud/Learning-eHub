import { supabase } from './supabase'

export async function createUserAccount(payload) {
  const { data, error } = await supabase.functions.invoke('create-user', { body: payload })
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
