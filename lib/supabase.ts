import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser-side Supabase client that reads/writes the auth cookies the
 * server can also see. Use this in client components.
 */
let browserClient: SupabaseClient | null = null;

export function createBrowserSupabase(): SupabaseClient {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

/**
 * Anonymous client for non-authenticated reads (no cookie handling).
 * Kept for backwards compatibility with lib/db.ts.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
