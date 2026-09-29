'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getViewer } from '@/lib/auth';
import type { EmailKind } from '@/lib/email/render';
import { notifyAttendees, notifyUser } from '@/lib/email/notify';
import { errorCodeFrom } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { reasonSchema } from '@/lib/validation';

type AdminPage = '/admin/applications' | '/admin/events' | '/admin/reports' | '/admin/users';

/**
 * Every admin action: MFA session required here AND in the database function, a reason is
 * required, the database logs it to moderation_actions, and the affected person gets an email.
 */
async function adminContext(page: AdminPage, formData: FormData) {
  const locale = (await getLocale()) as Locale;
  const viewer = await getViewer();
  if (!viewer || viewer.profile.role !== 'admin' || viewer.aal !== 'aal2') {
    return redirect({ href: '/admin/mfa', locale });
  }
  const reason = reasonSchema.safeParse(formData.get('reason') ?? '');
  const done = (query: Record<string, string>): never => redirect({ href: { pathname: page, query }, locale });
  if (!reason.success) return { ok: false as const, done, reason: '', supabase: null, locale };
  return { ok: true as const, done, reason: reason.data, supabase: await createClient(), locale };
}

function id(formData: FormData, name = 'id'): string {
  const value = String(formData.get(name) ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(value)) throw new Error(`Invalid ${name}`);
  return value;
}

export async function reviewApplicationAction(formData: FormData) {
  const ctx = await adminContext('/admin/applications', formData);
  if (!ctx.ok) return ctx.done({ error: 'REASON_REQUIRED' });
  const applicationId = id(formData);
  const approve = formData.get('decision') === 'approve';
  const { data: application } = await ctx.supabase.from('organizer_applications').select('org_name').eq('id', applicationId).maybeSingle();
  const { data: userId, error } = await ctx.supabase.rpc('admin_review_application', {
    p_application_id: applicationId,
    p_approve: approve,
    p_reason: ctx.reason,
  });
  if (error) return ctx.done({ error: errorCodeFrom(error) });
  await notifyUser(userId, approve ? 'applicationApproved' : 'applicationRejected', {
    name: application?.org_name ?? '',
    reason: ctx.reason,
    path: '/organizer',
  });
  return ctx.done({ done: approve ? 'approved' : 'rejected' });
}

const EVENT_EMAILS: Record<string, EmailKind> = {
  publish: 'eventPublished',
  reject: 'eventRejected',
  remove: 'eventRemoved',
  hide: 'eventHidden',
  restore: 'eventRestored',
};

export async function eventAction(formData: FormData) {
  const ctx = await adminContext('/admin/events', formData);
  if (!ctx.ok) return ctx.done({ error: 'REASON_REQUIRED' });
  const eventId = id(formData);
  const action = String(formData.get('action') ?? '');
  const emailKind = EVENT_EMAILS[action];
  if (!emailKind) return ctx.done({ error: 'INVALID_TRANSITION' });
  const { data: event } = await ctx.supabase.from('events').select('title').eq('id', eventId).maybeSingle();
  const { data: organizerId, error } = await ctx.supabase.rpc('admin_review_event', {
    p_event_id: eventId,
    p_action: action,
    p_reason: ctx.reason,
  });
  if (error) return ctx.done({ error: errorCodeFrom(error) });
  const title = event?.title ?? '';
  await notifyUser(organizerId, emailKind, { title, reason: ctx.reason, path: action === 'publish' ? `/events/${eventId}` : '/organizer' });
  if (action === 'remove') await notifyAttendees(eventId, 'eventRemovedAttendee', { title });
  return ctx.done({ done: action });
}

export async function legalHoldAction(formData: FormData) {
  const ctx = await adminContext('/admin/events', formData);
  if (!ctx.ok) return ctx.done({ error: 'REASON_REQUIRED' });
  const { error } = await ctx.supabase.rpc('admin_set_legal_hold', {
    p_event_id: id(formData),
    p_hold: formData.get('hold') === 'on',
    p_reason: ctx.reason,
  });
  // No email: the organizer must not learn about a legal hold (see INCIDENT.md).
  if (error) return ctx.done({ error: errorCodeFrom(error) });
  return ctx.done({ done: formData.get('hold') === 'on' ? 'hold_set' : 'hold_released' });
}

export async function venueVerifiedAction(formData: FormData) {
  const ctx = await adminContext('/admin/events', formData);
  if (!ctx.ok) return ctx.done({ error: 'REASON_REQUIRED' });
  const venueId = id(formData, 'venueId');
  const verified = formData.get('verified') === 'on';
  const { data: venue } = await ctx.supabase.from('venues').select('name').eq('id', venueId).maybeSingle();
  const { data: organizerId, error } = await ctx.supabase.rpc('admin_set_venue_verified', {
    p_venue_id: venueId,
    p_verified: verified,
    p_reason: ctx.reason,
  });
  if (error) return ctx.done({ error: errorCodeFrom(error) });
  await notifyUser(organizerId, verified ? 'venueVerified' : 'venueUnverified', { title: venue?.name ?? '', reason: ctx.reason });
  return ctx.done({ done: verified ? 'verified' : 'unverified' });
}

export async function resolveReportAction(formData: FormData) {
  const ctx = await adminContext('/admin/reports', formData);
  if (!ctx.ok) return ctx.done({ error: 'REASON_REQUIRED' });
  const outcome = String(formData.get('outcome') ?? '');
  const { data, error } = await ctx.supabase.rpc('admin_resolve_report', {
    p_report_id: id(formData),
    p_outcome: outcome,
    p_reason: ctx.reason,
  });
  if (error) return ctx.done({ error: errorCodeFrom(error) });
  const result = (data ?? {}) as { target_type?: string; event_id?: string; target_user_id?: string; restored?: boolean };
  const { data: event } = result.event_id
    ? await ctx.supabase.from('events').select('title').eq('id', result.event_id).maybeSingle()
    : { data: null };
  const title = event?.title ?? '';
  if (outcome === 'remove') {
    if (result.target_type === 'event') {
      await notifyUser(result.target_user_id, 'eventRemoved', { title, reason: ctx.reason, path: '/organizer' });
      if (result.event_id) await notifyAttendees(result.event_id, 'eventRemovedAttendee', { title });
    } else {
      await notifyUser(result.target_user_id, 'postRemoved', { title, reason: ctx.reason });
    }
  } else if (outcome === 'dismiss' && result.restored) {
    await notifyUser(result.target_user_id, result.target_type === 'event' ? 'eventRestored' : 'postRestored', { title, reason: ctx.reason });
  }
  return ctx.done({ done: outcome });
}

export async function postAction(formData: FormData) {
  const ctx = await adminContext('/admin/reports', formData);
  if (!ctx.ok) return ctx.done({ error: 'REASON_REQUIRED' });
  const postId = id(formData);
  const action = String(formData.get('action') ?? '');
  const { data: post } = await ctx.supabase.from('group_posts').select('event:events ( title )').eq('id', postId).maybeSingle();
  const { data: authorId, error } = await ctx.supabase.rpc('admin_moderate_group_post', {
    p_post_id: postId,
    p_action: action,
    p_reason: ctx.reason,
  });
  if (error) return ctx.done({ error: errorCodeFrom(error) });
  const kind: EmailKind = action === 'remove' ? 'postRemoved' : action === 'hide' ? 'postHidden' : 'postRestored';
  await notifyUser(authorId, kind, { title: post?.event?.title ?? '', reason: ctx.reason });
  return ctx.done({ done: action });
}

export async function banAction(formData: FormData) {
  const ctx = await adminContext('/admin/users', formData);
  if (!ctx.ok) return ctx.done({ error: 'REASON_REQUIRED' });
  const userId = id(formData);
  const banned = formData.get('banned') === 'on';
  const { error } = await ctx.supabase.rpc('admin_set_ban', { p_user_id: userId, p_banned: banned, p_reason: ctx.reason });
  if (error) return ctx.done({ error: errorCodeFrom(error) });
  await notifyUser(userId, banned ? 'userBanned' : 'userUnbanned', { reason: ctx.reason });
  return ctx.done({ done: banned ? 'banned' : 'unbanned', q: String(formData.get('q') ?? '') });
}

// ---- MFA -------------------------------------------------------------------------------------

export interface MfaState {
  factorId?: string;
  qrCode?: string;
  secret?: string;
  error?: 'invalid' | 'failed';
}

/** Starts TOTP enrollment. Leftover unverified factors are removed first. */
export async function startEnrollmentAction(): Promise<MfaState> {
  const viewer = await getViewer();
  if (!viewer || viewer.profile.role !== 'admin') return { error: 'failed' };
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Wanted Level admin ${new Date().toISOString().slice(0, 10)}` });
  if (error || !data) return { error: 'failed' };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Verifies a TOTP code (first enrollment or a normal login) and upgrades the session to aal2. */
export async function verifyMfaAction(prev: MfaState, formData: FormData): Promise<MfaState> {
  const locale = (await getLocale()) as Locale;
  const factorId = String(formData.get('factorId') ?? '');
  const code = String(formData.get('code') ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code) || !factorId) return { ...prev, error: 'invalid' };
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { ...prev, error: 'invalid' };
  return redirect({ href: '/admin', locale });
}
