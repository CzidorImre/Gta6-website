import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailSettings, siteUrl } from '@/lib/env';
import { type EmailKind, type EmailLocale, type EmailValues, renderEmail } from './render';
import { sendEmail } from './send';

function asLocale(value: string | null | undefined): EmailLocale {
  return value === 'nl-BE' ? 'nl-BE' : 'en';
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Localized path prefix for links in emails. */
export function localePrefix(locale: EmailLocale): string {
  return locale === 'nl-BE' ? '/nl' : '/en';
}

/** Emails the admins (ADMIN_NOTIFICATION_EMAILS), in English. */
export async function notifyAdmins(kind: EmailKind, values: EmailValues): Promise<void> {
  const recipients = emailSettings().adminRecipients;
  if (recipients.length === 0) {
    console.warn(`admin notification "${kind}" not sent: ADMIN_NOTIFICATION_EMAILS is empty`);
    return;
  }
  const rendered = renderEmail(kind, 'en', values);
  await sendEmail({ ...rendered, to: recipients });
}

async function recipient(userId: string): Promise<{ email: string; locale: EmailLocale } | null> {
  const admin = createAdminClient();
  const [{ data: user }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from('profiles').select('locale').eq('id', userId).maybeSingle(),
  ]);
  const email = user?.user?.email;
  if (!email) return null;
  return { email, locale: asLocale(profile?.locale) };
}

/**
 * Emails one user in their own language. `path` (optional) is a locale-less path like
 * "/events/<id>" and becomes a button linking to that page.
 */
export async function notifyUser(
  userId: string | null | undefined,
  kind: EmailKind,
  values: EmailValues & { path?: string },
): Promise<void> {
  if (!userId) return;
  const to = await recipient(userId);
  if (!to) return;
  const { path, ...rest } = values;
  const url = path ? absoluteUrl(`${localePrefix(to.locale)}${path}`) : undefined;
  await sendEmail({ ...renderEmail(kind, to.locale, { ...rest, url }), to: to.email });
}

/** Emails everyone who RSVPed to an event (e.g. it was cancelled or removed). */
export async function notifyAttendees(eventId: string, kind: EmailKind, values: EmailValues): Promise<void> {
  const admin = createAdminClient();
  const { data: rsvps } = await admin.from('rsvps').select('user_id').eq('event_id', eventId);
  for (const { user_id } of rsvps ?? []) {
    await notifyUser(user_id, kind, values);
  }
}

export async function sendAccountDeletedEmail(email: string, locale: string | null | undefined): Promise<void> {
  await sendEmail({ ...renderEmail('accountDeleted', asLocale(locale), {}), to: email });
}
