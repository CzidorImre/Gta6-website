'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getViewer } from '@/lib/auth';
import { errorCodeFrom } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

/** Stores the acceptance (timestamp + rules version). With `rsvp`, also RSVPs to that event. */
export async function acceptRulesAction(formData: FormData) {
  const locale = (await getLocale()) as Locale;
  const rsvp = String(formData.get('rsvp') ?? '');
  const eventId = /^[0-9a-f-]{36}$/i.test(rsvp) ? rsvp : null;
  const viewer = await getViewer();
  if (!viewer) {
    return redirect({ href: { pathname: '/login', query: { next: eventId ? `/rules?rsvp=${eventId}` : '/rules' } }, locale });
  }
  if (formData.get('accept') !== 'on') {
    return redirect({ href: { pathname: '/rules', query: { ...(eventId ? { rsvp: eventId } : {}), error: 'unchecked' } }, locale });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('accept_community_rules');
  if (error) return redirect({ href: { pathname: '/rules', query: { error: 'failed' } }, locale });

  if (!eventId) return redirect({ href: { pathname: '/rules', query: { accepted: '1' } }, locale });
  const { error: rsvpError } = await supabase.rpc('rsvp_event', { p_event_id: eventId });
  const query = rsvpError ? `error=${errorCodeFrom(rsvpError)}` : 'rsvp=going';
  return redirect({ href: `/events/${eventId}?${query}#rsvp`, locale });
}
