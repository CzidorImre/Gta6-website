'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getViewer } from '@/lib/auth';
import { absoluteUrl, notifyAdmins, notifyAttendees } from '@/lib/email/notify';
import { type ErrorCode, errorCodeFrom } from '@/lib/errors';
import { type GeocodeResult, geocodeAddress } from '@/lib/geocode';
import { LIMITS, clientIp, hashIdentifier, withinRateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { brusselsLocalToUtc } from '@/lib/time';
import { verifyTurnstile } from '@/lib/turnstile';
import { applicationSchema, eventSchema, type FieldErrors, fieldErrorsFrom, venueSchema } from '@/lib/validation';

export interface OrganizerFormState {
  error?: ErrorCode;
  fieldErrors?: FieldErrors;
}

/** Organizer application: session + Turnstile + IP limit here; the DB function does the rest. */
export async function applyAction(_prev: OrganizerFormState, formData: FormData): Promise<OrganizerFormState> {
  const locale = (await getLocale()) as Locale;
  const viewer = await getViewer();
  if (!viewer) return { error: 'NOT_AUTHENTICATED' };

  const parsed = applicationSchema.safeParse({
    orgName: formData.get('orgName') ?? '',
    socialUrl: formData.get('socialUrl') ?? '',
    venueName: formData.get('venueName') ?? '',
    venueAddress: formData.get('venueAddress') ?? '',
    venueKind: formData.get('venueKind') ?? '',
    message: formData.get('message') ?? '',
    publicVenue: formData.get('publicVenue') ?? '',
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const ip = await clientIp();
  const captcha = await verifyTurnstile(String(formData.get('cf-turnstile-response') ?? ''), ip);
  if (!captcha.ok) return { error: 'CAPTCHA_FAILED' };
  if (!(await withinRateLimit(`application:ip:${hashIdentifier(ip)}`, LIMITS.applicationPerIp))) return { error: 'RATE_LIMITED' };

  const { error } = await createAdminClient().rpc('submit_organizer_application', {
    p_user_id: viewer.userId,
    p_org_name: parsed.data.orgName,
    p_social_url: parsed.data.socialUrl,
    p_venue_name: parsed.data.venueName,
    p_venue_address: parsed.data.venueAddress,
    p_venue_kind: parsed.data.venueKind,
    p_message: parsed.data.message,
  });
  if (error) return { error: errorCodeFrom(error) };

  await notifyAdmins('adminNewApplication', {
    name: parsed.data.orgName,
    title: `${parsed.data.venueName}, ${parsed.data.venueAddress}`,
    url: absoluteUrl('/en/admin/applications'),
  });
  return redirect({ href: { pathname: '/organizer', query: { applied: '1' } }, locale });
}

/** Creates or edits an event (and optionally a new venue). Events are always saved as pending. */
export async function saveEventAction(_prev: OrganizerFormState, formData: FormData): Promise<OrganizerFormState> {
  const locale = (await getLocale()) as Locale;
  const viewer = await getViewer();
  if (!viewer?.isOrganizer) return { error: 'NOT_ORGANIZER' };

  const parsed = eventSchema.safeParse({
    title: formData.get('title') ?? '',
    description: formData.get('description') ?? '',
    date: formData.get('date') ?? '',
    startTime: formData.get('startTime') ?? '',
    endTime: formData.get('endTime') ?? '',
    platforms: formData.getAll('platforms'),
    consoleCount: formData.get('consoleCount') ?? '',
    capacity: formData.get('capacity') ?? '',
    minAge: formData.get('minAge') ?? '',
    publicVenue: formData.get('publicVenue') ?? '',
  });
  const venueChoice = String(formData.get('venueId') ?? '');
  const newVenue =
    venueChoice === 'new'
      ? venueSchema.safeParse({
          venueName: formData.get('venueName') ?? '',
          venueAddress: formData.get('venueAddress') ?? '',
          venueKind: formData.get('venueKind') ?? '',
          lat: formData.get('lat') ?? '',
          lng: formData.get('lng') ?? '',
        })
      : null;
  const fieldErrors: FieldErrors = {
    ...(parsed.success ? {} : fieldErrorsFrom(parsed.error)),
    ...(newVenue && !newVenue.success ? fieldErrorsFrom(newVenue.error) : {}),
    ...(venueChoice !== 'new' && !/^[0-9a-f-]{36}$/i.test(venueChoice) ? { venueId: 'venueId' } : {}),
  };
  if (!parsed.success || (newVenue && !newVenue.success) || Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { date, startTime, endTime } = parsed.data;
  const startsAt = brusselsLocalToUtc(date, startTime);
  let endsAt = brusselsLocalToUtc(date, endTime);
  if (endsAt <= startsAt) {
    const nextDay = new Date(`${date}T12:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    endsAt = brusselsLocalToUtc(nextDay.toISOString().slice(0, 10), endTime);
  }

  const supabase = await createClient();
  let venueId = venueChoice;
  if (newVenue?.success) {
    const { data, error } = await supabase.rpc('save_venue', {
      p_name: newVenue.data.venueName,
      p_address: newVenue.data.venueAddress,
      p_kind: newVenue.data.venueKind,
      p_lat: newVenue.data.lat,
      p_lng: newVenue.data.lng,
    });
    if (error || !data) return { error: errorCodeFrom(error) };
    venueId = data;
  }

  const eventId = String(formData.get('eventId') ?? '');
  const { data: savedId, error } = await supabase.rpc('save_event', {
    p_venue_id: venueId,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: endsAt.toISOString(),
    p_platforms: parsed.data.platforms,
    p_console_count: parsed.data.consoleCount,
    p_capacity: parsed.data.capacity,
    p_min_age: parsed.data.minAge,
    ...(/^[0-9a-f-]{36}$/i.test(eventId) ? { p_event_id: eventId } : {}),
  });
  if (error || !savedId) return { error: errorCodeFrom(error) };

  const { data: organizer } = await supabase.from('organizers').select('org_name').eq('user_id', viewer.userId).maybeSingle();
  await notifyAdmins('adminEventPending', {
    title: parsed.data.title,
    name: organizer?.org_name ?? viewer.profile.display_name,
    url: absoluteUrl('/en/admin/events'),
  });
  return redirect({ href: { pathname: '/organizer', query: { saved: '1' } }, locale });
}

export async function cancelEventAction(formData: FormData) {
  const locale = (await getLocale()) as Locale;
  const eventId = String(formData.get('eventId') ?? '');
  const viewer = await getViewer();
  if (!viewer) return redirect({ href: '/login', locale });
  const supabase = await createClient();
  const { data: event } = await supabase.from('events').select('title, status').eq('id', eventId).maybeSingle();
  const { error } = await supabase.rpc('cancel_event', { p_event_id: eventId });
  if (error) return redirect({ href: { pathname: '/organizer', query: { error: errorCodeFrom(error) } }, locale });
  // Everyone who RSVPed hears it's off (also for an event that was back in review after an edit).
  if (event) await notifyAttendees(eventId, 'eventCancelledAttendee', { title: event.title });
  return redirect({ href: { pathname: '/organizer', query: { cancelled: '1' } }, locale });
}

/** Address → coordinates (MapTiler), for the venue pin. null when geocoding isn't available. */
export async function geocodeAction(address: string): Promise<GeocodeResult[] | null> {
  const viewer = await getViewer();
  if (!viewer?.isOrganizer) return null;
  const query = address.trim().slice(0, 200);
  if (query.length < 3) return [];
  if (!(await withinRateLimit(`geocode:user:${viewer.userId}`, LIMITS.geocodePerUser))) return null;
  return geocodeAddress(query);
}
