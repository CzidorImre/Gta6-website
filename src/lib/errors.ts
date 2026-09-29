/**
 * Database functions raise short codes (e.g. EVENT_FULL). These map to message keys under
 * `errors` in messages/*.json. Anything unknown becomes a generic error.
 */
export const KNOWN_ERROR_CODES = [
  'NOT_AUTHENTICATED',
  'PROFILE_MISSING',
  'BANNED',
  'RATE_LIMITED',
  'RULES_NOT_ACCEPTED',
  'EVENT_NOT_AVAILABLE',
  'EVENT_STARTED',
  'EVENT_FULL',
  'UNDER_EVENT_MIN_AGE',
  'UNDER_MINIMUM_AGE',
  'DATE_OF_BIRTH_INVALID',
  'DATE_OF_BIRTH_REQUIRED',
  'DISPLAY_NAME_INVALID',
  'NOT_ORGANIZER',
  'VENUE_NOT_FOUND',
  'VENUE_OUTSIDE_AREA',
  'EVENT_NOT_FOUND',
  'EVENT_NOT_EDITABLE',
  'EVENT_IN_PAST',
  'EVENT_NOT_CANCELLABLE',
  'CAPACITY_BELOW_RSVPS',
  'ALREADY_ORGANIZER',
  'APPLICATION_PENDING',
  'TARGET_NOT_FOUND',
  'ADMIN_MFA_REQUIRED',
  'REASON_REQUIRED',
  'INVALID_TRANSITION',
  'APPLICATION_ALREADY_REVIEWED',
  'REPORT_ALREADY_RESOLVED',
  'CANNOT_BAN_ADMIN',
  'CAPTCHA_FAILED',
  'VALIDATION',
] as const;

export type ErrorCode = (typeof KNOWN_ERROR_CODES)[number] | 'GENERIC';

export function errorCodeFrom(error: { message?: string } | null | undefined): ErrorCode {
  const message = error?.message ?? '';
  const code = (KNOWN_ERROR_CODES as readonly string[]).find((c) => message === c || message.startsWith(`${c}:`));
  if (code) return code as ErrorCode;
  // Supabase Auth wraps trigger errors from handle_new_user.
  const wrapped = (KNOWN_ERROR_CODES as readonly string[]).find((c) => message.includes(c));
  return (wrapped as ErrorCode | undefined) ?? 'GENERIC';
}
