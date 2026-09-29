'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getViewer } from '@/lib/auth';
import { notifyAdmins } from '@/lib/email/notify';
import { type ErrorCode, errorCodeFrom } from '@/lib/errors';
import { LIMITS, clientIp, hashIdentifier, withinRateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyTurnstile } from '@/lib/turnstile';
import { type FieldErrors, fieldErrorsFrom, reportSchema } from '@/lib/validation';

export interface ReportFormState {
  error?: ErrorCode;
  fieldErrors?: FieldErrors;
}

/**
 * Files a report. The session, Turnstile and an IP rate limit are checked here; submit_report()
 * (service role) re-checks the reporter, applies per-user limits and, for `safety`, hides the
 * event or post in the same transaction. Every report emails the admins.
 */
export async function reportAction(_prev: ReportFormState, formData: FormData): Promise<ReportFormState> {
  const locale = (await getLocale()) as Locale;
  const viewer = await getViewer();
  if (!viewer) return { error: 'NOT_AUTHENTICATED' };

  const parsed = reportSchema.safeParse({
    targetType: formData.get('targetType'),
    targetId: formData.get('targetId'),
    category: formData.get('category'),
    details: formData.get('details') ?? '',
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const ip = await clientIp();
  const captcha = await verifyTurnstile(String(formData.get('cf-turnstile-response') ?? ''), ip);
  if (!captcha.ok) return { error: 'CAPTCHA_FAILED' };
  if (!(await withinRateLimit(`report:ip:${hashIdentifier(ip)}`, LIMITS.reportPerIp))) return { error: 'RATE_LIMITED' };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('submit_report', {
    p_reporter_id: viewer.userId,
    p_target_type: parsed.data.targetType,
    p_target_id: parsed.data.targetId,
    p_category: parsed.data.category,
    p_details: parsed.data.details,
  });
  if (error) return { error: errorCodeFrom(error) };

  const result = (data ?? {}) as { duplicate?: boolean; hidden?: boolean; event_id?: string };
  if (!result.duplicate && result.event_id) {
    const { data: event } = await admin.from('events').select('title').eq('id', result.event_id).maybeSingle();
    await notifyAdmins('adminNewReport', {
      category: parsed.data.category,
      title: `${event?.title ?? result.event_id}${parsed.data.targetType === 'group_post' ? ' (group board post)' : ''}`,
      hidden: result.hidden ? 'It was hidden automatically until someone reviews it.' : '',
      details: parsed.data.details || '(no details)',
      url: `${process.env.SITE_URL ?? ''}/en/admin/reports`,
    });
  }
  return redirect({
    href: { pathname: '/report/thanks', query: { hidden: result.hidden ? '1' : '0', event: result.event_id ?? '' } },
    locale,
  });
}
