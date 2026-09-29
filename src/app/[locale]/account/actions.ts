'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { type Locale, routing } from '@/i18n/routing';
import { getViewer } from '@/lib/auth';
import { notifyAttendees, sendAccountDeletedEmail } from '@/lib/email/notify';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { type FieldErrors, fieldErrorsFrom, profileSchema } from '@/lib/validation';

export interface ProfileFormState {
  ok?: boolean;
  error?: 'GENERIC';
  fieldErrors?: FieldErrors;
}

export async function updateProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: 'GENERIC' };
  const parsed = profileSchema.safeParse({
    displayName: formData.get('displayName') ?? '',
    socialUrl: formData.get('socialUrl') ?? '',
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: parsed.data.displayName, social_url: parsed.data.socialUrl })
    .eq('id', viewer.userId);
  if (error) return { error: 'GENERIC' };
  return { ok: true };
}

/** Saves the email language and switches the site to it. */
export async function updateLocaleAction(formData: FormData) {
  const viewer = await getViewer();
  const requested = String(formData.get('locale') ?? '');
  const locale = (routing.locales as readonly string[]).includes(requested) ? (requested as Locale) : ((await getLocale()) as Locale);
  if (viewer) {
    const supabase = await createClient();
    await supabase.from('profiles').update({ locale }).eq('id', viewer.userId);
  }
  return redirect({ href: { pathname: '/account', query: { saved: 'locale' } }, locale });
}

/**
 * One-click account deletion (after a confirmation tick). Deleting the auth user cascades to the
 * profile, RSVPs, group posts, applications, organizer record, venues and events (SPEC.md §7).
 * People going to this user's upcoming events are told first.
 */
export async function deleteAccountAction(formData: FormData) {
  const locale = (await getLocale()) as Locale;
  const viewer = await getViewer();
  if (!viewer) return redirect({ href: '/login', locale });
  if (formData.get('confirm') !== 'on') {
    return redirect({ href: { pathname: '/account', query: { delete: 'confirm' } }, locale });
  }

  const admin = createAdminClient();
  if (viewer.isOrganizer) {
    const { data: upcoming } = await admin
      .from('events')
      .select('id, title')
      .eq('organizer_id', viewer.userId)
      .eq('status', 'published')
      .gt('ends_at', new Date().toISOString());
    for (const event of upcoming ?? []) {
      await notifyAttendees(event.id, 'eventCancelledAttendee', { title: event.title });
    }
  }

  const { error } = await admin.auth.admin.deleteUser(viewer.userId);
  if (error) {
    console.error('account deletion failed', error.message);
    return redirect({ href: { pathname: '/account', query: { delete: 'error' } }, locale });
  }
  if (viewer.email) await sendAccountDeletedEmail(viewer.email, viewer.profile.locale);

  // The auth user no longer exists; clear the session cookies locally.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  return redirect({ href: { pathname: '/', query: { deleted: '1' } }, locale });
}
