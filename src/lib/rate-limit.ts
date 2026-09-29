import 'server-only';
import { createHmac } from 'node:crypto';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimitSecret } from '@/lib/env';

/** Limits used by server actions. Database functions enforce their own (RSVP, reports, events). */
export const LIMITS = {
  signupPerIp: { max: 5, windowSeconds: 600 },
  signupPerEmail: { max: 3, windowSeconds: 3600 },
  loginPerIp: { max: 10, windowSeconds: 600 },
  loginPerEmail: { max: 5, windowSeconds: 3600 },
  reportPerIp: { max: 20, windowSeconds: 3600 },
  applicationPerIp: { max: 5, windowSeconds: 86400 },
  geocodePerUser: { max: 30, windowSeconds: 600 },
} as const;

/** One-way, keyed hash so raw IP addresses and emails never reach the database. */
export function hashIdentifier(value: string): string {
  return createHmac('sha256', rateLimitSecret()).update(value.trim().toLowerCase()).digest('base64url').slice(0, 32);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

/**
 * Counts a hit against `bucket` and returns false once the limit is exceeded. Fails closed: if the
 * database can't be reached the action is refused.
 */
export async function withinRateLimit(bucket: string, limit: { max: number; windowSeconds: number }): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc('check_rate_limit', {
    p_bucket: bucket,
    p_max: limit.max,
    p_window_seconds: limit.windowSeconds,
  });
  if (error) {
    console.error('rate limit check failed', error.message);
    return false;
  }
  return data === true;
}
