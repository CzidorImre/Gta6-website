#!/usr/bin/env node
// Mobile Lighthouse check (Definition of Done: performance and accessibility ≥ 90 on the map page
// and an event page). Needs the app running (pnpm build && pnpm start) and Chrome/Chromium
// (set CHROME_PATH if it isn't found). Usage: pnpm lighthouse [baseUrl]
//
// Lighthouse scores vary between runs, especially on shared CI machines, so each page is measured
// RUNS times and the median counts (what Lighthouse CI does too). A run that crashes inside
// Lighthouse (e.g. NO_NAVSTART, "please run Lighthouse again") is retried, up to MAX_ATTEMPTS.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:3000';
const MIN = 90;
const RUNS = 3;
const MAX_ATTEMPTS = 5;
const pages = [
  { name: 'map', path: '/en' },
  { name: 'list-nl', path: '/nl?view=list' },
  // A seeded, published event (supabase/seed.sql).
  { name: 'event', path: '/en/events/c0000000-0000-4000-8000-000000000001' },
];

function runLighthouse(url, out) {
  rmSync(out, { force: true });
  try {
    execFileSync(
      'pnpm',
      [
        'dlx',
        'lighthouse@12',
        url,
        '--quiet',
        '--chrome-flags=--headless=new --no-sandbox',
        '--only-categories=performance,accessibility,best-practices,seo',
        '--output=json',
        `--output-path=${out}`,
      ],
      { stdio: 'inherit' },
    );
  } catch {
    return null;
  }
  const report = JSON.parse(readFileSync(out, 'utf8'));
  if (report.runtimeError) return null;
  const scores = Object.fromEntries(
    Object.entries(report.categories).map(([key, category]) => [key, category.score]),
  );
  // A category without a score (null) means that part of the run failed.
  if (Object.values(scores).some((score) => typeof score !== 'number')) return null;
  const metric = (id) => report.audits[id]?.displayValue ?? '?';
  console.log(
    `  ${url}: cpu benchmark ${Math.round(report.environment.benchmarkIndex)},`,
    `FCP ${metric('first-contentful-paint')}, LCP ${metric('largest-contentful-paint')},`,
    `TBT ${metric('total-blocking-time')}, CLS ${metric('cumulative-layout-shift')}, SI ${metric('speed-index')}`,
  );
  return Object.fromEntries(Object.entries(scores).map(([key, score]) => [key, Math.round(score * 100)]));
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

mkdirSync('lighthouse-reports', { recursive: true });
let failed = false;
for (const page of pages) {
  const runs = [];
  for (let attempt = 1; runs.length < RUNS && attempt <= MAX_ATTEMPTS; attempt++) {
    const out = `lighthouse-reports/${page.name}-${attempt}.json`;
    const scores = runLighthouse(`${base}${page.path}`, out);
    if (scores) runs.push({ out, scores });
    else console.log(`retry ${page.name}: Lighthouse run ${attempt} failed`);
  }
  if (runs.length < RUNS) {
    failed = true;
    console.log(`FAIL ${page.name} ${page.path}: only ${runs.length} of ${RUNS} Lighthouse runs completed`);
    continue;
  }
  const scores = Object.fromEntries(
    Object.keys(runs[0].scores).map((key) => [key, median(runs.map((run) => run.scores[key]))]),
  );
  // Keep the run closest to the median performance score as the page's report.
  const representative = runs.find((run) => run.scores.performance === scores.performance);
  copyFileSync(representative.out, `lighthouse-reports/${page.name}.json`);
  const ok = scores.performance >= MIN && scores.accessibility >= MIN;
  failed ||= !ok;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${page.name} ${page.path} (median of ${RUNS})`,
    scores,
    'performance per run:',
    runs.map((run) => run.scores.performance),
  );
}
process.exit(failed ? 1 : 0);
