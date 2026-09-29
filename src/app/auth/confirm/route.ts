import { type NextRequest, NextResponse } from 'next/server';
import { siteUrl } from '@/lib/env';

/**
 * Email links land here (see supabase/templates). We don't verify on GET: mail scanners open links
 * and would use up the one-time token. Instead we forward to a localized page with a button.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = params.get('next') ?? '';
  let nextPath = '/';
  try {
    nextPath = new URL(next, siteUrl()).pathname;
  } catch {
    // keep default
  }
  const prefix = nextPath.startsWith('/nl') ? '/nl' : '/en';
  const target = new URL(`${prefix}/auth/confirm`, siteUrl());
  for (const key of ['token_hash', 'type', 'next']) {
    const value = params.get(key);
    if (value) target.searchParams.set(key, value);
  }
  return NextResponse.redirect(target, { status: 303 });
}
