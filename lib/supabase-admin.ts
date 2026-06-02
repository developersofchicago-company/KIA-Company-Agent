import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS.
 *
 * NEVER import this from a client component. The service role key
 * must never reach the browser. Use only in route handlers, server
 * actions, and scripts that explicitly run server-side.
 */
// Cache keyed on the actual credentials so a changed/late-loaded env
// can never hand back a client built with stale (e.g. anon) keys.
let adminClient: SupabaseClient | null = null;
let cachedKey: string | null = null;

export function createAdminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "createAdminSupabase: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }

  const credKey = `${url}:${serviceKey}`;
  if (adminClient && cachedKey === credKey) return adminClient;

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  cachedKey = credKey;
  return adminClient;
}
