#!/usr/bin/env node
// Mobile Lighthouse check (Definition of Done: performance and accessibility ≥ 90 on the map page
// and an event page). Needs the app running (pnpm build && pnpm start) and Chrome/Chromium
// (set CHROME_PATH if it isn't found). Usage: pnpm lighthouse [baseUrl]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:3000';
const MIN = 90;
const pages = [
  { name: 'map', path: '/en' },
  { name: 'list-nl', path: '/nl?view=list' },
  // A seeded, published event (supabase/seed.sql).
  { name: 'event', path: '/en/events/c0000000-0000-4000-8000-000000000001' },
];

mkdirSync('lighthouse-reports', { recursive: true });
let failed = false;
for (const page of pages) {
  const out = `lighthouse-reports/${page.name}.json`;
  execFileSync(
    'pnpm',
    [
      'dlx',
      'lighthouse@12',
      `${base}${page.path}`,
      '--quiet',
      '--chrome-flags=--headless=new --no-sandbox',
      '--only-categories=performance,accessibility,best-practices,seo',
      '--output=json',
      `--output-path=${out}`,
    ],
    { stdio: 'inherit' },
  );
  const report = JSON.parse(readFileSync(out, 'utf8'));
  const scores = Object.fromEntries(Object.entries(report.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
  const ok = scores.performance >= MIN && scores.accessibility >= MIN;
  failed ||= !ok;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${page.name} ${page.path}`, scores);
}
process.exit(failed ? 1 : 0);
