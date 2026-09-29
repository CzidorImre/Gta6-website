# Wanted Level v1: tasks

Ordered milestones. `[x]` = done and verified by a command or test (noted where relevant).
Items that are built but could not be verified end to end from the build environment say so in
*italics*, with the reason; the list at the bottom collects them.

## M0. Plan
- [x] SPEC.md: data model, RLS for every table, routes, flows
- [x] TASKS.md (this file)

## M1. Scaffold
- [x] Next.js 16 App Router, TypeScript strict, pnpm, Tailwind v4
- [x] ESLint flat config incl. jsx-a11y (`pnpm lint`), `pnpm typecheck`
- [x] Vitest (`pnpm test`), Playwright config (`pnpm test:e2e`)
- [x] Supabase CLI config: MFA TOTP on, email templates, unused services off
- [x] `.env.example` complete and commented; `.env.local` git-ignored
- [x] `pnpm env:local` writes `.env.local` from `supabase status`
- [x] GitHub Actions: lint, typecheck, unit, build, `supabase test db`, types check, Playwright, Lighthouse (green)

## M2. Database (schema + RLS + pgTAP together)
- [x] Enums, helpers (`is_admin`, `age_on`, `has_rsvp`), Postgres rate limits
- [x] profiles + signup trigger: under-13 rejected, DOB stripped from `auth.users` and `auth.identities` metadata (verified against real GoTrue signups)
- [x] organizers, organizer_applications + tests
- [x] venues, events, event_legal_holds + tests (users can't publish their own events)
- [x] rsvps + `rsvp_event`/`cancel_rsvp` (capacity under row lock, age on event date, rules, bans) + tests
- [x] group_posts + tests (only RSVPed users can read or post)
- [x] reports + `submit_report` (safety hides instantly) + tests
- [x] moderation_actions + all `admin_*` functions (aal2 required, reason required, logged) + tests
- [x] `purge_expired_data` + pg_cron schedule (30 days, legal hold respected) + tests
- [x] Account deletion cascade test
- [x] Privileges sweep: RLS on every table, exact grants for `anon`/`authenticated`, exact executable functions
- [x] Seed: 3 Antwerp venues, 5 events, one user per role (admin has a local TOTP secret)

`supabase test db`: 9 files, 191 assertions, passing locally and in CI.

## M3. App foundation
- [x] next-intl: `/en`, `/nl` (nl-BE), Accept-Language redirect, manual switch, no locale cookie
- [x] All times in Europe/Brussels (DST-safe conversion, unit-tested)
- [x] `proxy.ts`: nonce CSP, security headers, Supabase session refresh, locale routing (0 CSP violations in Lighthouse)
- [x] Supabase clients (server, service role behind `server-only`); browser never calls Supabase
- [x] Design system: dark theme, one accent, star logo and pins, 44px+ tap targets, AA contrast (ratios computed)
- [x] Header, footer with non-affiliation line, language switch
- [x] Vercel Web Analytics (cookieless) — *component is in place and only renders on Vercel; collection itself can only be seen on a Vercel deployment*

## M4. Accounts
- [x] Signup (display name, DOB, email, Turnstile, rate limit, under-13 rejected) — E2E
- [x] Login magic link, `/auth/confirm` two-step (token_hash), sign out — E2E
- [x] Account page: profile edit, language, my RSVPs, one-click delete with cascade — E2E for deletion
- [x] Community rules page + acceptance (timestamp + version) — E2E

## M5. Discovery
- [x] Homepage: map (Leaflet) with spots-left pins grouped per venue, list toggle, filters, countdown
- [x] List view as the accessible alternative; filters are links and work without JS — E2E (keyboard)
- [x] Event page with all fields, organizer, verified badge, add-to-calendar `.ics` (RFC 5545, unit-tested)
- [x] MapTiler tiles — *URL and CSP wired; tiles not seen rendering because api.maptiler.com is blocked in the build sandbox; without a key the map shows pins on a dark background*

## M6. RSVP and group board
- [x] RSVP / cancel via database functions, clear error messages — E2E (full, under age, rules)
- [x] Group board visible only to RSVPed users, one post each, Discord handle optional — E2E + pgTAP

## M7. Organizers
- [x] Application form (Turnstile, public-venue confirmation) — E2E
- [x] Organizer dashboard, venue + event form with draggable pin and lat/lng inputs — E2E (existing venue path)
- [x] Events start pending; edits send published events back to review; cancel notifies attendees — pgTAP
- [x] MapTiler geocoding — *implemented (server action, Antwerp bounding box, rate-limited) but not exercised against the real API: api.maptiler.com is blocked in the build sandbox. The "search unavailable, drag the pin" fallback is what ran*

## M8. Reports
- [x] Report form for events and group posts (Turnstile, rate limit)
- [x] Safety reports hide instantly; admins emailed for every report — E2E

## M9. Admin
- [x] MFA (TOTP) enroll + verify; admin routes and admin DB functions reject aal1 — E2E + pgTAP
- [x] Applications, events (publish/reject/remove/hide/restore, legal hold, venue badge), reports, users (ban), log
- [x] Every action logged with reason and emailed to the affected user — E2E (approval, publish)

## M10. Email
- [x] Mailpit transport (dev/test) and console fallback — every E2E email assertion goes through it
- [x] Bilingual templates for every notification, in the recipient's language — unit tests + E2E (Dutch email to the Dutch organizer)
- [x] Resend transport — *code path written against the Resend SDK but not run: needs a real API key and a verified domain*

## M11. Legal pages
- [x] Privacy, terms, community and safety rules, contact in EN and NL, marked draft in file headers and LEGAL_REVIEW.md

## M12. End-to-end tests (Playwright, 10 tests)
- [x] Signup incl. under-13 rejection
- [x] Organizer application → admin approval (with TOTP)
- [x] Event creation → admin publish
- [x] RSVP blocked when full (page loaded with a spot left) and when under minimum age (UI and direct RPC)
- [x] Safety report instantly hides an event
- [x] Account deletion removes the user's data
- [x] Extra: first RSVP via rules acceptance; keyboard navigation

## M13. Quality
- [x] Mobile Lighthouse ≥ 90: 97 performance / 100 accessibility / 100 best practices / 100 SEO on the map page, the Dutch list and an event page (`pnpm lighthouse`, also in CI)
- [x] Keyboard navigation (skip link, filters, map pins, list) and contrast checks

## M14. Docs
- [x] README: clone → running (walked through in a fresh clone: ~70 s with warm caches; the one-time Docker image download adds a few minutes), env vars, deploy to Vercel + Supabase (Frankfurt)
- [x] MODERATION.md, INCIDENT.md, LEGAL_REVIEW.md

## M15. Final verification
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm test:e2e`, `supabase test db` green locally
- [x] Same in GitHub Actions

## Not verified from the build environment

The sandbox blocks outbound traffic to these services, or they need accounts/keys that don't exist
yet. Check them on the first production (or staging) deployment:

- MapTiler tiles and geocoding (blocked host).
- Cloudflare Turnstile widget and `siteverify` (blocked host). Server verification is unit-tested
  with a mocked Cloudflare response; tests run with Turnstile disabled (no keys), as local dev does.
- Resend delivery and Supabase custom SMTP through Resend (needs keys, DNS).
- Hosted Supabase settings: captcha, email templates, redirect URLs, MFA (dashboard steps in README).
- On hosted Supabase: that `pg_cron` runs `purge_expired_data()` and that its step deleting
  unconfirmed `auth.users` has permission (it's wrapped so the other steps still run if not).
- Vercel deployment, `fra1` region, Web Analytics.
- Real-device check on iOS Safari and Android Chrome (tests used Chromium with a Pixel 7 profile).

## Known v1 limitations (candidates for later)

- Organizers can't edit or delete a venue in the UI (the database function supports editing; they
  can add a new venue instead).
- Reporting requires an account; people without one use hello@wantedlevel.be (see LEGAL_REVIEW.md,
  DSA question 16).
- Organizers see RSVP counts only, no attendee list (by design, for privacy).
- `<input type="time">` shows 12- or 24-hour format depending on the visitor's browser settings.
