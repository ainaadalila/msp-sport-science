# Edge Functions

## Why these exist

Until 1 Jul 2026, user creation/deletion (`src/lib/adminClient.ts`) used a
Supabase client built with `VITE_SUPABASE_SERVICE_ROLE_KEY` directly in the
browser. Vite inlines any `VITE_`-prefixed env var into the client-side JS
bundle at build time, so the service role key — full admin access to the
database (bypasses RLS) and the Auth admin API — was shipped to every
visitor. It was confirmed present in `dist/assets/index-*.js` on the live
UAT deployment.

`create-user` and `delete-user` move that logic server-side. The service
role key now only exists inside these functions, which Supabase runs in a
sandboxed Deno runtime — it never reaches the browser.

## Required action: rotate the old key

Fixing the code does **not** invalidate the key that was already exposed on
the public UAT URL. Before (or immediately after) deploying this:

1. Supabase dashboard → Settings → API → click **Generate new service_role
   key**. This immediately invalidates the old, already-leaked key.
2. Remove `VITE_SUPABASE_SERVICE_ROLE_KEY` from the Vercel project's
   environment variables (Project → Settings → Environment Variables) and
   redeploy, so it's no longer in the next build's bundle either.
3. Remove it from any local `.env.local` files across the team (already
   done in this repo — see `.env.example`).

## How authorization works now

RLS on `profiles` only requires `auth.role() = 'authenticated'` (see the
Skema Pangkalan Data doc, section 5) — it does not check role. That means
Postgres itself will not stop a non-admin from calling these functions.
The role check inside each function (querying `profiles.role` with the
service-role client and requiring `superadmin`) is what actually enforces
this, mirroring the existing UI gating in `UserManagementPage.tsx`. Do not
remove that check when editing these functions.

## Deploying

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) logged in
and linked to the project:

```bash
supabase login
supabase link --project-ref <your-project-ref>

supabase functions deploy create-user
supabase functions deploy delete-user
```

No manual secrets to set — Supabase automatically injects `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into every Edge
Function at runtime, both locally (`supabase start`) and when deployed.

## Local testing

```bash
supabase start
supabase functions serve create-user --env-file .env.local
```

Then point `VITE_SUPABASE_URL` at the local stack (`http://localhost:54321`
by default) to exercise the full flow from the running frontend.

## Self-hosted Supabase (client's AlmaLinux server)

Same deploy flow applies to a self-hosted stack — `supabase functions
deploy` works against any Supabase instance (cloud or self-hosted) once
`supabase link` (or the equivalent self-hosted config) points at it. No
code changes needed between environments.
