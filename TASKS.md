# Wanted Level v1: tasks

Ordered milestones. Each ends with the relevant checks passing and a commit. `[x]` = done and
verified by a command or test; `[ ] BLOCKED:` = can't be done in this repo, with the reason.

## M0. Plan
- [ ] SPEC.md: data model, RLS for every table, routes, flows
- [ ] TASKS.md (this file)

## M1. Scaffold
- [ ] Next.js 16 App Router, TypeScript strict, pnpm, Tailwind v4
- [ ] ESLint flat config (`pnpm lint`), `pnpm typecheck`
- [ ] Vitest (`pnpm test`), Playwright config (`pnpm test:e2e`)
- [ ] Supabase CLI config: MFA TOTP on, email templates, unused services off
- [ ] `.env.example` complete and commented; `.env.local` git-ignored
- [ ] `scripts/setup-local-env.mjs` writes `.env.local` from `supabase status`
- [ ] GitHub Actions: lint, typecheck, unit, build, `supabase test db`, Playwright

## M2. Database (schema + RLS + pgTAP together)
- [ ] Enums, helpers (`is_admin`, `age_on`, `has_rsvp`, `event_is_visible`), rate limits
- [ ] profiles + signup trigger (under-13 rejected, DOB stripped from auth metadata) + tests
- [ ] organizers, organizer_applications + tests
- [ ] venues, events, event_legal_holds + tests (users can't publish their own events)
- [ ] rsvps + `rsvp_event`/`cancel_rsvp` (capacity, age, rules, bans) + tests
- [ ] group_posts + tests (only RSVPed users can read)
- [ ] reports + `submit_report` (safety hides instantly) + tests
- [ ] moderation_actions + all `admin_*` functions (aal2 required, reason required) + tests
- [ ] `purge_expired_data` + pg_cron schedule (30 days, legal hold respected) + tests
- [ ] Account deletion cascade test
- [ ] Seed: 3 Antwerp venues, 5 events, one user per role (admin has TOTP)

## M3. App foundation
- [ ] next-intl: `/en`, `/nl` (nl-BE), Accept-Language redirect, manual switch, no locale cookie
- [ ] All times in Europe/Brussels
- [ ] `proxy.ts`: nonce CSP, security headers, Supabase session refresh, locale routing
- [ ] Supabase clients (server, service role with `server-only`)
- [ ] Design system: dark theme, one accent, star logo, big tap targets, AA contrast
- [ ] Header, footer with non-affiliation line, language switch
- [ ] Vercel Web Analytics (cookieless)

## M4. Accounts
- [ ] Signup (display name, DOB, email, Turnstile, rate limit, under-13 rejected)
- [ ] Login magic link, `/auth/confirm` (token_hash), sign out
- [ ] Account page: profile edit, my RSVPs, one-click delete with cascade
- [ ] Community rules page + acceptance (timestamp + version)

## M5. Discovery
- [ ] Homepage: map (Leaflet + MapTiler) with spots-left pins, list toggle, filters, countdown
- [ ] List view as the accessible alternative, works without JS
- [ ] Event page with all fields, organizer, verified badge, add-to-calendar `.ics`

## M6. RSVP and group board
- [ ] RSVP / cancel via database functions, clear error messages
- [ ] Group board visible only to RSVPed users, one post each, Discord handle optional

## M7. Organizers
- [ ] Application form (Turnstile, public-venue confirmation)
- [ ] Organizer dashboard, venue + event form with MapTiler geocoding and draggable pin
- [ ] Events start pending; edits send published events back to review; cancel

## M8. Reports
- [ ] Report form for events and group posts (Turnstile, rate limit)
- [ ] Safety reports hide instantly; admins emailed for every report

## M9. Admin
- [ ] MFA (TOTP) enroll + verify; admin routes reject aal1
- [ ] Applications, events (publish/reject/remove/hide/restore, legal hold, venue badge), reports, users (ban), log
- [ ] Every action logged with reason and emailed to the affected user

## M10. Email
- [ ] Resend transport (prod), Mailpit transport (dev/test), console fallback
- [ ] Bilingual templates for every notification

## M11. Legal pages
- [ ] Privacy, terms, community and safety rules, contact in EN and NL, marked draft in file headers

## M12. End-to-end tests (Playwright)
- [ ] Signup incl. under-13 rejection
- [ ] Organizer application → admin approval (with TOTP)
- [ ] Event creation → admin publish
- [ ] RSVP blocked when full and when under minimum age
- [ ] Safety report instantly hides an event
- [ ] Account deletion removes the user's data

## M13. Quality
- [ ] Mobile Lighthouse ≥ 90 performance and accessibility on map page and event page
- [ ] Keyboard navigation and contrast pass

## M14. Docs
- [ ] README: clone → running in < 15 minutes, env vars, deploy to Vercel + Supabase (Frankfurt)
- [ ] MODERATION.md, INCIDENT.md, LEGAL_REVIEW.md

## M15. Final verification
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm test:e2e`, `supabase test db` all green locally
- [ ] Same in GitHub Actions
