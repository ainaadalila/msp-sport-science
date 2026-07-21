// Edge Function: create-user
//
// Replaces the old client-side `adminClient.ts` flow that used
// VITE_SUPABASE_SERVICE_ROLE_KEY directly in the browser bundle (a critical
// vulnerability — anyone could pull the key from the deployed JS and get
// full, unrestricted DB + Auth admin access, bypassing RLS entirely).
//
// The service role key now lives ONLY here, server-side. Supabase injects
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY into every
// Edge Function automatically at runtime — nothing to configure manually.
//
// Authorization model: RLS on `profiles` only requires an authenticated
// user (see Skema Pangkalan Data doc, section 5), so it does NOT stop a
// non-admin from calling this function. The role check below is what
// actually protects this — do not remove it.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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
    // 1. Identify the caller from their own JWT (forwarded automatically by
    //    supabase.functions.invoke() on the frontend).
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) return json({ error: 'Not authenticated' }, 401)

    // 2. Service-role client — only ever used server-side, never shipped to
    //    the browser.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 3. Enforce that only superadmins can create users (matches the
    //    existing UI gating in UserManagementPage.tsx, now actually
    //    enforced server-side instead of just hidden in the UI).
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (profileErr || callerProfile?.role !== 'superadmin') {
      return json({ error: 'Forbidden — superadmin role required' }, 403)
    }

    // 4. Validate input.
    const body = await req.json()
    const { email, password, full_name, role, module_permissions, caller_password } = body ?? {}
    if (!email || !password || !full_name || !role) {
      return json({ error: 'Missing required fields: email, password, full_name, role' }, 400)
    }

    // 4b. Creating a peer superadmin needs step-up re-authentication: a
    // stolen bearer token/session alone must not be enough to plant a
    // durable backdoor superadmin account. Re-verify the caller's current
    // password against their own account before proceeding.
    if (role === 'superadmin') {
      if (!caller_password) {
        return json({ error: 'Current password confirmation is required to create a superadmin account' }, 400)
      }
      const reauthClient = createClient(supabaseUrl, anonKey)
      const { error: reauthErr } = await reauthClient.auth.signInWithPassword({
        email: caller.email!,
        password: caller_password,
      })
      if (reauthErr) {
        return json({ error: 'Password confirmation incorrect' }, 403)
      }
    }

    // 5. Create the auth user.
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    })
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? 'Failed to create auth user' }, 400)
    }

    // 6. Create the matching profile row.
    const { error: insertErr } = await adminClient.from('profiles').insert({
      id: created.user.id,
      full_name,
      role,
      module_permissions: module_permissions ?? {},
      created_at: new Date().toISOString(),
    })
    if (insertErr) {
      // Roll back the auth user so we don't end up with an orphaned account
      // that has no profile row.
      await adminClient.auth.admin.deleteUser(created.user.id)
      return json({ error: `Failed to create profile: ${insertErr.message}` }, 400)
    }

    return json({ user: { id: created.user.id, email: created.user.email } }, 200)
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
