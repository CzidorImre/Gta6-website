import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseEnv } from '@/lib/env';
import type { Database } from './database.types';
import { authCookieOptions } from './cookie-options';

/**
 * Supabase client acting as the signed-in visitor (their JWT, so RLS applies). Create one per
 * request. In Server Components cookies can't be written; proxy.ts refreshes sessions instead.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = supabaseEnv();
  return createServerClient<Database>(url, publishableKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: ignore, proxy.ts keeps the session fresh.
        }
      },
    },
  });
}

/** True when the request carries a Supabase auth cookie; lets anonymous pages skip auth calls. */
export async function hasAuthCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
}
