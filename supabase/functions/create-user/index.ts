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
    const { email, password, prenom, initiale, role, classe_id, section, entreprise_id, lycee_id } = body

    if (!email || !password || !prenom || !role) {
      return json({ error: 'Champs requis manquants (email, password, prenom, role)' }, 400)
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createErr) return json({ error: createErr.message }, 400)

    const { error: profileErr } = await adminClient.from('profiles').insert({
      id: created.user.id,
      prenom,
      initiale: initiale || '',
      role,
      classe_id: classe_id || null,
      section: section || null,
      entreprise_id: entreprise_id || null,
      lycee_id: lycee_id || null,
      email,
    })

    if (profileErr) {
      await adminClient.auth.admin.deleteUser(created.user.id)
      return json({ error: profileErr.message }, 400)
    }

    return json({ id: created.user.id }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, 500)
  }
})
