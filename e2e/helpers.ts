import { randomUUID } from 'node:crypto';
import { type BrowserContext, type Page, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase/database.types';
import { totp } from './totp';

export const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';
export const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3000';

/** Seeded accounts (supabase/seed.sql). */
export const SEED = {
  admin: 'admin@wantedlevel.test',
  adminTotpSecret: 'WANTEDLEVELLOCALADMINTOTPSEED234',
  organizer: 'organizer@wantedlevel.test',
  organizerId: 'a0000000-0000-4000-8000-000000000002',
  organizerVenueId: 'b0000000-0000-4000-8000-000000000001',
};

/** Service-role client for fixtures and for checking the database after UI actions. */
export function adminDb() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('SUPABASE_SECRET_KEY missing: run `pnpm env:local` first');
  return createClient<Database>(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function uniqueEmail(prefix: string): string {
  return `e2e-${prefix}-${randomUUID().slice(0, 8)}@wantedlevel.test`;
}

export function isoDateYearsAgo(years: number, extraDays = 0): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setDate(d.getDate() + extraDays);
  return d.toISOString().slice(0, 10);
}

export function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Creates a confirmed user (profile via the signup trigger) and returns its id. */
export async function createUser(opts: { email: string; name: string; dateOfBirth: string; rulesAccepted?: boolean }): Promise<string> {
  const db = adminDb();
  const { data, error } = await db.auth.admin.createUser({
    email: opts.email,
    email_confirm: true,
    user_metadata: { display_name: opts.name, date_of_birth: opts.dateOfBirth, locale: 'en' },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  if (opts.rulesAccepted) {
    const { error: e } = await db.from('profiles').update({ rules_accepted_at: new Date().toISOString(), rules_version: '2026-10' }).eq('id', data.user.id);
    if (e) throw new Error(e.message);
  }
  return data.user.id;
}

/** Published event at the seeded organizer's venue, starting in `days` days. */
export async function createPublishedEvent(opts: { title: string; capacity?: number; minAge?: 13 | 16 | 18; days?: number }): Promise<string> {
  const db = adminDb();
  const start = new Date(Date.now() + (opts.days ?? 10) * 86_400_000);
  const { data, error } = await db
    .from('events')
    .insert({
      organizer_id: SEED.organizerId,
      venue_id: SEED.organizerVenueId,
      title: opts.title,
      description: 'Created by an end-to-end test.',
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + 4 * 3_600_000).toISOString(),
      platforms: ['ps5'],
      console_count: 2,
      capacity: opts.capacity ?? 20,
      min_age: opts.minAge ?? 13,
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`createPublishedEvent failed: ${error?.message}`);
  return data.id;
}

interface MailpitMessage {
  ID: string;
  Subject: string;
  To: Array<{ Address: string }>;
  Created: string;
}

/** Newest email to `to` (optionally matching the subject), polling Mailpit for up to 15 s. */
export async function waitForEmail(to: string, subject?: RegExp): Promise<{ subject: string; html: string; text: string }> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=20`);
    if (res.ok) {
      const { messages } = (await res.json()) as { messages: MailpitMessage[] };
      const match = messages.find((m) => !subject || subject.test(m.Subject));
      if (match) {
        const full = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${match.ID}`)).json()) as { HTML: string; Text: string; Subject: string };
        return { subject: full.Subject, html: full.HTML, text: full.Text };
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email to ${to}${subject ? ` matching ${subject}` : ''}`);
}

export async function countEmails(to: string): Promise<number> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=50`);
  const { messages } = (await res.json()) as { messages: MailpitMessage[] };
  return messages.length;
}

export function confirmLinkFrom(html: string): string {
  const match = /href="([^"]*\/auth\/confirm\?[^"]+)"/.exec(html);
  if (!match?.[1]) throw new Error('No confirm link in email');
  return match[1].replace(/&amp;/g, '&');
}

/** Clicks through the two-step email link: /auth/confirm → localized confirm page → Continue. */
export async function followConfirmLink(page: Page, link: string): Promise<void> {
  await page.goto(link);
  await page.getByRole('button', { name: /continue|verder/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/auth/confirm'));
}

/** Logs in without the login form (admin-generated magic link), for tests about other flows. */
export async function loginAs(page: Page, email: string, next = '/en'): Promise<void> {
  const { data, error } = await adminDb().auth.admin.generateLink({ type: 'magiclink', email });
  if (error || !data.properties?.hashed_token) throw new Error(`generateLink failed: ${error?.message}`);
  const link = `${SITE_URL}/auth/confirm?token_hash=${data.properties.hashed_token}&type=email&next=${encodeURIComponent(`${SITE_URL}${next}`)}`;
  await followConfirmLink(page, link);
}

/** Admin login including the TOTP step (seeded factor), ending on the admin overview. */
export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, SEED.admin, '/en/admin');
  await expect(page).toHaveURL(/\/en\/admin\/mfa/);
  await page.getByLabel(/6-digit code/i).fill(totp(SEED.adminTotpSecret));
  await page.getByRole('button', { name: /verify/i }).click();
  await expect(page).toHaveURL(/\/en\/admin$/);
}

/** The signed-in user's access token, read from the (httpOnly) Supabase auth cookie. */
export async function accessTokenFrom(context: BrowserContext): Promise<string> {
  const cookies = (await context.cookies()).filter((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
  const value = cookies
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
    .map((c) => c.value)
    .join('');
  const json = value.startsWith('base64-') ? Buffer.from(value.slice(7), 'base64url').toString('utf8') : decodeURIComponent(value);
  const session = JSON.parse(json) as { access_token: string };
  return session.access_token;
}
