#!/usr/bin/env node
// Writes .env.local for local development from .env.example plus the keys of the running local
// Supabase stack (`pnpm supabase start` must be running). Usage: pnpm env:local [--force]
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const target = '.env.local';
if (existsSync(target) && !process.argv.includes('--force')) {
  console.log(`${target} already exists. Re-run with --force to overwrite it.`);
  process.exit(0);
}

let status;
try {
  const out = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  status = JSON.parse(out.slice(out.indexOf('{')));
} catch {
  console.error('Could not read the local Supabase status. Is it running? Try: pnpm supabase start');
  process.exit(1);
}

const values = {
  SUPABASE_URL: status.API_URL,
  SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY ?? status.ANON_KEY,
  SUPABASE_SECRET_KEY: status.SECRET_KEY ?? status.SERVICE_ROLE_KEY,
  MAILPIT_URL: status.MAILPIT_URL ?? status.INBUCKET_URL ?? 'http://127.0.0.1:54324',
  ADMIN_NOTIFICATION_EMAILS: 'admin@wantedlevel.test',
  RATE_LIMIT_SECRET: randomBytes(24).toString('base64url'),
};

const lines = readFileSync('.env.example', 'utf8')
  .split('\n')
  .map((line) => {
    const match = /^([A-Z0-9_]+)=/.exec(line);
    if (match && values[match[1]] !== undefined) return `${match[1]}=${values[match[1]]}`;
    return line;
  });
writeFileSync(target, lines.join('\n'));
console.log(`Wrote ${target} for local Supabase at ${values.SUPABASE_URL}.`);
