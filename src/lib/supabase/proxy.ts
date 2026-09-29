import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import type { Database } from './database.types';
import { authCookieOptions } from './cookie-options';

export interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

export interface RefreshResult {
  cookies: CookieToSet[];
  headers: Record<string, string>;
}

/**
 * Refreshes an expiring Supabase session before the page renders, so Server Components always get
 * a valid token. Skipped entirely for visitors without an auth cookie. Updated cookies are written
 * onto the request (for this render) and returned so proxy.ts can set them on the response.
 */
export async function refreshSession(request: NextRequest): Promise<RefreshResult> {
  const result: RefreshResult = { cookies: [], headers: {} };
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!hasAuthCookie || !url || !key) return result;

  const supabase = createServerClient<Database>(url, key, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          result.cookies.push({ name, value, options });
        }
        Object.assign(result.headers, headers);
      },
    },
  });
  // getClaims() refreshes the session when the access token is expired or about to expire.
  await supabase.auth.getClaims();
  return result;
}
