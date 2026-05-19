import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let cached: SupabaseClient | null = null;

/**
 * Service-role Supabase client — bypasses RLS. NEVER expose to the browser.
 * Only use inside server-only modules (server actions, route handlers).
 */
export function adminClient(): SupabaseClient {
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  if (!cached) {
    cached = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
