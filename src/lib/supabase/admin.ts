import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseEnv, supabaseSecretKey } from '@/lib/env';
import type { Database } from './database.types';

/**
 * Service-role client: bypasses RLS. Only use it after the calling code has checked the session,
 * Turnstile and rate limits, and only for the calls listed in SPEC.md §4 (submit_report,
 * submit_organizer_application, check_rate_limit, auth admin, email lookups).
 */
export function createAdminClient() {
  const { url } = supabaseEnv();
  return createClient<Database>(url, supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
