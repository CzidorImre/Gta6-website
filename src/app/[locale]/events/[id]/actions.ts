'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getViewer } from '@/lib/auth';
import { errorCodeFrom } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { groupPostSchema } from '@/lib/validation';

function eventIdFrom(formData: FormData): string {
  const id = String(formData.get('eventId') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid event id');
  return id;
}

async function back(eventId: string, query: Record<string, string>, hash = 'rsvp'): Promise<never> {
  const locale = (await getLocale()) as Locale;
  const search = new URLSearchParams(query).toString();
  return redirect({ href: `/events/${eventId}${search ? `?${search}` : ''}#${hash}`, locale });
}

async function requireSignedIn(eventId: string) {
  const viewer = await getViewer();
  if (!viewer) {
    const locale = (await getLocale()) as Locale;
    return redirect({ href: { pathname: '/login', query: { next: `/events/${eventId}` } }, locale });
  }
  return viewer;
}

/** RSVP. Capacity, age, rules, bans and rate limits are enforced by rsvp_event() in Postgres. */
export async function rsvpAction(formData: FormData) {
  const eventId = eventIdFrom(formData);
  await requireSignedIn(eventId);
  const supabase = await createClient();
  const { error } = await supabase.rpc('rsvp_event', { p_event_id: eventId });
  if (error) {
    const code = errorCodeFrom(error);
    if (code === 'RULES_NOT_ACCEPTED') {
      const locale = (await getLocale()) as Locale;
      return redirect({ href: { pathname: '/rules', query: { rsvp: eventId } }, locale });
    }
    return back(eventId, { error: code });
  }
  return back(eventId, { rsvp: 'going' });
}

export async function cancelRsvpAction(formData: FormData) {
  const eventId = eventIdFrom(formData);
  await requireSignedIn(eventId);
  const supabase = await createClient();
  const { error } = await supabase.rpc('cancel_rsvp', { p_event_id: eventId });
  if (error) return back(eventId, { error: errorCodeFrom(error) });
  return back(eventId, { rsvp: 'cancelled' });
}

/** Create or update your one post on the event's group board. RLS checks you RSVPed. */
export async function savePostAction(formData: FormData) {
  const eventId = eventIdFrom(formData);
  const viewer = await requireSignedIn(eventId);
  const parsed = groupPostSchema.safeParse({
    note: formData.get('note') ?? '',
    discordHandle: formData.get('discordHandle') ?? '',
  });
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? 'note');
    return back(eventId, { board: `invalid_${field}` }, 'board');
  }
  const supabase = await createClient();
  const values = { note: parsed.data.note, discord_handle: parsed.data.discordHandle || null };
  const { data: existing } = await supabase
    .from('group_posts')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', viewer.userId)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from('group_posts').update(values).eq('id', existing.id)
    : await supabase.from('group_posts').insert({ event_id: eventId, ...values });
  if (error) return back(eventId, { board: 'error' }, 'board');
  return back(eventId, { board: 'saved' }, 'board');
}

export async function deletePostAction(formData: FormData) {
  const eventId = eventIdFrom(formData);
  const viewer = await requireSignedIn(eventId);
  const supabase = await createClient();
  const { error } = await supabase.from('group_posts').delete().eq('event_id', eventId).eq('user_id', viewer.userId);
  if (error) return back(eventId, { board: 'error' }, 'board');
  return back(eventId, { board: 'deleted' }, 'board');
}
