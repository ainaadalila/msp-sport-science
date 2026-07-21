// Shared CORS headers for all Edge Functions.
// Browsers send a preflight OPTIONS request before the real POST — every
// function must handle it, otherwise fetch() from the frontend fails silently.
//
// ALLOWED_ORIGIN must be set as a function secret in every real deployment
// (see supabase/functions/README.md). Falling back to '*' when it's unset
// would let any website read these responses in a browser — instead, fail
// closed: omit the header entirely so browsers block cross-origin reads
// until ALLOWED_ORIGIN is actually configured.
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN')

export const corsHeaders = {
  ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {}),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
