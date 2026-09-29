import 'server-only';
import { Resend } from 'resend';
import { emailSettings, isProductionDeployment } from '@/lib/env';

export interface OutgoingEmail {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends one email. Transport, in order: Resend (RESEND_API_KEY), local Mailpit (MAILPIT_URL, the
 * inbox `supabase start` runs at http://127.0.0.1:54324), or the server log. Never throws: a failed
 * notification must not undo the action that triggered it. Returns whether it was handed off.
 */
export async function sendEmail(email: OutgoingEmail): Promise<boolean> {
  const settings = emailSettings();
  const to = Array.isArray(email.to) ? email.to : [email.to];
  if (to.length === 0) return false;

  try {
    if (settings.resendApiKey) {
      const resend = new Resend(settings.resendApiKey);
      const { error } = await resend.emails.send({
        from: settings.from,
        to,
        replyTo: settings.replyTo,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
      if (error) throw new Error(error.message);
      return true;
    }

    if (settings.mailpitUrl && !isProductionDeployment()) {
      const from = parseAddress(settings.from);
      const response = await fetch(`${settings.mailpitUrl.replace(/\/$/, '')}/api/v1/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          From: { Email: from.email, Name: from.name },
          To: to.map((address) => ({ Email: address })),
          ReplyTo: [{ Email: settings.replyTo }],
          Subject: email.subject,
          Text: email.text,
          HTML: email.html,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`Mailpit responded ${response.status}`);
      return true;
    }

    if (isProductionDeployment()) {
      console.error('email not sent: RESEND_API_KEY is not configured', { subject: email.subject });
      return false;
    }
    console.info(`[email] to=${to.join(',')} subject="${email.subject}"\n${email.text}`);
    return true;
  } catch (error) {
    console.error('email sending failed', { subject: email.subject, error: String(error) });
    return false;
  }
}

export function parseAddress(value: string): { name: string; email: string } {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value);
  if (match) return { name: match[1] ?? '', email: match[2] ?? value };
  return { name: '', email: value.trim() };
}
