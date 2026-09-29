import { existsSync } from 'node:fs';
import { adminDb, MAILPIT_URL } from './helpers';

/**
 * Checks the local stack is up and clears state that would make repeated runs flaky: rate-limit
 * counters (every run signs up from the same IP) and old test emails. Local database only.
 */
export default async function globalSetup() {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const url = process.env.SUPABASE_URL ?? '';
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
    throw new Error(`E2E tests only run against a local Supabase (got ${url || 'nothing'}). Run pnpm supabase start && pnpm env:local.`);
  }
  const db = adminDb();
  const { error } = await db.from('rate_limits').delete().neq('bucket', '');
  if (error) throw new Error(`Local Supabase not reachable or not migrated: ${error.message}`);
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' }).catch(() => undefined);
}
