import 'server-only';
import { isProductionDeployment, turnstileSecretKey } from '@/lib/env';

export type TurnstileResult = { ok: true; skipped: boolean } | { ok: false; reason: 'missing' | 'invalid' | 'misconfigured' | 'unavailable' };

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verifies a Turnstile token with Cloudflare. Without TURNSTILE_SECRET_KEY the check is skipped for
 * local development and tests, but a production deployment refuses (fails closed).
 * Signup and login tokens are not checked here: they're forwarded to Supabase Auth, which verifies
 * them when its captcha protection is on (see README, "Production setup").
 */
export async function verifyTurnstile(token: string | null | undefined, remoteIp?: string): Promise<TurnstileResult> {
  const secret = turnstileSecretKey();
  if (!secret) {
    return isProductionDeployment() ? { ok: false, reason: 'misconfigured' } : { ok: true, skipped: true };
  }
  if (!token) return { ok: false, reason: 'missing' };

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp && remoteIp !== 'unknown') body.set('remoteip', remoteIp);
  try {
    const response = await fetch(VERIFY_URL, { method: 'POST', body, cache: 'no-store', signal: AbortSignal.timeout(8000) });
    const json = (await response.json()) as { success?: boolean };
    return json.success === true ? { ok: true, skipped: false } : { ok: false, reason: 'invalid' };
  } catch (error) {
    console.error('turnstile verification failed', error);
    return { ok: false, reason: 'unavailable' };
  }
}
