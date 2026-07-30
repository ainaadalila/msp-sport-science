// Edge Function: create-user
//
// Replaces the old client-side `adminClient.ts` flow that used
// VITE_SUPABASE_SERVICE_ROLE_KEY directly in the browser bundle (a critical
// vulnerability — anyone could pull the key from the deployed JS and get
// full, unrestricted DB + Auth admin access, bypassing RLS entirely).
//
// The service role key now lives ONLY here, server-side. On Supabase Cloud,
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
// into every Edge Function automatically at runtime. Self-hosted (this
// deployment's actual target) does NOT do this — these three must be set
// manually as env vars on the `functions` service in docker-compose.yml.
//
// Authorization model: RLS on `profiles` only requires an authenticated
// user (see Skema Pangkalan Data doc, section 5), so it does NOT stop a
// non-admin from calling this function. The role check below is what
// actually protects this — do not remove it.
//
// `createClient` is imported from a local vendored copy
// (_shared/vendor/supabase-js.js), not the usual `https://esm.sh/...` URL.
// This self-hosted server has no outbound internet access, so a live
// esm.sh fetch on every cold start hangs indefinitely — this caused
// create-user/delete-user to 504 in production. The vendored file was
// built via `esbuild` (bundle, platform=browser, format=esm) from the real
// npm package on a machine with internet, then copied in. Re-run that
// build if the Supabase JS client version ever needs bumping.

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

    // 4b. The Auth Admin API (used below) does not enforce the project's
    // password policy (config.toml's [auth] settings only apply to the
    // self-service /auth/v1/signup and /auth/v1/user endpoints) — confirmed
    // by testing directly. Since this function is the only way real
    // accounts get created, the policy has to be checked here explicitly,
    // mirroring src/lib/passwordValidator.ts's rules.
    if (
      password.length < 12 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      return json({ error: 'Password must be at least 12 characters and include an uppercase letter, a lowercase letter, and a number' }, 400)
    }

    // 4c. Creating a peer superadmin needs step-up re-authentication: a
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

    // 6. Set the profile row's real values. The `handle_new_user` trigger
    // (fires AFTER INSERT ON auth.users) already created a `profiles` row
    // for this user with default/placeholder values by the time we get
    // here — so this must be an upsert (update-on-conflict), not a plain
    // insert, or it collides with the trigger's row on the primary key.
    const { error: insertErr } = await adminClient.from('profiles').upsert({
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
