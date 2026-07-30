// Edge Function: delete-user
// See create-user/index.ts for the full rationale — this replaces the old
// client-side deleteUserAdmin() that used the service role key directly in
// the browser bundle.

import { createClient } from '../_shared/vendor/supabase-js.js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) return json({ error: 'Not authenticated' }, 401)

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (profileErr || callerProfile?.role !== 'superadmin') {
      return json({ error: 'Forbidden — superadmin role required' }, 403)
    }

    const body = await req.json()
    const { userId } = body ?? {}
    if (!userId) return json({ error: 'Missing required field: userId' }, 400)

    if (userId === caller.id) {
      return json({ error: 'Cannot delete your own account' }, 400)
    }

    // Deleting the auth user cascades to the profile row
    // (profiles.id FK -> auth.users(id) ON DELETE CASCADE), and nullifies
    // recorded_by/created_by references elsewhere per the schema migration.
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteErr) {
      return json({ error: deleteErr.message }, 400)
    }

    return json({ success: true }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
