# Wanted Level

**wantedlevel.be**: a free, non-commercial community site for Antwerp. GTA 6 launches on
19 November 2026 on PS5 and Xbox Series X|S only, and plenty of people (especially students) won't
have a console. Wanted Level shows a map of launch night meetups at **public venues** (bars, gaming
cafés, student association rooms) so people can find one, RSVP and go play together.

Not affiliated with Rockstar Games or Take-Two Interactive.

- What it does and why: [SPEC.md](SPEC.md) (data model, access rules, routes, flows)
- Progress: [TASKS.md](TASKS.md)
- Running moderation: [MODERATION.md](MODERATION.md) · incidents and police requests: [INCIDENT.md](INCIDENT.md)
- What a lawyer must check before launch: [LEGAL_REVIEW.md](LEGAL_REVIEW.md)

Stack: Next.js 16 (App Router, TypeScript strict) on Vercel · Supabase (Postgres, Auth, RLS,
pg_cron) in Frankfurt · Leaflet + MapTiler · Resend · Cloudflare Turnstile · next-intl (EN / NL) ·
Tailwind CSS · Vitest, Playwright, pgTAP.

---

## Run it locally (about 10 minutes)

You need **Node 22**, **pnpm 10** and **Docker** (Docker Desktop, OrbStack or Colima) running.
Nothing else: the Supabase CLI comes in as a dev dependency.

```bash
git clone https://github.com/CzidorImre/Gta6-website.git wanted-level
cd wanted-level
corepack enable            # provides the pnpm version pinned in package.json
pnpm install
pnpm supabase start        # first run downloads the Docker images (a few minutes)
pnpm env:local             # writes .env.local with the local Supabase URL and keys
pnpm dev                   # http://localhost:3000
```

`supabase start` applies the migrations and loads the seed: 3 fictional venues in Antwerp, 5 events
and one account per role. Local email never leaves your machine; read it in **Mailpit** at
http://127.0.0.1:54324 (login links, and every notification the app sends).

### Log in as a test user

Go to http://localhost:3000/en/login, enter one of these addresses, then open the link in Mailpit.

| Email | Role |
| --- | --- |
| `player@wantedlevel.test` | regular user (adult, rules accepted, 2 RSVPs) |
| `teen@wantedlevel.test` | 15-year-old user (blocked from 16+/18+ events) |
| `applicant@wantedlevel.test` | user with a pending organizer application |
| `organizer@wantedlevel.test` | organizer (Pixel & Pint) |
| `respawn@wantedlevel.test`, `gamekring@wantedlevel.test` | organizers |
| `banned@wantedlevel.test` | suspended user |
| `admin@wantedlevel.test` | admin, needs a TOTP code: run `pnpm admin:code` |

The admin's TOTP secret (`WANTEDLEVELLOCALADMINTOTPSEED234`) only exists in the local seed.
Supabase Studio (database browser) is at http://127.0.0.1:54323.

### Useful commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Next.js dev server |
| `pnpm lint` / `pnpm typecheck` | ESLint (incl. jsx-a11y) / TypeScript |
| `pnpm test` | unit tests (Vitest) |
| `pnpm test:db` | database tests: RLS, functions, retention (`supabase test db`, pgTAP) |
| `pnpm test:e2e` | end-to-end tests (Playwright; builds and starts the app, needs `pnpm supabase start`) |
| `pnpm lighthouse` | mobile Lighthouse check on the map and an event page (app must be running) |
| `pnpm db:reset` | re-create the local database from migrations + seed |
| `pnpm db:types` | regenerate `src/lib/supabase/database.types.ts` after a migration |
| `pnpm supabase stop` | stop the local stack |

First Playwright run on a new machine: `pnpm exec playwright install chromium`.

### Troubleshooting

- **`pnpm env:local` says Supabase isn't running**: run `pnpm supabase start` and wait for it to
  print the URLs. Check Docker is running.
- **Port in use**: another Supabase project may be running. `pnpm supabase stop --all`.
- **No login email**: look in Mailpit (http://127.0.0.1:54324), not your real inbox.
- **Map is blank, only pins**: set `MAPTILER_API_KEY` in `.env.local` (free key). Everything else
  works without it; organizers then place the venue pin by hand.

---

## Environment variables

All documented in [`.env.example`](.env.example). They're read at request time, so changing one in
Vercel only needs a redeploy.

| Variable | Required in production | Purpose |
| --- | --- | --- |
| `SITE_URL` | yes | `https://wantedlevel.be`, used in emails and calendar files |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | yes | publishable key (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | yes | secret key (`sb_secret_…`). Server only. Bypasses RLS |
| `MAPTILER_API_KEY` | yes | map tiles + address search |
| `MAPTILER_STYLE` | no | map style id, default `dataviz-dark` |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | yes | Cloudflare Turnstile. Without the secret, production refuses reports and applications |
| `RESEND_API_KEY` | yes | notification emails |
| `EMAIL_FROM`, `EMAIL_REPLY_TO` | no | default `Wanted Level <noreply@wantedlevel.be>`, `hello@wantedlevel.be` |
| `ADMIN_NOTIFICATION_EMAILS` | yes | comma-separated admin inboxes for new reports, applications and events |
| `RATE_LIMIT_SECRET` | yes | random string used to hash IPs and emails for rate limiting (`openssl rand -base64 32`) |
| `MAILPIT_URL` | local only | local inbox for notifications |

---

## Deploy

Do these once, in this order. Nothing here is automated on purpose: production changes are made by a
person.

### 1. Supabase (EU, Frankfurt)

1. Create a project at https://supabase.com/dashboard, region **Central EU (Frankfurt)**. Save the
   database password in a password manager.
2. Push the schema (never the seed):
   ```bash
   pnpm supabase login
   pnpm supabase link --project-ref <your-project-ref>
   pnpm supabase db push
   ```
   This creates all tables, RLS policies, functions and the nightly `pg_cron` purge job. Check it in
   **Integrations → Cron**: job `wanted-level-nightly-purge`, `15 2 * * *`.
3. **Authentication → URL Configuration**: Site URL `https://wantedlevel.be`; Redirect URLs
   `https://wantedlevel.be/**` (add your Vercel preview domain too if you use previews).
4. **Authentication → Sign In / Providers → Email**: enabled, "Confirm email" on. Leave all social
   providers off.
5. **Authentication → Email Templates**: paste `supabase/templates/confirmation.html` into
   *Confirm signup* and `supabase/templates/magic_link.html` into *Magic Link*. Subjects:
   `Confirm your Wanted Level account / Bevestig je Wanted Level-account` and
   `Your Wanted Level login link / Je Wanted Level-inloglink`. These link to `/auth/confirm` with a
   `token_hash`, which works even when the email opens in another browser.
6. **Authentication → SMTP Settings** (Resend, see step 3 below): host `smtp.resend.com`, port `465`,
   user `resend`, password = your Resend API key, sender `noreply@wantedlevel.be`, name `Wanted Level`.
   Then raise **Rate Limits → emails per hour** to something sensible for launch week (e.g. 300).
7. **Authentication → Attack Protection → CAPTCHA**: enable, provider Turnstile, paste
   `TURNSTILE_SECRET_KEY`. The signup and login forms send the token; Supabase checks it. **Required**:
   without it the raw Auth API isn't protected by Turnstile.
8. **Authentication → Multi-Factor**: make sure TOTP (authenticator app) is enabled.
9. **Project Settings → API Keys**: copy the publishable and secret keys into Vercel.

### 2. Cloudflare Turnstile and MapTiler

- Turnstile (https://dash.cloudflare.com → Turnstile): add a widget for `wantedlevel.be` (Managed
  mode). Site key → `TURNSTILE_SITE_KEY`, secret → `TURNSTILE_SECRET_KEY` and Supabase (step 1.7).
- MapTiler (https://cloud.maptiler.com): create an API key, restrict it to `https://wantedlevel.be`
  (and preview domains). → `MAPTILER_API_KEY`.

### 3. Resend

Add `wantedlevel.be` as a domain, add the DNS records it shows (SPF, DKIM, and a DMARC record), wait
for "Verified", then create an API key with sending access → `RESEND_API_KEY` and Supabase SMTP.

### 4. Vercel

1. Import the GitHub repo (framework: Next.js, defaults are fine). `vercel.json` pins functions to
   **fra1 (Frankfurt)**, next to the database.
2. Add every variable from the table above for **Production** (and Preview, with preview-safe
   values).
3. Deploy, then add the domain `wantedlevel.be` (and redirect `www`).
4. **Analytics → Web Analytics**: enable. It's cookieless; the site sets no cookies except the login
   session, so there's no consent banner.

### 5. First admin

1. Sign up on the live site with your own email, confirm it.
2. In Supabase **SQL Editor**:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
3. Open https://wantedlevel.be/en/admin. You'll be asked to set up an authenticator app (TOTP). Admin
   pages and admin database functions refuse sessions without it.
4. Put your inbox in `ADMIN_NOTIFICATION_EMAILS` and redeploy.

### Before you announce it

- [ ] Legal drafts reviewed (LEGAL_REVIEW.md), operator name and address filled in the privacy policy.
- [ ] A test signup, login, RSVP, report and account deletion on production.
- [ ] Emails arrive (check spam folders) and are sent from `wantedlevel.be`.
- [ ] Moderators have MFA and have read MODERATION.md and INCIDENT.md; launch week rota agreed.
- [ ] `pnpm lighthouse https://wantedlevel.be` passes.

---

## How it's built (short version)

- **The database is the security boundary.** Every table has RLS; writes that matter go through
  `security definer` functions (`rsvp_event` enforces capacity and minimum age under a row lock,
  `save_event` can only create `pending` events, `admin_*` functions require an MFA session and a
  reason, and log to `moderation_actions`). The browser never talks to Supabase directly.
- **Turnstile-gated writes** (reports, organizer applications) use the service role only after the
  server checked the session, Turnstile and an IP rate limit; the functions aren't callable by users.
- **Rate limits** live in Postgres (`check_rate_limit`, fixed windows, IPs HMAC-hashed).
- **Security headers**: nonce-based strict CSP from `src/proxy.ts`, HSTS, `frame-ancestors 'none'`,
  no inline scripts.
- **Privacy**: the date of birth is stripped from Supabase Auth metadata by trigger and lives only in
  `profiles`; RSVPs and group posts are purged 30 days after an event; account deletion cascades.
- **i18n**: `/en` and `/nl` (nl-BE), chosen from the browser on first visit, switchable anywhere.
  Every string is in `messages/*.json`; a unit test keeps both languages in sync.

```
src/
  proxy.ts                 CSP nonce, session refresh, locale routing
  app/[locale]/            pages (home, events, account, organizer, admin, legal)
  app/api/…/calendar       .ics download
  app/auth/confirm         email link landing
  components/              UI (map, cards, forms)
  content/legal/           privacy, terms, rules (EN + NL drafts)
  lib/                     auth, validation, rate limits, email, time, CSP
supabase/
  migrations/              schema + RLS + functions (one step per table group)
  tests/                   pgTAP (RLS, capacity/age, retention, deletion, privileges)
  seed.sql                 local data only
e2e/                       Playwright
tests/unit/                Vitest
```
