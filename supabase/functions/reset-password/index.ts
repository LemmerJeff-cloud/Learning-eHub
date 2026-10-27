import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: callerErr } = await callerClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (callerErr || !userData?.user) return json({ error: 'Non authentifié' }, 401)

    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'admin') {
      return json({ error: 'Accès réservé aux administrateurs' }, 403)
    }

    const body = await req.json()
    const { userId, password } = body

    if (!userId || !password) {
      return json({ error: 'Champs requis manquants (userId, password)' }, 400)
    }
    if (password.length < 6) {
      return json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, 400)
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, { password })
    if (updateErr) return json({ error: updateErr.message }, 400)

    return json({ ok: true }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, 500)
  }
})
