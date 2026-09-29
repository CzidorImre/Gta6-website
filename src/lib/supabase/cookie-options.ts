import type { CookieOptionsWithName } from '@supabase/ssr';

/**
 * Auth cookies are the only cookies this site sets (strictly necessary, no consent banner). The
 * browser never reads them (no client-side Supabase), so they are httpOnly.
 */
export function authCookieOptions(): CookieOptionsWithName {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && !(process.env.SITE_URL ?? '').startsWith('http://'),
    path: '/',
  };
}
