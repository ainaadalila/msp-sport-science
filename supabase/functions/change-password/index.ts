// Edge Function: change-password
//
// Closes REHACK retest finding #3 ("Password Change Did Not Require Current
// Password"). The app's own UI already re-verified the current password
// before calling `supabase.auth.updateUser()` (see git history — the
// Layout.tsx change-password modal, and ResetPasswordPage.tsx's
// PASSWORD_RECOVERY-gated reset page). But `updateUser()` calls Supabase
// Auth's own `PUT /auth/v1/user` endpoint directly — REHACK proved that
// endpoint accepts a password change from *any* valid session token, with
// no current-password check, no recovery-token check, nothing, regardless
// of what the frontend does first. A stolen/replayed token was enough.
//
// This function moves password changes server-side and becomes the ONLY
// sanctioned path — the actual server-side fix (done at the same time as
// this function was written) blocks direct PUT/PATCH to /auth/v1/user at
// Kong, so the raw endpoint REHACK used is no longer reachable at all.
//
// Two cases, both funnelled through this one function:
//   1. Normal in-app change: caller supplies `current_password`, which is
//      re-verified server-side via signInWithPassword before proceeding.
//   2. Password-recovery-link flow: caller's JWT carries an `amr` (Auth
//      Method Reference) entry proving GoTrue itself authenticated this
//      specific session via the recovery flow — not just "any active
//      session". No current_password needed in this case, since the
//      recovery link itself was the proof of ownership.
//
// `createClient` is imported from a local vendored copy
// (_shared/vendor/supabase-js.js), not `https://esm.sh/...` — this
// self-hosted server has no outbound internet access, so a live esm.sh
// fetch on every cold start hangs indefinitely (same issue that broke
// create-user/delete-user; see those files for the full explanation).
// Re-run the esbuild vendoring step if the Supabase JS client version
// ever needs bumping.

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
    // 1. Identify the caller from their own JWT.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) return json({ error: 'Not authenticated' }, 401)

    // 2. Service-role client — only ever used server-side.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 3. Determine whether this session is a genuine password-recovery
    // session, by inspecting the JWT's own `amr` (Authentication Method
    // Reference) claim — set by GoTrue itself when the session was
    // established via a recovery link, not something the client can fake,
    // since we already validated this exact JWT against GoTrue in step 1.
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const isRecoverySession = isRecoveryToken(token)

    // 4. Validate input.
    const body = await req.json().catch(() => null)
    const new_password = body?.new_password
    const current_password = body?.current_password
    if (!new_password) {
      return json({ error: 'Missing required field: new_password' }, 400)
    }

    // 4b. Same password policy as create-user — the Auth Admin API used
    // below does not enforce config.toml's password policy itself.
    if (
      new_password.length < 12 ||
      !/[A-Z]/.test(new_password) ||
      !/[a-z]/.test(new_password) ||
      !/[0-9]/.test(new_password)
    ) {
      return json({ error: 'Password must be at least 12 characters and include an uppercase letter, a lowercase letter, and a number' }, 400)
    }

    // 5. The actual fix: require proof of ownership beyond "a session
    // exists". Either a verified recovery session, or the current
    // password re-checked right here, server-side, where it can't be
    // skipped by calling a different endpoint.
    if (!isRecoverySession) {
      if (!current_password) {
        return json({ error: 'Current password confirmation is required' }, 400)
      }
      const reauthClient = createClient(supabaseUrl, anonKey)
      const { error: reauthErr } = await reauthClient.auth.signInWithPassword({
        email: caller.email!,
        password: current_password,
      })
      if (reauthErr) {
        return json({ error: 'Kata laluan semasa tidak tepat.' }, 403)
      }
    }

    // 6. Actually change the password.
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(caller.id, {
      password: new_password,
    })
    if (updateErr) {
      return json({ error: updateErr.message }, 400)
    }

    // 7. Audit log — best-effort, mirrors the old client-side logAction()
    // call. Not fatal if it fails.
    await adminClient.from('audit_logs').insert({
      user_id: caller.id,
      action: 'change_password',
    })

    return json({ success: true }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

// Decodes a JWT's payload (no signature re-verification needed here — the
// token already passed GoTrue's own validation via getUser() above, this
// just reads the claims GoTrue itself put in it) and checks whether the
// most recent entry in `amr` (Authentication Method Reference) is
// "recovery" — meaning this exact session was established by clicking a
// genuine password-recovery link, not by any other login method.
function isRecoveryToken(token: string): boolean {
  try {
    const payloadB64 = token.split('.')[1]
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson)
    const amr = payload?.amr as { method?: string; timestamp?: number }[] | undefined
    if (!Array.isArray(amr) || amr.length === 0) return false
    // Confirmed against this GoTrue version's actual behavior: a session
    // established by clicking a genuine recovery link records its auth
    // method as "otp" (GoTrue verifies recovery links through its OTP
    // mechanism internally), not literally "recovery". This app has no
    // other signInWithOtp/verifyOtp/magic-link flow anywhere (confirmed
    // via full-codebase search), so "otp" is a safe, unique signal here
    // specifically for recovery sessions — a normal password login
    // records "password" instead. Most recent auth method is the last
    // entry in the array.
    return amr[amr.length - 1]?.method === 'otp'
  } catch {
    return false
  }
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
