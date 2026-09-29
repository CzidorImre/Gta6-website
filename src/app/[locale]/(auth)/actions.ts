'use server';

import { redirect as nextRedirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { localePrefix } from '@/i18n/page-locale';
import type { Locale } from '@/i18n/routing';
import { ageOn } from '@/lib/age';
import { MIN_SIGNUP_AGE } from '@/lib/constants';
import { siteUrl } from '@/lib/env';
import { type ErrorCode, errorCodeFrom } from '@/lib/errors';
import { LIMITS, clientIp, hashIdentifier, withinRateLimit } from '@/lib/rate-limit';
import { safeNextPath, sameOriginPath } from '@/lib/redirect';
import { createClient } from '@/lib/supabase/server';
import { brusselsToday } from '@/lib/time';
import { type FieldErrors, fieldErrorsFrom, loginSchema, signupSchema } from '@/lib/validation';

export interface AuthFormState {
  error?: ErrorCode | 'UNDER_13';
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
}

/** Where the email link should land: the (locale-less) page the user came from, in their language. */
function emailRedirect(locale: Locale, next: string): string {
  const path = safeNextPath(next, '/');
  return `${siteUrl()}${localePrefix(locale)}${path === '/' ? '' : path}`;
}

/**
 * Signup: validate, reject under-13 before anything is stored or sent, rate-limit by IP and email,
 * then ask Supabase Auth to email a confirmation link. The DOB travels as user metadata once;
 * the handle_new_user trigger re-checks the age, copies it to profiles and strips it from auth.
 */
export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const locale = (await getLocale()) as Locale;
  const values = {
    displayName: String(formData.get('displayName') ?? ''),
    dateOfBirth: String(formData.get('dateOfBirth') ?? ''),
    email: String(formData.get('email') ?? ''),
  };
  const parsed = signupSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values: { ...values, dateOfBirth: '' } };

  if (ageOn(parsed.data.dateOfBirth, brusselsToday()) < MIN_SIGNUP_AGE) {
    // Nothing is stored and nothing is sent. Don't echo the values back either.
    return { error: 'UNDER_13' };
  }

  const ip = await clientIp();
  const [ipOk, emailOk] = await Promise.all([
    withinRateLimit(`signup:ip:${hashIdentifier(ip)}`, LIMITS.signupPerIp),
    withinRateLimit(`signup:email:${hashIdentifier(parsed.data.email)}`, LIMITS.signupPerEmail),
  ]);
  if (!ipOk || !emailOk) return { error: 'RATE_LIMITED', values: { displayName: values.displayName, email: values.email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: emailRedirect(locale, String(formData.get('next') ?? '/account')),
      captchaToken: String(formData.get('cf-turnstile-response') ?? '') || undefined,
      data: { display_name: parsed.data.displayName, date_of_birth: parsed.data.dateOfBirth, locale },
    },
  });
  if (error) {
    const code = errorCodeFrom(error);
    if (code === 'UNDER_MINIMUM_AGE') return { error: 'UNDER_13' };
    if (error.message.toLowerCase().includes('captcha')) return { error: 'CAPTCHA_FAILED', values: { displayName: values.displayName, email: values.email } };
    console.error('signup failed', error.message);
    return { error: code, values: { displayName: values.displayName, email: values.email } };
  }
  return redirect({ href: { pathname: '/auth/check-email', query: { from: 'signup' } }, locale });
}

/**
 * Login: same response whether or not the email has an account (no account enumeration).
 */
export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const locale = (await getLocale()) as Locale;
  const values = { email: String(formData.get('email') ?? '') };
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const ip = await clientIp();
  const [ipOk, emailOk] = await Promise.all([
    withinRateLimit(`login:ip:${hashIdentifier(ip)}`, LIMITS.loginPerIp),
    withinRateLimit(`login:email:${hashIdentifier(parsed.data.email)}`, LIMITS.loginPerEmail),
  ]);
  if (!ipOk || !emailOk) return { error: 'RATE_LIMITED', values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: emailRedirect(locale, String(formData.get('next') ?? '/')),
      captchaToken: String(formData.get('cf-turnstile-response') ?? '') || undefined,
    },
  });
  if (error && error.message.toLowerCase().includes('captcha')) return { error: 'CAPTCHA_FAILED', values };
  if (error && !/signups not allowed|user not found/i.test(error.message)) {
    console.error('login failed', error.message);
  }
  return redirect({ href: { pathname: '/auth/check-email', query: { from: 'login' } }, locale });
}

/** Step two of the email link: exchanges the one-time token for a session (sets the cookie). */
export async function confirmAction(formData: FormData) {
  const locale = (await getLocale()) as Locale;
  const tokenHash = String(formData.get('token_hash') ?? '');
  const type = String(formData.get('type') ?? 'email');
  const next = sameOriginPath(String(formData.get('next') ?? ''), siteUrl(), `${localePrefix(locale)}/account`);
  if (!tokenHash || !['email', 'magiclink', 'signup'].includes(type)) {
    return redirect({ href: { pathname: '/login', query: { error: 'link' } }, locale });
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'email' | 'magiclink' | 'signup' });
  if (error) return redirect({ href: { pathname: '/login', query: { error: 'link' } }, locale });
  // `next` is already a locale-prefixed, same-origin path.
  return nextRedirect(next);
}

export async function signOutAction() {
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect({ href: '/', locale });
}
