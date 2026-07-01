// Shared CORS headers for all Edge Functions.
// Browsers send a preflight OPTIONS request before the real POST — every
// function must handle it, otherwise fetch() from the frontend fails silently.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
