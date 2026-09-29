import 'server-only';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { createClient, hasAuthCookie } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/database.types';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

export type Profile = Tables<'profiles'>;

export interface Viewer {
  userId: string;
  email: string | null;
  /** 'aal2' once the session passed MFA. Admin access requires it. */
  aal: 'aal1' | 'aal2';
  profile: Profile;
  isOrganizer: boolean;
}

/** The signed-in visitor with their profile, or null. Memoized per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!(await hasAuthCookie())) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const { claims } = data;

  const [{ data: profile }, { data: organizer }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', claims.sub).maybeSingle(),
    supabase.from('organizers').select('user_id').eq('user_id', claims.sub).maybeSingle(),
  ]);
  if (!profile) return null;
  return {
    userId: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : null,
    aal: claims.aal === 'aal2' ? 'aal2' : 'aal1',
    profile,
    isOrganizer: Boolean(organizer),
  };
});

export async function localePath(href: string): Promise<string> {
  const locale = (await getLocale()) as Locale;
  return getPathname({ href, locale });
}

/** Redirects to login (and back here afterwards) when signed out. */
export async function requireViewer(returnTo: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    const locale = (await getLocale()) as Locale;
    const login = getPathname({ href: { pathname: '/login', query: { next: returnTo } }, locale });
    redirect(login);
  }
  return viewer;
}

/**
 * Admin pages: 404 for everyone who isn't an admin (don't advertise the panel), MFA screen for
 * admins whose session hasn't passed TOTP yet.
 */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || viewer.profile.role !== 'admin') notFound();
  if (viewer.aal !== 'aal2') redirect(await localePath('/admin/mfa'));
  return viewer;
}
