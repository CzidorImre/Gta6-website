import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { buildCsp } from '@/lib/csp';
import { refreshSession } from '@/lib/supabase/proxy';

const handleLocaleRouting = createIntlMiddleware(routing);

/**
 * Runs before every page:
 * 1. refreshes the Supabase session (only when an auth cookie is present),
 * 2. sets a per-request nonce and the Content Security Policy (Next reads the nonce from the
 *    request header and applies it to its scripts),
 * 3. routes to /en or /nl.
 */
export async function proxy(request: NextRequest) {
  const session = await refreshSession(request);

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp({ nonce, isDev: process.env.NODE_ENV === 'development' });
  // next-intl forwards the request headers to the page render, so these reach Next.js.
  request.headers.set('x-nonce', nonce);
  request.headers.set('content-security-policy', csp);

  const response = handleLocaleRouting(request);
  response.headers.set('Content-Security-Policy', csp);
  for (const { name, value, options } of session.cookies) response.cookies.set(name, value, options);
  for (const [key, value] of Object.entries(session.headers)) response.headers.set(key, value);
  return response;
}

export const config = {
  // Pages only: skip API routes, the auth callback, Next internals and files with an extension.
  // Prefetches go through too: next-intl has to rewrite /nl/... to the nl-BE route for them.
  matcher: ['/((?!api|auth/confirm|_next|_vercel|.*\\..*).*)'],
};
