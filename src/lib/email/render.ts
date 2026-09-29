import { createTranslator } from 'next-intl';
import en from '../../../messages/en.json';
import nl from '../../../messages/nl-BE.json';
import type { OutgoingEmail } from './send';

export type EmailLocale = 'en' | 'nl-BE';

export type EmailKind =
  | 'adminNewReport'
  | 'adminNewApplication'
  | 'adminEventPending'
  | 'applicationApproved'
  | 'applicationRejected'
  | 'eventPublished'
  | 'eventRejected'
  | 'eventRemoved'
  | 'eventHidden'
  | 'eventRestored'
  | 'postRemoved'
  | 'postHidden'
  | 'postRestored'
  | 'userBanned'
  | 'userUnbanned'
  | 'venueVerified'
  | 'venueUnverified'
  | 'eventCancelledAttendee'
  | 'eventRemovedAttendee'
  | 'accountDeleted';

export interface EmailValues {
  title?: string;
  reason?: string;
  url?: string;
  category?: string;
  details?: string;
  hidden?: string;
  name?: string;
}

const messages = { en, 'nl-BE': nl } as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds a notification email in the recipient's language from messages/*.json (namespace
 * `email`). Values are escaped for HTML; the plain-text part is sent alongside.
 */
export function renderEmail(kind: EmailKind, locale: EmailLocale, values: EmailValues): Omit<OutgoingEmail, 'to'> {
  const t = createTranslator({ locale, messages: messages[locale], namespace: 'email' });
  const v = Object.fromEntries(Object.entries(values).map(([k, val]) => [k, val ?? ''])) as Record<string, string>;

  const subject = t(`${kind}.subject`, v);
  const body = t(`${kind}.body`, v);
  const reasonLine = values.reason ? t('reasonLabel', { reason: values.reason }) : '';
  const cta = values.url ? t('openLink') : '';
  const footer = t('footer');

  const paragraphs = body.split('\n\n');
  const text = [...paragraphs, reasonLine, values.url ? `${cta}: ${values.url}` : '', footer]
    .filter(Boolean)
    .join('\n\n');

  const html = `<!doctype html>
<html lang="${locale}"><body style="margin:0;padding:24px;background:#000000;color:#f5f5f7;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto"><tr><td>
<p style="font-size:20px;font-weight:800;margin:0 0 20px">&#9733; Wanted Level</p>
${paragraphs.map((p) => `<p style="margin:0 0 14px">${escapeHtml(p)}</p>`).join('\n')}
${reasonLine ? `<p style="margin:0 0 14px;padding:12px 14px;background:#1c1c1e;border-radius:12px">${escapeHtml(reasonLine)}</p>` : ''}
${values.url ? `<p style="margin:20px 0"><a href="${escapeHtml(values.url)}" style="display:inline-block;background:#c6ff3d;color:#000000;padding:12px 20px;border-radius:999px;font-weight:700;text-decoration:none">${escapeHtml(cta)}</a></p>` : ''}
<p style="margin:24px 0 0;font-size:13px;color:#98989d">${escapeHtml(footer)}</p>
</td></tr></table></body></html>`;

  return { subject, text, html };
}
